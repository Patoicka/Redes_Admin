"""Ciclo de monitoreo periódico: una sesión SSH por dispositivo, que se
mantiene abierta entre ciclos y la comparten los tres detectores Y la
corrección (detectar -> clasificar -> corregir, todo en la misma sesión), con
notificación solo en los bordes (aparece / se resuelve) en vez de en cada
ciclo mientras la falla sigue activa.

Los dispositivos se revisan en paralelo (un hilo por equipo): el ciclo dura
lo que tarda el más lento, no la suma de todos.

La confirmación de que una corrección realmente funcionó no se hace en el
mismo ciclo: se obtiene cuando, en un ciclo posterior, la falla ya no aparece
(ver manejar_falla_resuelta). Así "corregido" refleja la realidad observada
en el equipo, no solo que el comando se envió sin error.
"""

import logging
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime

import clasificacion
import conexion
import equipos
import notificacion
import registro
from conexion import ComandoNoPermitidoError
from formato import formatear_duracion
from deteccion import (
    Falla,
    detectar_interfaces_caidas,
    detectar_ip_fuera_de_vlan,
    detectar_puertos_saturados,
    ips_propias,
)
from resultado import ResultadoClasificacion

INTERVALO_SEGUNDOS = 10
# Tras aplicar una corrección, el siguiente ciclo arranca casi enseguida para
# confirmarla (o ver que no funcionó) sin esperar el intervalo completo.
INTERVALO_TRAS_CORRECCION_SEGUNDOS = 2


@dataclass
class EventoFalla:
    hora: str
    dispositivo: str
    tipo: str
    interfaz: str | None
    estado: str  # "NUEVA" | "RESUELTA"
    nivel: str | None
    comandos_aplicados: list[str]
    corregido: bool | None  # NUEVA: None=pendiente de confirmar, False=no se pudo aplicar. RESUELTA: True.
    notificado: bool
    duracion_segundos: float | None = None  # solo en RESUELTA
    id_falla: str | None = None  # liga una NUEVA con su RESUELTA en el tablero
    origen: str | None = None  # host que causa la falla, si el detector lo sabe (solo NUEVA)


# Registro en memoria (para las pruebas) + en archivo (eventos.jsonl, para el
# tablero web — ver registro.py y api/).
_registro_eventos: list[EventoFalla] = []
# Recuerda desde cuándo está activa una falla, con qué nivel/comandos se
# clasificó y su id_falla, para poder calcular la duración y repetir ese
# contexto en el evento RESUELTA correspondiente.
_contexto_fallas_activas: dict[tuple, tuple[datetime, ResultadoClasificacion, str]] = {}
# Los hilos de cada equipo escriben eventos a la vez: una línea de
# eventos.jsonl no debe mezclarse con otra.
_candado_eventos = threading.Lock()
# Lo activa cualquier hilo que aplique una corrección en el ciclo actual.
_correccion_aplicada = threading.Event()


def obtener_eventos() -> list[EventoFalla]:
    return list(_registro_eventos)


def registrar_evento(evento: EventoFalla) -> None:
    with _candado_eventos:
        _registro_eventos.append(evento)
        registro.escribir_evento(evento)
    logging.info(
        "[EVENTO] %s %s dispositivo=%s tipo=%s interfaz=%s nivel=%s comandos=%s "
        "corregido=%s notificado=%s duracion=%s",
        evento.hora, evento.estado, evento.dispositivo, evento.tipo, evento.interfaz,
        evento.nivel, evento.comandos_aplicados, evento.corregido, evento.notificado,
        evento.duracion_segundos,
    )


