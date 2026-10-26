"""Captura corta de ARP con /tool sniffer de RouterOS, para el detector de IP
fuera de VLAN (ver deteccion.detectar_ip_fuera_de_vlan).

Por qué así: un host con IP de otra subred nunca entra a /ip arp de R1 (R1 no
le contesta), y el sniffer de RouterOS sí ve sus ARP pero no muestra la IP
del remitente en /tool sniffer packet (los campos src/dst-address vienen
vacíos para ARP). Por eso se graba la captura a un archivo pcapng, se baja
por SFTP y la IP se lee aquí directamente del paquete.

Se captura en todas las VLANs a la vez (filter-interface acepta una lista) y
la VLAN de cada paquete sale del bloque de interfaz del pcapng: una sola
captura de unos segundos por ciclo en vez de una por VLAN.

La captura se detiene sola: start, :delay y stop van en un mismo bloque que
ejecuta el propio equipo, así que aunque se corte el SSH no queda corriendo.
Además se limita por tamaño (file-limit / memory-scroll=no) y aquí por número
de paquetes leídos.
"""

import ipaddress
import struct

import conexion

ARCHIVO_CAPTURA = "agente-arp.pcap"
MAX_PAQUETES = 200

_ETHERTYPE_ARP = 0x0806
_ETHERTYPE_VLAN = 0x8100
_OPCION_NOMBRE_INTERFAZ = 2


def capturar(
    sesion, interfaces: list[str], segundos: int = 3
) -> list[tuple[str, ipaddress.IPv4Address, str]]:
    """Devuelve (interfaz, ip_remitente, mac_remitente) de los ARP recibidos
    en `interfaces` durante `segundos`."""
    if not interfaces:
        return []
    if conexion.INTERFAZ_GESTION in interfaces:
        raise conexion.ComandoNoPermitidoError(
            f"No se captura sobre la interfaz de gestión {conexion.INTERFAZ_GESTION}"
        )

    sesion.leer_estado("/tool sniffer stop")
    sesion.leer_estado(f':do {{/file remove [find name="{ARCHIVO_CAPTURA}"]}} on-error={{}}')
    sesion.leer_estado(
        f"/tool sniffer set filter-interface={','.join(interfaces)} filter-mac-protocol=arp "
        f"filter-direction=rx filter-stream=no streaming-enabled=no "
        f"memory-limit=100KiB memory-scroll=no "
        f"file-name={ARCHIVO_CAPTURA} file-limit=20KiB"
    )
    sesion.leer_estado(
        f"{{/tool sniffer start; :delay {int(segundos)}s; /tool sniffer stop}}"
    )
    try:
        datos = sesion.descargar_archivo(ARCHIVO_CAPTURA)
    except FileNotFoundError:
        return []
    finally:
        sesion.leer_estado(f':do {{/file remove [find name="{ARCHIVO_CAPTURA}"]}} on-error={{}}')
    return remitentes_arp(datos)


def remitentes_arp(datos: bytes) -> list[tuple[str, ipaddress.IPv4Address, str]]:
    """Recorre un pcapng (formato que escribe RouterOS) y extrae la interfaz,
    IP y MAC del remitente de cada paquete ARP."""
    if len(datos) < 12 or datos[:4] != b"\x0a\x0d\x0d\x0a":
        return []
    orden = "<" if datos[8:12] == b"\x4d\x3c\x2b\x1a" else ">"

    interfaces: list[str] = []  # índice de bloque de interfaz -> nombre
    resultado = []
    pos = 0
    while pos + 12 <= len(datos) and len(resultado) < MAX_PAQUETES:
        tipo, largo = struct.unpack(orden + "II", datos[pos:pos + 8])
        if largo < 12 or pos + largo > len(datos):
            break
        bloque = datos[pos:pos + largo]
        if tipo == 1:  # Interface Description Block
            interfaces.append(_nombre_interfaz(bloque, orden))
        elif tipo == 6:  # Enhanced Packet Block
            id_interfaz, = struct.unpack(orden + "I", bloque[8:12])
            capturado, = struct.unpack(orden + "I", bloque[20:24])
            arp = _remitente_arp(bloque[28:28 + capturado])
            if arp and id_interfaz < len(interfaces):
                resultado.append((interfaces[id_interfaz], *arp))
        pos += largo
    return resultado


def _nombre_interfaz(bloque: bytes, orden: str) -> str:
    """RouterOS nombra cada interfaz de la captura como "vlan20 rx" / "vlan20 tx"."""
    pos = 16  # tras tipo, largo, linktype, reservado y snaplen
    while pos + 4 <= len(bloque) - 4:
        codigo, largo = struct.unpack(orden + "HH", bloque[pos:pos + 4])
        if codigo == 0:
            break
        if codigo == _OPCION_NOMBRE_INTERFAZ:
            nombre = bloque[pos + 4:pos + 4 + largo].decode("ascii", "replace")
            return nombre.split()[0] if nombre.split() else ""
        pos += 4 + (largo + 3) // 4 * 4
    return ""


def _remitente_arp(trama: bytes) -> tuple[ipaddress.IPv4Address, str] | None:
    if len(trama) < 14:
        return None
    ethertype = struct.unpack("!H", trama[12:14])[0]
    inicio = 14
    if ethertype == _ETHERTYPE_VLAN and len(trama) >= 18:
        ethertype = struct.unpack("!H", trama[16:18])[0]
        inicio = 18
    if ethertype != _ETHERTYPE_ARP:
        return None
    arp = trama[inicio:]
    # Solo Ethernet/IPv4 (hlen=6, plen=4).
    if len(arp) < 28 or arp[4] != 6 or arp[5] != 4:
        return None
    mac = ":".join(f"{b:02X}" for b in arp[8:14])
    ip = ipaddress.IPv4Address(arp[14:18])
    return ip, mac
