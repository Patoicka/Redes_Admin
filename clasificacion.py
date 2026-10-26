"""Cascada de clasificación: Groq -> DeepSeek -> Ollama -> reglas fijas.

Cuenta como fallo de un nivel (y se pasa al siguiente): bandera de "forzar
fallo" activa, clave de API ausente, timeout/error de red, JSON inválido,
claves/tipos incorrectos, o comandos propuestos fuera de la lista blanca
(comandos_permitidos.py). El nivel de reglas fijas nunca falla: sus comandos
salen directamente de esa lista blanca, así que la cascada siempre termina
con un resultado.
"""

import json
import logging
import os

import requests

import demo_config
from comandos_permitidos import normalizar_comandos, validar_comandos_permitidos
from conexion import ComandoNoPermitidoError
from deteccion import Falla
from reglas import clasificar_con_reglas
from resultado import ResultadoClasificacion

GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-flash")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

# Schema de la respuesta, compartido por los 3 niveles de IA (cada uno lo usa
# con su propio mecanismo: json_schema+strict en Groq, json_object+prompt en
# DeepSeek, format=<schema> en Ollama).
_RESPUESTA_SCHEMA = {
    "type": "object",
    "properties": {
        "tipo_falla": {"type": "string"},
        "causa": {"type": "string"},
        "comandos": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["tipo_falla", "causa", "comandos"],
    "additionalProperties": False,
}


class NivelFallidoError(Exception):
    """Un nivel de la cascada no pudo clasificar la falla; se prueba el siguiente."""


def _prompt_sistema() -> str:
    return (
        "Eres un asistente de administración de redes. Los equipos son MikroTik "
        "RouterOS v7 (NO Cisco): usa solo sintaxis de RouterOS v7. "
        "Responde ÚNICAMENTE un objeto JSON con las claves exactas "
        '"tipo_falla" (string), "causa" (string breve) y "comandos" (lista de '
        "strings, cada uno un comando RouterOS completo). Reglas estrictas para "
        "'comandos':\n"
        "- Para habilitar una interfaz usa solo '/interface enable <nombre>'. "
        "NUNCA propongas '/interface disable', bajo ninguna circunstancia.\n"
        "- Para limitar tráfico de un host: '/queue simple add name=<nombre> "
        "target=<ip> max-limit=<n>k/<n>k'.\n"
        "- Para aislar un host por VLAN incorrecta usa EXACTAMENTE estos dos "
        "comandos, sin modificar nombres de lista, chain ni action: "
        "'/ip firewall address-list add list=cuarentena address=<ip>' "
        "y '/ip firewall filter add chain=forward src-address-list=cuarentena "
        "action=drop'.\n"
        "- Nunca toques ether1 ni ninguna dirección de 192.168.56.0/24 (red de "
        "gestión del agente).\n"
        "- Nunca uses como target ni address una IP del propio equipo (sus "
        "gateways): si el tráfico sale de o llega al equipo, no propongas "
        "comandos.\n"
        "- No agregues 'comment' ni ningún parámetro extra a los comandos: el "
        "sistema los completa automáticamente.\n"
        "Si no puedes corregir la falla (p. ej. la IP de un host que no "
        "administras), deja 'comandos' como lista vacía y explica por qué en "
        "'causa'."
    )


def _prompt_usuario(falla: Falla) -> str:
    return (
        "Falla detectada:\n"
        f"- dispositivo: {falla.dispositivo}\n"
        f"- tipo (según el detector): {falla.tipo}\n"
        f"- interfaz: {falla.interfaz}\n"
        f"- detalle crudo: {json.dumps(falla.detalle, ensure_ascii=False)}\n"
        f"- sugerencia previa del detector (puedes ignorarla si no aplica): "
        f"{falla.sugerencia}\n\n"
        "Responde con el JSON pedido."
    )


def _validar_json(nivel: str, contenido: str) -> ResultadoClasificacion:
    try:
        datos = json.loads(contenido)
    except (json.JSONDecodeError, TypeError) as e:
        raise NivelFallidoError(f"{nivel}: JSON inválido ({e})")

    if not isinstance(datos, dict):
        raise NivelFallidoError(f"{nivel}: la respuesta no es un objeto JSON")

    tipo_falla = datos.get("tipo_falla")
    causa = datos.get("causa")
    comandos = datos.get("comandos")

    if not isinstance(tipo_falla, str) or not isinstance(causa, str) or not isinstance(comandos, list):
        raise NivelFallidoError(f"{nivel}: faltan claves o tipos incorrectos en la respuesta")
    if not all(isinstance(c, str) for c in comandos):
        raise NivelFallidoError(f"{nivel}: 'comandos' debe ser una lista de strings")

    # La lista blanca y comment=agente se aplican en clasificar(), por igual
    # para los 4 niveles (incluidas las reglas fijas).
    return ResultadoClasificacion(nivel=nivel, tipo_falla=tipo_falla, causa=causa, comandos=comandos)


# Puente con los nombres de bandera históricos (.env) hacia las claves de
# demo_config.json, para no tocar las 3 llamadas a _forzado() de más abajo.
_MAPA_BANDERAS = {
    "FORZAR_FALLO_GROQ": "forzar_fallo_groq",
    "FORZAR_FALLO_DEEPSEEK": "forzar_fallo_deepseek",
    "FORZAR_FALLO_OLLAMA": "forzar_fallo_ollama",
}


def _forzado(nombre_bandera: str) -> bool:
    clave = _MAPA_BANDERAS[nombre_bandera]
    return demo_config.leer().get(clave, False)


def _clasificar_con_groq(falla: Falla) -> ResultadoClasificacion:
    if _forzado("FORZAR_FALLO_GROQ"):
        raise NivelFallidoError("groq: forzado por FORZAR_FALLO_GROQ")
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise NivelFallidoError("groq: GROQ_API_KEY no configurada")

    timeout = int(os.getenv("TIMEOUT_GROQ_SEGUNDOS", "8"))
    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": _prompt_sistema()},
                    {"role": "user", "content": _prompt_usuario(falla)},
                ],
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "clasificacion_falla",
                        "strict": True,
                        "schema": _RESPUESTA_SCHEMA,
                    },
                },
                "temperature": 0,
            },
            timeout=timeout,
        )
        resp.raise_for_status()
        contenido = resp.json()["choices"][0]["message"]["content"]
    except requests.RequestException as e:
        raise NivelFallidoError(f"groq: error de red/timeout ({e})")
    except (KeyError, IndexError, ValueError) as e:
        raise NivelFallidoError(f"groq: respuesta inesperada ({e})")

    return _validar_json("groq", contenido)