class EstadoMonitoreo:
    """Recuerda qué fallas siguen activas, por dispositivo, para distinguir
    "sigue igual" de "acaba de aparecer" / "se acaba de resolver".
    """

    def __init__(self):
        self._activas: dict[tuple, Falla] = {}
        self._candado = threading.Lock()

    def actualizar_dispositivo(
        self, nombre_dispositivo: str, fallas_detectadas: list[Falla]
    ) -> tuple[list[Falla], list[Falla]]:
        """Actualiza solo las claves de este dispositivo. Si no se llama para
        un dispositivo en un ciclo (p. ej. quedó inalcanzable por SSH), sus
        fallas previas quedan intactas: no se notifican como resueltas."""
        detectadas = {f.clave(): f for f in fallas_detectadas}
        with self._candado:
            activas_del_dispositivo = {
                clave: f for clave, f in self._activas.items()
                if f.dispositivo == nombre_dispositivo
            }

            nuevas = [f for clave, f in detectadas.items() if clave not in activas_del_dispositivo]
            resueltas = [
                f for clave, f in activas_del_dispositivo.items() if clave not in detectadas
            ]

            for f in resueltas:
                self._activas.pop(f.clave(), None)
            self._activas.update(detectadas)

        return nuevas, resueltas


def _origen(falla: Falla) -> str | None:
    """Host señalado por el detector: el que reportó /tool torch (aunque no se
    le proponga queue) o la IP/MAC vista fuera de su VLAN."""
    detalle = falla.detalle
    if detalle.get("origen_torch"):
        return detalle["origen_torch"]
    if detalle.get("ip"):
        return f"{detalle['ip']} ({detalle['mac']})" if detalle.get("mac") else detalle["ip"]
    return None


def _ya_aplicado(sesion, comando: str) -> bool:
    """La cuarentena es idempotente en intención pero no en RouterOS: cada
    "filter add" crea otra regla igual, y un "address-list add" repetido da
    error. Si lo que pide el comando ya está en el equipo, no se envía."""
    params = dict(tok.split("=", 1) for tok in comando.split() if "=" in tok)
    if comando.startswith("/ip firewall filter add"):
        consulta = (
            f'/ip firewall filter find where chain="{params.get("chain")}" '
            f'and action="{params.get("action")}" '
            f'and src-address-list="{params.get("src-address-list")}" and !disabled'
        )
    elif comando.startswith("/ip firewall address-list add"):
        consulta = (
            f'/ip firewall address-list find where list="{params.get("list")}" '
            f'and address="{params.get("address")}"'
        )
    else:
        return False
    salida = sesion.leer_estado(f":put [:len [{consulta}]]").split()
    return bool(salida) and salida[0].isdigit() and int(salida[0]) > 0


def manejar_falla_nueva(falla: Falla, sesion) -> None:
    try:
        ips_protegidas = frozenset(str(ip) for ip in ips_propias(sesion))
        resultado = clasificacion.clasificar(falla, ips_protegidas)
    except Exception:
        logging.exception("No se pudo clasificar la falla %s", falla.clave())
        return

    if not resultado.comandos:
        # No autocorregible con los datos disponibles (p. ej. ip_fuera_de_vlan
        # sin IP identificable): queda como notificación/propuesta únicamente.
        corregido = False
    else:
        try:
            # comandos_aplicados del evento sigue siendo la corrección completa
            # que se decidió; aquí solo se omite lo que el equipo ya tiene.
            pendientes = [c for c in resultado.comandos if not _ya_aplicado(sesion, c)]
            if pendientes:
                sesion.aplicar_correccion(pendientes)
            corregido = None  # se confirma observando el siguiente ciclo
            _correccion_aplicada.set()
        except ComandoNoPermitidoError:
            logging.exception(
                "Corrección rechazada en la última línea de defensa para %s", falla.clave()
            )
            corregido = False
        except Exception:
            logging.exception("Fallo aplicando la corrección para %s", falla.clave())
            corregido = False

    ahora = datetime.now()
    id_falla = uuid.uuid4().hex[:12]
    notificado = notificacion.notificar(falla, resultado.nivel, resultado.comandos, "NUEVA")

    registrar_evento(EventoFalla(
        hora=ahora.isoformat(timespec="seconds"),
        dispositivo=falla.dispositivo,
        tipo=falla.tipo,
        interfaz=falla.interfaz,
        estado="NUEVA",
        nivel=resultado.nivel,
        comandos_aplicados=resultado.comandos,
        corregido=corregido,
        notificado=notificado,
        id_falla=id_falla,
        origen=_origen(falla),
    ))
    # Se guarda el contexto pase lo que pase (incluso si no se pudo corregir),
    # para poder calcular cuánto tardó en resolverse y con qué se clasificó,
    # sin importar si la resolución termina siendo manual o automática.
    _contexto_fallas_activas[falla.clave()] = (ahora, resultado, id_falla)


