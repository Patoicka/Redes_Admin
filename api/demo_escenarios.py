"""Definiciones FIJAS de los escenarios del panel de demo. El navegador solo
pide "ejecuta el escenario X" por id (ver rutas_demo.py); los comandos reales
están codificados aquí, nunca llegan desde la petición HTTP.
conexion.Sesion.aplicar_correccion sigue validando contra ether1 y la red de
gestión 192.168.56.0/24 como última línea de defensa, igual que para
cualquier corrección del agente. Los escenarios de PC-VEN1 no pasan por ahí:
escriben en la consola telnet del VPCS en GNS3 (ver consola_gns3.py), con
comandos igual de fijos y que no tocan la red de gestión.
"""

import ipaddress
import logging
import re
import threading
from dataclasses import dataclass

import conexion
import consola_gns3


@dataclass
class Escenario:
    id: str
    nombre: str
    descripcion: str
    disponible: bool


ESCENARIOS: dict[str, Escenario] = {
    "interfaz_caida_r1": Escenario(
        id="interfaz_caida_r1",
        nombre="Interfaz caída en R1",
        descripcion=(
            "Deshabilita ether3 en R1; el agente la detecta y la vuelve a "
            "habilitar en el siguiente ciclo de monitoreo."
        ),
        disponible=True,
    ),
    "puerto_saturado_sw1": Escenario(
        id="puerto_saturado_sw1",
        nombre="Puerto saturado en SW1",
        descripcion=(
            "Lanza desde R1 3 pings en paralelo de 1472 bytes cada 10 ms hacia "
            "PC-ADMIN (~40 s, se detienen solos): satura ether2/ether4 de SW1. "
            "Como el origen es el propio R1, el agente solo notifica."
        ),
        disponible=True,
    ),
    "ip_fuera_de_vlan": Escenario(
        id="ip_fuera_de_vlan",
        nombre="IP fuera de VLAN",
        descripcion=(
            "Por la consola de GNS3, pone 192.168.10.50/24 en PC-VEN1 (conectado "
            "a la VLAN20) y lo hace intentar llegar a 192.168.10.1 durante ~90 s. "
            "El agente lo ve por sniffer de ARP en vlan20 de R1 y lo pone en cuarentena."
        ),
        disponible=True,
    ),
    "restaurar_pc_ven1": Escenario(
        id="restaurar_pc_ven1",
        nombre="Restaurar IP de PC-VEN1",
        descripcion=(
            "Devuelve PC-VEN1 a 192.168.20.10/24 (su IP original) y hace ping a "
            "su gateway para que R1 lo vea bien configurado y la falla se resuelva. "
            "También quita la cuarentena que el agente le haya puesto."
        ),
        disponible=True,
    ),
}

# Pings paralelos desde R1: /ping no admite flood en CHR, así que se suman
# varios con el intervalo mínimo (10 ms). :execute los deja corriendo en R1
# aunque se cierre la sesión SSH. La duración no se controla con count (con la
# carga, R1 no sostiene los 10 ms y 4000 pings duraban ~2 min): un cuarto job
# elimina los tres pings a los _SEGUNDOS_SATURACION, y count queda solo como
# tope por si ese job fallara. 40 s alcanzan para que el agente, con ciclos de
# ~15 s, vea la saturación al menos dos veces.
_SEGUNDOS_SATURACION = 40
_PING_SATURACION = "{/ping 192.168.10.10 size=1472 interval=10ms count=4000}"
_PINGS_SATURACION = [
    f":local a [:execute {_PING_SATURACION}]; "
    f":local b [:execute {_PING_SATURACION}]; "
    f":local c [:execute {_PING_SATURACION}]; "
    f':execute (":delay {_SEGUNDOS_SATURACION}s; /system script job remove " . $a . '
    f'"; /system script job remove " . $b . "; /system script job remove " . $c)'
]

VPCS_FUERA_DE_VLAN = "PC-VEN1"
_IP_INCORRECTA = "ip 192.168.10.50/24 192.168.10.1"
_IP_ORIGINAL = "ip 192.168.20.10/24 192.168.20.1"
_SEGUNDOS_INTENTANDO = 90
# Con la cuarentena puesta, el agente da al host por contenido y ya no lo
# reporta: si quedó de una ejecución anterior, repetir el escenario no haría
# nada visible. Solo se quita la entrada que puso el agente para esta IP.
_FILTRO_CUARENTENA = (
    'where list="cuarentena" and address="192.168.10.50" and comment="agente"'
)
_QUITAR_CUARENTENA = f"/ip firewall address-list remove [find {_FILTRO_CUARENTENA}]"
_PINGS_RESTAURACION = 3

