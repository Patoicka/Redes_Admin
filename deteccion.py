"""Detectores de fallas sobre una sesión SSH ya abierta (ver conexion.Sesion).

Cada detector recibe `sesion` (con .leer_estado) y el `dispositivo` (dict de
dispositivos.yaml, incluyendo su bloque "monitoreo"). Solo describen qué está
mal; no corrigen nada. La "sugerencia" es una regla fija simple, no la cascada
de IA (eso es una fase posterior) — sirve para que la notificación ya traiga
una propuesta de acción legible.
"""

import ipaddress
import logging
import re
import time
from dataclasses import dataclass

import captura_arp
import conexion


@dataclass
class Falla:
    dispositivo: str
    tipo: str  # "interfaz_caida" | "puerto_saturado" | "ip_fuera_de_vlan"
    interfaz: str | None
    detalle: dict
    sugerencia: str | None = None

    def clave(self) -> tuple:
        # La MAC distingue a dos hosts mal configurados en la misma VLAN; en
        # los otros tipos es None.
        return (self.dispositivo, self.tipo, self.interfaz, self.detalle.get("mac"))


def _lista_ros(valores: list[str]) -> str:
    return "{" + ";".join(f'"{v}"' for v in valores) + "}"


# --- 1. Interfaz caída -------------------------------------------------------

def detectar_interfaces_caidas(sesion, dispositivo: dict) -> list[Falla]:
    cfg = dispositivo.get("monitoreo", {})
    interfaces = cfg.get("interfaces", [])
    if not interfaces:
        return []
    requiere_enlace = set(cfg.get("requiere_enlace", []))

    script = (
        ":foreach nombre in=" + _lista_ros(interfaces) + " do={"
        ":local i [/interface find name=$nombre];"
        ':put ($nombre . "=" . [/interface get $i disabled] . "," . [/interface get $i running])'
        "}"
    )
    salida = sesion.leer_estado(script)

    fallas = []
    for linea in salida.splitlines():
        linea = linea.strip()
        if not linea or "=" not in linea:
            continue
        nombre, valores = linea.split("=", 1)
        try:
            disabled_str, running_str = valores.split(",")
        except ValueError:
            continue
        deshabilitada = disabled_str.strip().lower() == "true"
        activa = running_str.strip().lower() == "true"

        if deshabilitada:
            fallas.append(Falla(
                dispositivo=dispositivo["nombre"],
                tipo="interfaz_caida",
                interfaz=nombre,
                detalle={"disabled": True, "running": activa},
                sugerencia=f"Habilitar la interfaz: /interface enable {nombre}",
            ))
        elif nombre in requiere_enlace and not activa:
            fallas.append(Falla(
                dispositivo=dispositivo["nombre"],
                tipo="interfaz_caida",
                interfaz=nombre,
                detalle={"disabled": False, "running": False},
                sugerencia=(
                    f"{nombre} no está deshabilitada pero no tiene enlace; "
                    f"revisar cableado/extremo remoto."
                ),
            ))
    return fallas


# --- 2. Puerto saturado ------------------------------------------------------

def _registros_torch(salida: str) -> list[dict[str, str]]:
    """Separa la salida de ':put [... as-value]' (".id=*1;campo=valor;...;
    .id=*2;...") en un dict por flujo."""
    registros: list[dict[str, str]] = []
    for campo in re.split(r"[;\n]", salida):
        clave, sep, valor = campo.strip().partition("=")
        if not sep:
            continue
        if clave == ".id" or not registros:
            registros.append({})
        registros[-1][clave] = valor.strip()
    return registros


