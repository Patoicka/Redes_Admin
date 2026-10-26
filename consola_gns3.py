"""Acceso a la consola telnet de los VPCS de GNS3, solo para los escenarios
del panel de demo (ver api/demo_escenarios.py). Los VPCS no tienen SSH ni
API: la única forma de cambiarles la IP es escribir en su consola.

Los puertos de consola los asigna GNS3 y pueden cambiar al reabrir el
proyecto, así que se busca el VPCS por su prompt ("PC-VEN1>") recorriendo
el rango de puertos, en vez de fijar uno.
"""

import re
import socket
import time
from concurrent.futures import ThreadPoolExecutor

HOST_GNS3 = "192.168.56.101"
PUERTOS_CONSOLA = range(5000, 5031)

_IAC = re.compile(rb"\xff[\xfb-\xfe].|\xff.", re.DOTALL)  # negociación telnet
_CTRL_C = b"\x03"


class ConsolaNoEncontradaError(Exception):
    """Ningún puerto de consola de GNS3 respondió con el prompt buscado."""


# Último puerto donde se encontró cada VPCS: la búsqueda completa recorre
# ~30 puertos y tarda >10 s, así que solo se repite si el puerto cambió.
_puertos_conocidos: dict[str, int] = {}


def _leer(s: socket.socket, espera: float, hasta: str | None = None) -> str:
    """Lee durante `espera` segundos, o hasta que la salida termine en `hasta`
    (el prompt del VPCS: el comando ya terminó)."""
    fin = time.monotonic() + espera
    datos = b""
    while time.monotonic() < fin:
        if hasta and _IAC.sub(b"", datos).decode("latin1").rstrip().endswith(hasta):
            break
        s.settimeout(max(fin - time.monotonic(), 0.05))
        try:
            trozo = s.recv(4096)
        except (socket.timeout, TimeoutError):
            break
        if not trozo:
            break
        datos += trozo
    return _IAC.sub(b"", datos).decode("latin1")


def _responde_en(puerto: int, prompt: str) -> bool:
    try:
        s = socket.create_connection((HOST_GNS3, puerto), timeout=1)
    except OSError:
        return False
    with s:
        s.sendall(b"\r\n")
        return prompt in _leer(s, 0.8, hasta=prompt)


def _buscar_puerto(nombre_vpcs: str) -> int:
    prompt = f"{nombre_vpcs}>"
    conocido = _puertos_conocidos.get(nombre_vpcs)
    if conocido and _responde_en(conocido, prompt):
        return conocido
    # Todos los puertos a la vez: uno por uno tarda >10 s (0,8 s por consola).
    with ThreadPoolExecutor(max_workers=len(PUERTOS_CONSOLA)) as hilos:
        respuestas = hilos.map(lambda p: (p, _responde_en(p, prompt)), PUERTOS_CONSOLA)
        for puerto, responde in respuestas:
            if responde:
                _puertos_conocidos[nombre_vpcs] = puerto
                return puerto
    raise ConsolaNoEncontradaError(
        f"No se encontró la consola de {nombre_vpcs} en {HOST_GNS3}:"
        f"{PUERTOS_CONSOLA.start}-{PUERTOS_CONSOLA.stop - 1} (¿proyecto GNS3 abierto?)"
    )


def ejecutar_en_vpcs(nombre_vpcs: str, comandos: list[str], espera: float = 4.0) -> str:
    """Corta lo que el VPCS esté corriendo (Ctrl+C, p. ej. un ping -t previo)
    y escribe cada comando, esperando `espera` segundos la salida de cada uno.
    El último comando puede dejarse corriendo (ping -t): se cierra la consola
    sin cortarlo."""
    puerto = _buscar_puerto(nombre_vpcs)
    prompt = f"{nombre_vpcs}>"
    salida = []
    with socket.create_connection((HOST_GNS3, puerto), timeout=2) as s:
        s.sendall(_CTRL_C + b"\r\n")
        _leer(s, 0.8, hasta=prompt)
        for comando in comandos:
            s.sendall(comando.encode("ascii") + b"\r\n")
            salida.append(_leer(s, espera, hasta=prompt))
    return "".join(salida)


def repetir_en_vpcs(
    nombre_vpcs: str, comando: str, cada: float, durante: float, parar=None
) -> None:
    """Escribe `comando` cada `cada` segundos durante `durante` segundos (o
    hasta que se active el threading.Event `parar`), sobre una sola conexión.
    Pensada para correr en un hilo aparte: un VPCS con IP de otra subred solo
    manda ARP mientras intenta comunicarse, y su ping se rinde a los ~3 s."""
    puerto = _buscar_puerto(nombre_vpcs)
    fin = time.monotonic() + durante
    with socket.create_connection((HOST_GNS3, puerto), timeout=2) as s:
        while time.monotonic() < fin and not (parar and parar.is_set()):
            s.sendall(comando.encode("ascii") + b"\r\n")
            _leer(s, cada)