# Hilo que mantiene a PC-VEN1 intentando comunicarse (y por tanto mandando
# ARP) mientras dura el escenario; restaurar_pc_ven1 lo corta.
_parar_pings_vpcs = threading.Event()


class EscenarioNoDisponibleError(Exception):
    """El escenario existe pero su topología todavía no está lista."""


def ejecutar(id_escenario: str) -> tuple[str, dict | None]:
    """Devuelve (salida cruda, resumen). El resumen solo existe para los
    escenarios que no generan una falla que seguir en el tablero (hoy,
    restaurar_pc_ven1): es lo que el panel de demo muestra como seguimiento."""
    escenario = ESCENARIOS.get(id_escenario)
    if escenario is None:
        raise KeyError(id_escenario)
    if not escenario.disponible:
        raise EscenarioNoDisponibleError(escenario.descripcion)

    if id_escenario == "interfaz_caida_r1":
        dispositivo = conexion.obtener_dispositivo("R1")
        with conexion.abrir_sesion(dispositivo) as sesion:
            return sesion.aplicar_correccion(["/interface disable ether3"]), None

    if id_escenario == "puerto_saturado_sw1":
        dispositivo = conexion.obtener_dispositivo("R1")
        with conexion.abrir_sesion(dispositivo) as sesion:
            return sesion.aplicar_correccion(_PINGS_SATURACION), None

    if id_escenario == "ip_fuera_de_vlan":
        _parar_pings_vpcs.set()  # por si quedó un hilo de una ejecución anterior
        _quitar_cuarentena_pc_ven1()
        salida = consola_gns3.ejecutar_en_vpcs(VPCS_FUERA_DE_VLAN, [_IP_INCORRECTA])
        _parar_pings_vpcs.clear()
        threading.Thread(target=_mantener_intentando, daemon=True).start()
        return salida, None

    if id_escenario == "restaurar_pc_ven1":
        _parar_pings_vpcs.set()
        # Primero la IP correcta (y el ping, para que R1 lo vea bien
        # configurado), después se levanta la cuarentena: al revés, el agente
        # podría volver a reportarlo en medio.
        salida = consola_gns3.ejecutar_en_vpcs(
            VPCS_FUERA_DE_VLAN, [_IP_ORIGINAL, f"ping 192.168.20.1 -c {_PINGS_RESTAURACION}"]
        )
        quitadas = _quitar_cuarentena_pc_ven1()
        return salida, _resumen_restauracion(salida, quitadas)

    raise NotImplementedError(id_escenario)


def _quitar_cuarentena_pc_ven1() -> int:
    """Quita la cuarentena del agente para PC-VEN1; devuelve cuántas entradas había."""
    with conexion.abrir_sesion(conexion.obtener_dispositivo("R1")) as sesion:
        antes = sesion.leer_estado(
            f":put [:len [/ip firewall address-list find {_FILTRO_CUARENTENA}]]"
        ).split()
        sesion.aplicar_correccion([_QUITAR_CUARENTENA])
    return int(antes[0]) if antes and antes[0].isdigit() else 0


def _resumen_restauracion(salida: str, cuarentenas_quitadas: int) -> dict:
    """Lo que realmente pasó en PC-VEN1, leído de la salida de su consola."""
    # VPCS confirma la IP con "PC-VEN1 : 192.168.20.10 255.255.255.0 gateway 192.168.20.1".
    ip = re.search(
        rf"{VPCS_FUERA_DE_VLAN} : (\S+) (\S+) gateway (\S+)", salida
    )
    ip_configurada = gateway = None
    if ip:
        try:
            ip_configurada = str(ipaddress.ip_interface(f"{ip.group(1)}/{ip.group(2)}"))
        except ValueError:
            ip_configurada = ip.group(1)
        gateway = ip.group(3)
    return {
        "host": VPCS_FUERA_DE_VLAN,
        "ip_esperada": "192.168.20.10/24",
        "ip_configurada": ip_configurada,
        "gateway": gateway,
        "ping_respuestas": len(re.findall(r"bytes from 192\.168\.20\.1", salida)),
        "ping_enviados": _PINGS_RESTAURACION,
        "cuarentenas_quitadas": cuarentenas_quitadas,
    }


def _mantener_intentando() -> None:
    try:
        consola_gns3.repetir_en_vpcs(
            VPCS_FUERA_DE_VLAN, "ping 192.168.10.1 -c 1",
            cada=2.0, durante=_SEGUNDOS_INTENTANDO, parar=_parar_pings_vpcs,
        )
    except Exception:
        logging.exception("Se cortaron los pings de %s", VPCS_FUERA_DE_VLAN)