def _identificar_origen_torch(
    sesion, interfaz: str, dispositivo: dict
) -> tuple[str | None, str | None, str]:
    """Usa /tool torch para encontrar el host que más tráfico genera en la
    interfaz saturada, y arma la sugerencia de queue con su IP real.
    Devuelve (ip_host_o_None, ip_que_reporto_torch_o_None, texto_sugerencia):
    la primera solo si es un host de una VLAN conocida (apta para una queue);
    la segunda siempre que torch señaló algo, para mostrar el origen aunque
    no se proponga corrección.
    """
    # Se imprime el resultado crudo en vez de recorrerlo con :foreach: con un
    # solo flujo, as-value devuelve un registro plano y :foreach iteraría sus
    # campos. Sin src-address=0.0.0.0/0, torch no recolecta direcciones, y con
    # duration=1 devuelve la primera muestra, con tx/rx todavía en 0.
    comando = (
        ":put [/tool torch " + interfaz + " src-address=0.0.0.0/0 duration=2 as-value]"
    )
    try:
        salida = sesion.leer_estado(comando)
    except Exception:
        return None, None, (
            f"No se pudo ejecutar /tool torch en {interfaz}; revisar manualmente "
            f"el origen antes de limitar tráfico."
        )

    mejor_ip, mejor_destino, mejor_tasa = None, None, 0.0
    for registro in _registros_torch(salida):
        try:
            tasa = float(registro.get("tx", 0)) + float(registro.get("rx", 0))
        except ValueError:
            continue
        ip_str = registro.get("src-address", "")
        if ip_str and tasa > mejor_tasa:
            mejor_ip, mejor_tasa = ip_str.split(":")[0].strip(), tasa
            mejor_destino = registro.get("dst-address", "").split(":")[0].strip()

    if mejor_ip is None:
        return None, None, (
            f"/tool torch no reportó flujos significativos en {interfaz} en esta "
            f"muestra; reintentar antes de proponer una queue."
        )

    subredes_host = [v["subred"] for v in dispositivo.get("monitoreo", {}).get("vlans", [])]
    propias = {str(ip) for ip in ips_propias(sesion)} if subredes_host else set()
    try:
        ip = ipaddress.ip_address(mejor_ip)
        es_host_conocido = any(ip in ipaddress.ip_network(s) for s in subredes_host)
    except ValueError:
        es_host_conocido = False

    # Si el propio equipo es un extremo del flujo (p. ej. el escenario de demo
    # con pings desde R1), una queue simple no lo limitaría: solo se notifica.
    if es_host_conocido and (mejor_ip in propias or mejor_destino in propias):
        return None, mejor_ip, (
            f"/tool torch señala {mejor_ip} -> {mejor_destino}: el tráfico sale de o "
            f"llega al propio {dispositivo['nombre']}, así que una queue no lo "
            f"limitaría. Revisar qué lo genera en el equipo."
        )
    if es_host_conocido:
        return mejor_ip, mejor_ip, (
            f"Origen identificado con /tool torch: {mejor_ip}. Sugerencia: "
            f"/queue simple add name=limite-{interfaz} target={mejor_ip} "
            f"max-limit=800k/800k comment=agente"
        )
    return None, mejor_ip, (
        f"/tool torch señala {mejor_ip} como origen, pero no pertenece a ninguna "
        f"VLAN de host conocida: probablemente sea tráfico entre routers (ej. "
        f"bandwidth-test entre R1 y SW1). Revisar manualmente antes de limitar; "
        f"no se propone una queue automática sobre esa IP."
    )


def detectar_puertos_saturados(sesion, dispositivo: dict) -> list[Falla]:
    cfg = dispositivo.get("monitoreo", {})
    interfaces = cfg.get("interfaces", [])
    if not interfaces:
        return []
    limite = cfg.get("limite_trafico_bps", 1_000_000)
    umbral_bps = limite * cfg.get("umbral_saturacion_pct", 80) / 100

    script = (
        ":foreach m in=[/interface monitor-traffic " + ",".join(interfaces) + " once as-value] do={"
        ':put ($m->"name" . "=" . $m->"rx-bits-per-second" . "," . $m->"tx-bits-per-second")'
        "}"
    )
    salida = sesion.leer_estado(script)

    fallas = []
    for linea in salida.splitlines():
        linea = linea.strip()
        if not linea or "=" not in linea:
            continue
        nombre, valores = linea.split("=", 1)
        try:
            rx_str, tx_str = valores.split(",")
            rx, tx = float(rx_str), float(tx_str)
        except ValueError:
            continue
        pico = max(rx, tx)
        if pico >= umbral_bps:
            origen_ip, origen_torch, sugerencia = _identificar_origen_torch(
                sesion, nombre, dispositivo
            )
            fallas.append(Falla(
                dispositivo=dispositivo["nombre"],
                tipo="puerto_saturado",
                interfaz=nombre,
                detalle={
                    "rx_bps": rx,
                    "tx_bps": tx,
                    "limite_bps": limite,
                    "origen_ip": origen_ip,
                    "origen_torch": origen_torch,
                },
                sugerencia=sugerencia,
            ))
    return fallas


# --- 3. IP fuera de su VLAN (vía sniffer de ARP) -----------------------------

# Hosts vistos con IP fuera de su VLAN: (dispositivo, interfaz, mac) ->
# (ip, instante en que se vio por última vez). Hace falta memoria entre ciclos
# porque un host solo manda ARP mientras intenta comunicarse: si en la captura
# de 3 s de este ciclo no habló, no significa que ya esté corregido.
_vistos_fuera_de_vlan: dict[tuple, tuple[ipaddress.IPv4Address, float]] = {}


def ips_propias(sesion) -> set[ipaddress.IPv4Address]:
    """IPs del propio equipo (gateways de cada VLAN): nunca son una falla."""
    salida = sesion.leer_estado(
        ':foreach a in=[/ip address find] do={:put [/ip address get $a address]}'
    )
    ips = set()
    for linea in salida.splitlines():
        try:
            ips.add(ipaddress.ip_interface(linea.strip()).ip)
        except ValueError:
            continue
    return ips


