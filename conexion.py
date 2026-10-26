"""Módulo aislado de conexión a dispositivos MikroTik (RouterOS v7) vía Netmiko.

El resto del agente debe usar únicamente las dos funciones públicas:
  - leer_estado(dispositivo, comando)
  - aplicar_correccion(dispositivo, comandos)

Las IPs y datos de los equipos viven en dispositivos.yaml; las credenciales
(ROUTER_USER, ROUTER_PASSWORD) se leen del .env.
"""

import ipaddress
import os
import re
from contextlib import contextmanager
from pathlib import Path

import yaml
from dotenv import load_dotenv
from netmiko import ConnectHandler

load_dotenv()

_RUTA_DISPOSITIVOS = Path(__file__).parent / "dispositivos.yaml"

INTERFAZ_GESTION = "ether1"
_PATRON_INTERFAZ_GESTION = re.compile(rf"\b{INTERFAZ_GESTION}\b", re.IGNORECASE)

# Ninguna corrección (firewall, address-list, lo que sea) puede tocar la red de
# gestión: es el canal por el que el propio agente llega a los equipos.
RED_GESTION = ipaddress.ip_network("192.168.56.0/24")
_PATRON_IP = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}(?:/\d{1,2})?\b")


class ComandoNoPermitidoError(Exception):
    """Se lanza cuando un comando toca la interfaz o la red de gestión."""


def cargar_dispositivos() -> dict:
    with open(_RUTA_DISPOSITIVOS, "r", encoding="utf-8") as f:
        datos = yaml.safe_load(f)
    return {d["nombre"]: d for d in datos["dispositivos"]}


def obtener_dispositivo(nombre: str) -> dict:
    dispositivos = cargar_dispositivos()
    if nombre not in dispositivos:
        raise KeyError(f"Dispositivo '{nombre}' no existe en dispositivos.yaml")
    return dispositivos[nombre]


def _parametros_conexion(dispositivo: dict) -> dict:
    usuario = os.getenv("ROUTER_USER")
    clave = os.getenv("ROUTER_PASSWORD")
    if not usuario or not clave:
        raise RuntimeError(
            "ROUTER_USER y ROUTER_PASSWORD deben estar definidos en .env"
        )
    return {
        "device_type": "mikrotik_routeros",
        "host": dispositivo["ip_gestion"],
        "username": usuario,
        "password": clave,
    }


def _toca_red_gestion(comando: str) -> bool:
    for coincidencia in _PATRON_IP.findall(comando):
        try:
            red_o_ip = ipaddress.ip_network(coincidencia, strict=False)
        except ValueError:
            continue
        if red_o_ip.overlaps(RED_GESTION):
            return True
    return False


def _validar_comandos(comandos: list[str]) -> None:
    for comando in comandos:
        if _PATRON_INTERFAZ_GESTION.search(comando):
            raise ComandoNoPermitidoError(
                f"Comando rechazado: hace referencia a la interfaz de gestión "
                f"'{INTERFAZ_GESTION}' y no puede aplicarse: {comando!r}"
            )
        if _toca_red_gestion(comando):
            raise ComandoNoPermitidoError(
                f"Comando rechazado: hace referencia a una dirección dentro de la "
                f"red de gestión {RED_GESTION}: {comando!r}"
            )


class Sesion:
    """Envoltorio de una única conexión SSH, para compartirla entre varias lecturas
    y correcciones dentro de un mismo ciclo de monitoreo."""

    def __init__(self, conexion):
        self._conexion = conexion

    def leer_estado(self, comando: str) -> str:
        return self._conexion.send_command(comando)

    def aplicar_correccion(self, comandos: list[str]) -> str:
        _validar_comandos(comandos)
        salidas = [self._conexion.send_command(comando) for comando in comandos]
        return "\n".join(salidas)

    def descargar_archivo(self, nombre: str) -> bytes:
        """Lee un archivo del equipo por SFTP, reutilizando la misma conexión
        SSH (p. ej. la captura .pcap del sniffer)."""
        sftp = self._conexion.remote_conn_pre.open_sftp()
        try:
            with sftp.open(nombre, "rb") as f:
                return f.read()
        finally:
            sftp.close()


@contextmanager
def abrir_sesion(dispositivo: dict):
    conexion = ConnectHandler(**_parametros_conexion(dispositivo))
    try:
        yield Sesion(conexion)
    finally:
        conexion.disconnect()


class SesionesPersistentes:
    """Una conexión SSH por equipo que sobrevive entre ciclos de monitoreo:
    abrirla cuesta 2-5 s por equipo, más que todas las revisiones juntas.
    Si una se cae (equipo reiniciado, red cortada), quien la usa llama a
    descartar() y la siguiente obtener() abre una nueva."""

    def __init__(self):
        self._conexiones: dict[str, object] = {}

    def obtener(self, dispositivo: dict) -> Sesion:
        nombre = dispositivo["nombre"]
        conexion = self._conexiones.get(nombre)
        if conexion is None or not conexion.is_alive():
            self.descartar(nombre)
            conexion = ConnectHandler(**_parametros_conexion(dispositivo))
            self._conexiones[nombre] = conexion
        return Sesion(conexion)

    def descartar(self, nombre: str) -> None:
        conexion = self._conexiones.pop(nombre, None)
        if conexion is not None:
            try:
                conexion.disconnect()
            except Exception:
                pass


def leer_estado(dispositivo: dict, comando: str) -> str:
    """Ejecuta un único comando de solo lectura (abre y cierra su propia conexión)."""
    with abrir_sesion(dispositivo) as sesion:
        return sesion.leer_estado(comando)


def aplicar_correccion(dispositivo: dict, comandos: list[str]) -> str:
    """Ejecuta comandos de corrección (abre y cierra su propia conexión)."""
    with abrir_sesion(dispositivo) as sesion:
        return sesion.aplicar_correccion(comandos)
