"""Lista blanca de comandos: lo único que este proyecto puede ejecutar como
corrección, venga de un modelo de IA o de las reglas fijas.

Cada validador exige las claves EXACTAS esperadas (ni de más ni de menos) y,
para los comandos que crean objetos nuevos (queue, address-list, firewall
filter), exige comment=agente — así limpiar_laboratorio.py puede borrar
exactamente lo que creó el agente y nada más.
"""

import ipaddress
import re

from conexion import ComandoNoPermitidoError

COMENTARIO_AGENTE = "agente"
LISTA_CUARENTENA = "cuarentena"

# Comandos "add" a los que se les inyecta comment=agente automáticamente si no
# lo traen. Ni la IA ni reglas.py tienen que acordarse de ponerlo.
_PREFIJOS_ADD_CON_COMENTARIO = (
    "/queue simple add",
    "/ip firewall address-list add",
    "/ip firewall filter add",
)


def normalizar_comandos(comandos: list[str]) -> list[str]:
    normalizados = []
    for comando in comandos:
        comando = comando.strip()
        es_add = any(comando.startswith(p) for p in _PREFIJOS_ADD_CON_COMENTARIO)
        if es_add and not re.search(r"\bcomment=", comando):
            comando = f"{comando} comment={COMENTARIO_AGENTE}"
        normalizados.append(comando)
    return normalizados


def _es_ipv4(valor: str) -> bool:
    try:
        ipaddress.ip_address(valor)
        return True
    except ValueError:
        return False


def _parsear_parametros(tokens: list[str]) -> dict[str, str] | None:
    """Convierte tokens 'clave=valor' en dict. None si algo no tiene esa forma
    o hay claves repetidas (posible intento de confundir al validador)."""
    params: dict[str, str] = {}
    for tok in tokens:
        if "=" not in tok:
            return None
        clave, _, valor = tok.partition("=")
        if not clave or not valor or clave in params:
            return None
        params[clave] = valor
    return params


def _es_interface_enable(comando: str) -> bool:
    # Nunca "disable": eso queda solo para los scripts de prueba, no para
    # nada que la IA o las reglas puedan proponer.
    return re.fullmatch(r"/interface enable [A-Za-z0-9_-]+", comando.strip()) is not None


def _es_queue_simple_add(comando: str) -> bool:
    if ";" in comando:
        return False
    partes = comando.strip().split()
    if len(partes) < 4 or partes[:3] != ["/queue", "simple", "add"]:
        return False
    params = _parsear_parametros(partes[3:])
    if params is None or set(params) != {"name", "target", "max-limit", "comment"}:
        return False
    return (
        re.fullmatch(r"[A-Za-z0-9_-]+", params["name"]) is not None
        and _es_ipv4(params["target"])
        and re.fullmatch(r"\d+[kKmM]/\d+[kKmM]", params["max-limit"]) is not None
        and params["comment"] == COMENTARIO_AGENTE
    )


def _es_address_list_add(comando: str) -> bool:
    if ";" in comando:
        return False
    partes = comando.strip().split()
    if len(partes) < 5 or partes[:4] != ["/ip", "firewall", "address-list", "add"]:
        return False
    params = _parsear_parametros(partes[4:])
    if params is None or set(params) != {"list", "address", "comment"}:
        return False
    return (
        params["list"] == LISTA_CUARENTENA
        and _es_ipv4(params["address"])
        and params["comment"] == COMENTARIO_AGENTE
    )


def _es_filter_cuarentena(comando: str) -> bool:
    # Forma EXACTA, sin variaciones: no se aceptan otros chain/action/lista.
    if ";" in comando:
        return False
    partes = comando.strip().split()
    if len(partes) < 5 or partes[:4] != ["/ip", "firewall", "filter", "add"]:
        return False
    params = _parsear_parametros(partes[4:])
    esperado = {
        "chain": "forward",
        "src-address-list": LISTA_CUARENTENA,
        "action": "drop",
        "comment": COMENTARIO_AGENTE,
    }
    return params == esperado


_VALIDADORES = [
    _es_interface_enable,
    _es_queue_simple_add,
    _es_address_list_add,
    _es_filter_cuarentena,
]


def es_comando_permitido(comando: str) -> bool:
    return any(validador(comando) for validador in _VALIDADORES)


def _ip_objetivo(comando: str) -> str | None:
    """IP sobre la que actúa una queue (target) o una cuarentena (address)."""
    params = dict(tok.split("=", 1) for tok in comando.split() if "=" in tok)
    return params.get("target") or params.get("address")


def validar_comandos_permitidos(
    comandos: list[str], ips_protegidas: frozenset[str] = frozenset()
) -> None:
    """`ips_protegidas`: IPs del propio equipo. Una queue o una cuarentena
    sobre ellas tiene la forma correcta pero limitaría o aislaría al router
    mismo (p. ej. una IA que toma el gateway como "origen" del tráfico)."""
    for comando in comandos:
        if not es_comando_permitido(comando):
            raise ComandoNoPermitidoError(
                f"Comando fuera de la lista blanca, se rechaza todo el lote: {comando!r}"
            )
        if _ip_objetivo(comando) in ips_protegidas:
            raise ComandoNoPermitidoError(
                f"Comando sobre una IP del propio equipo, se rechaza todo el lote: {comando!r}"
            )