def _clasificar_con_deepseek(falla: Falla) -> ResultadoClasificacion:
    if _forzado("FORZAR_FALLO_DEEPSEEK"):
        raise NivelFallidoError("deepseek: forzado por FORZAR_FALLO_DEEPSEEK")
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise NivelFallidoError("deepseek: DEEPSEEK_API_KEY no configurada")

    timeout = int(os.getenv("TIMEOUT_DEEPSEEK_SEGUNDOS", "10"))
    try:
        resp = requests.post(
            "https://api.deepseek.com/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": DEEPSEEK_MODEL,
                "messages": [
                    {"role": "system", "content": _prompt_sistema()},
                    {"role": "user", "content": _prompt_usuario(falla)},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0,
            },
            timeout=timeout,
        )
        resp.raise_for_status()
        contenido = resp.json()["choices"][0]["message"]["content"]
    except requests.RequestException as e:
        raise NivelFallidoError(f"deepseek: error de red/timeout ({e})")
    except (KeyError, IndexError, ValueError) as e:
        raise NivelFallidoError(f"deepseek: respuesta inesperada ({e})")

    return _validar_json("deepseek", contenido)


def _clasificar_con_ollama(falla: Falla) -> ResultadoClasificacion:
    if _forzado("FORZAR_FALLO_OLLAMA"):
        raise NivelFallidoError("ollama: forzado por FORZAR_FALLO_OLLAMA")

    timeout = int(os.getenv("TIMEOUT_OLLAMA_SEGUNDOS", "45"))
    try:
        resp = requests.post(
            f"{OLLAMA_HOST}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": _prompt_sistema()},
                    {"role": "user", "content": _prompt_usuario(falla)},
                ],
                "format": _RESPUESTA_SCHEMA,
                "stream": False,
                "options": {"temperature": 0},
            },
            timeout=timeout,
        )
        resp.raise_for_status()
        contenido = resp.json()["message"]["content"]
    except requests.RequestException as e:
        raise NivelFallidoError(f"ollama: error de red/timeout ({e})")
    except (KeyError, ValueError) as e:
        raise NivelFallidoError(f"ollama: respuesta inesperada ({e})")

    return _validar_json("ollama", contenido)


_NIVELES = [
    ("groq", _clasificar_con_groq),
    ("deepseek", _clasificar_con_deepseek),
    ("ollama", _clasificar_con_ollama),
    ("reglas", clasificar_con_reglas),
]


def clasificar(falla: Falla, ips_protegidas: frozenset[str] = frozenset()) -> ResultadoClasificacion:
    for nombre_nivel, funcion in _NIVELES:
        try:
            resultado = funcion(falla)
            # comment=agente y la lista blanca se aplican aquí, por igual para
            # los 4 niveles: un comando fuera de forma cuenta como fallo del
            # nivel y se prueba el siguiente, igual que un JSON inválido.
            resultado.comandos = normalizar_comandos(resultado.comandos)
            validar_comandos_permitidos(resultado.comandos, ips_protegidas)

            logging.info(
                "Falla %s/%s clasificada por nivel=%s",
                falla.dispositivo, falla.tipo, nombre_nivel,
            )
            return resultado
        except NivelFallidoError as e:
            logging.warning("Nivel %s falló, probando siguiente: %s", nombre_nivel, e)
        except ComandoNoPermitidoError as e:
            logging.warning(
                "Nivel %s propuso comandos fuera de la lista blanca, probando siguiente: %s",
                nombre_nivel, e,
            )

    raise RuntimeError("Todos los niveles fallaron, incluidas las reglas fijas (no debería pasar)")