def _macs_bien_configuradas(sesion, interfaz: str, subred) -> set[str]:
    """MACs que el equipo resolvió por ARP en `interfaz` con una IP de la
    subred correcta: si alguna estaba marcada, ese host ya fue corregido.
    Solo entradas "reachable": una "stale" puede ser de antes de que el host
    se configurara mal."""
    salida = sesion.leer_estado(
        ":foreach a in=[/ip arp find interface=" + interfaz + ' status="reachable"] do={'
        ':put ([/ip arp get $a address] . "," . [/ip arp get $a mac-address])'
        "}"
    )
    macs = set()
    for linea in salida.splitlines():
        if "," not in linea:
            continue
        ip_str, mac = linea.strip().split(",", 1)
        try:
            if ipaddress.ip_address(ip_str) in subred and mac:
                macs.add(mac.strip().upper())
        except ValueError:
            continue
    return macs


def _ips_en_cuarentena(sesion) -> set[str]:
    """IPs aisladas con la corrección del agente: en la address-list
    "cuarentena" y con la regla forward-drop activa. Sin la regla, la entrada
    sola no aísla nada y el host no cuenta como contenido."""
    # Con la forma "find clave=valor", RouterOS v7 no encuentra la regla por
    # src-address-list ni por disabled: hace falta "find where".
    regla = sesion.leer_estado(
        ':put [:len [/ip firewall filter find where chain="forward" and action="drop" '
        'and src-address-list="cuarentena" and !disabled]]'
    ).strip()
    if not regla.split() or regla.split()[0] == "0":
        return set()
    salida = sesion.leer_estado(
        ':foreach a in=[/ip firewall address-list find where list="cuarentena" and !disabled] do={'
        ":put [/ip firewall address-list get $a address]}"
    )
    ips = set()
    for linea in salida.splitlines():
        try:
            ips.add(str(ipaddress.ip_address(linea.strip())))
        except ValueError:
            continue
    return ips


def detectar_ip_fuera_de_vlan(sesion, dispositivo: dict) -> list[Falla]:
    cfg = dispositivo.get("monitoreo", {})
    vlans = cfg.get("vlans", [])
    if not vlans:
        return []
    segundos = cfg.get("sniffer_segundos", 3)
    memoria = cfg.get("memoria_ip_fuera_de_vlan_segundos", 120)
    nombre = dispositivo["nombre"]
    propias = ips_propias(sesion)

    subredes = {}
    for vlan in vlans:
        interfaz = vlan["interfaz"]
        subred = ipaddress.ip_network(vlan["subred"])
        if interfaz == conexion.INTERFAZ_GESTION or subred.overlaps(conexion.RED_GESTION):
            logging.warning("VLAN %s/%s ignorada: es la red de gestión", interfaz, subred)
            continue
        subredes[interfaz] = subred
        for mac in _macs_bien_configuradas(sesion, interfaz, subred):
            _vistos_fuera_de_vlan.pop((nombre, interfaz, mac), None)

    try:
        remitentes = captura_arp.capturar(sesion, list(subredes), segundos)
    except Exception:
        # Sin captura no se sabe nada nuevo: lo ya visto se conserva tal cual.
        logging.exception("No se pudo capturar ARP en %s", nombre)
        remitentes = []

    ahora = time.monotonic()
    for interfaz, ip, mac in remitentes:
        subred = subredes.get(interfaz)
        if subred is None or ip.is_unspecified or ip in propias or ip in conexion.RED_GESTION:
            continue
        clave = (nombre, interfaz, mac)
        if ip in subred:
            _vistos_fuera_de_vlan.pop(clave, None)
        else:
            _vistos_fuera_de_vlan[clave] = (ip, ahora)

    # Un host ya aislado por la cuarentena del agente queda contenido: deja de
    # reportarse (la falla pasa a Resuelta), pero se sigue recordando, así que
    # si se quita la cuarentena y sigue mal configurado vuelve a aparecer.
    en_cuarentena = _ips_en_cuarentena(sesion)

    fallas = []
    for clave, (ip, visto) in list(_vistos_fuera_de_vlan.items()):
        disp, interfaz, mac = clave
        if disp != nombre:
            continue
        if ahora - visto > memoria:
            _vistos_fuera_de_vlan.pop(clave)
            continue
        if str(ip) in en_cuarentena:
            continue
        fallas.append(Falla(
            dispositivo=nombre,
            tipo="ip_fuera_de_vlan",
            interfaz=interfaz,
            detalle={
                "ip": str(ip),
                "mac": mac,
                "subred_esperada": str(subredes.get(interfaz)),
            },
            sugerencia=(
                f"Host {ip} (MAC {mac}) visto en {interfaz} enviando ARP, fuera de "
                f"{subredes.get(interfaz)}. No se puede corregir la IP del equipo "
                f"(VPCS). Aislar vía firewall en {nombre}: "
                f"/ip firewall address-list add list=cuarentena address={ip} comment=agente; "
                f"/ip firewall filter add chain=forward src-address-list=cuarentena "
                f"action=drop comment=agente"
            ),
        ))
    return fallas