def manejar_falla_resuelta(falla: Falla) -> None:
    contexto = _contexto_fallas_activas.pop(falla.clave(), None)
    if contexto:
        inicio, resultado_previo, id_falla = contexto
        nivel = resultado_previo.nivel
        comandos = resultado_previo.comandos
        duracion_segundos = (datetime.now() - inicio).total_seconds()
        duracion_texto = formatear_duracion(duracion_segundos)
    else:
        nivel, comandos, duracion_segundos, duracion_texto, id_falla = None, [], None, None, None

    notificado = notificacion.notificar(falla, nivel, comandos, "RESUELTA", duracion_texto)

    registrar_evento(EventoFalla(
        hora=datetime.now().isoformat(timespec="seconds"),
        dispositivo=falla.dispositivo,
        tipo=falla.tipo,
        interfaz=falla.interfaz,
        estado="RESUELTA",
        nivel=nivel,
        comandos_aplicados=comandos,
        corregido=True,
        notificado=notificado,
        duracion_segundos=duracion_segundos,
        id_falla=id_falla,
    ))


def _revisar_con_sesion(sesion, nombre: str, dispositivo: dict, estado: EstadoMonitoreo) -> None:
    fallas = (
        detectar_interfaces_caidas(sesion, dispositivo)
        + detectar_puertos_saturados(sesion, dispositivo)
        + detectar_ip_fuera_de_vlan(sesion, dispositivo)
    )
    nuevas, resueltas = estado.actualizar_dispositivo(nombre, fallas)

    for falla in nuevas:
        manejar_falla_nueva(falla, sesion)
    for falla in resueltas:
        manejar_falla_resuelta(falla)


def _revisar_dispositivo(
    nombre: str, dispositivo: dict, estado: EstadoMonitoreo, sesiones: conexion.SesionesPersistentes
) -> dict:
    ahora = datetime.now().isoformat(timespec="seconds")
    responde = False
    # Dos intentos: si la sesión guardada se murió sin avisar (p. ej. el equipo
    # se reinició), el primero falla y el segundo usa una conexión nueva.
    for intento in (1, 2):
        try:
            _revisar_con_sesion(sesiones.obtener(dispositivo), nombre, dispositivo, estado)
            responde = True
            break
        except Exception:
            sesiones.descartar(nombre)
            if intento == 2:
                logging.exception("No se pudo monitorear %s", nombre)
    return {
        "nombre": nombre,
        "ip": dispositivo["ip_gestion"],
        "responde": responde,
        "ultima_revision": ahora,
    }


def ejecutar_ciclo(
    estado: EstadoMonitoreo, sesiones: conexion.SesionesPersistentes | None = None
) -> None:
    sesiones = sesiones or conexion.SesionesPersistentes()
    dispositivos = conexion.cargar_dispositivos()
    with ThreadPoolExecutor(max_workers=len(dispositivos) or 1) as hilos:
        futuros = {
            nombre: hilos.submit(_revisar_dispositivo, nombre, dispositivo, estado, sesiones)
            for nombre, dispositivo in dispositivos.items()
        }
    equipos.escribir_estado({nombre: f.result() for nombre, f in futuros.items()})


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    estado = EstadoMonitoreo()
    sesiones = conexion.SesionesPersistentes()
    while True:
        _correccion_aplicada.clear()
        ejecutar_ciclo(estado, sesiones)
        time.sleep(
            INTERVALO_TRAS_CORRECCION_SEGUNDOS if _correccion_aplicada.is_set()
            else INTERVALO_SEGUNDOS
        )


if __name__ == "__main__":
    main()
