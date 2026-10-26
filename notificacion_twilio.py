"""DESACTIVADO. Notificación por WhatsApp vía Twilio — no está conectado a
monitoreo.py (ver notificacion.py, que usa Telegram en su lugar).

Se deja aquí por si se retoma más adelante. Para que funcione hacen falta dos
cosas que la cuenta Trial actual no permite:
1. Abrir la ventana de 24h del sandbox (requiere que los mensajes entrantes del
   usuario SÍ lleguen a la cuenta; en las pruebas no llegaron).
2. O, para mensajes fuera de esa ventana, usar una plantilla aprobada vía
   Content API — bloqueada en cuentas Trial (confirmado: GET
   https://content.twilio.com/v1/Content devuelve 401 "not available on a
   Trial account").

Variables usadas (siguen en .env): TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
TWILIO_WHATSAPP_FROM, WHATSAPP_TO.
"""

import logging
import os

import requests
from dotenv import load_dotenv

load_dotenv()

TIMEOUT_SEGUNDOS = int(os.getenv("TIMEOUT_TWILIO_SEGUNDOS", "8"))


def _texto_evento(falla, nivel: str | None, comandos: list[str], estado: str) -> str:
    return (
        f"[{estado}] Agente de red\n"
        f"Dispositivo: {falla.dispositivo}\n"
        f"Falla: {falla.tipo}\n"
        f"Interfaz: {falla.interfaz}\n"
        f"Clasificado por: {nivel or 'desconocido'}\n"
        f"Comandos aplicados: {', '.join(comandos) if comandos else '(ninguno)'}"
    )


def notificar_whatsapp_libre(falla, nivel: str | None, comandos: list[str], estado: str) -> bool:
    """Mensaje libre (Body). Solo funciona dentro de la ventana de 24h del
    sandbox. Hoy falla con error 21654 (ContentSid Required) porque la
    ventana nunca se abrió."""
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    remitente = os.getenv("TWILIO_WHATSAPP_FROM")
    destinatario = os.getenv("WHATSAPP_TO")
    if not all([account_sid, auth_token, remitente, destinatario]):
        logging.warning("notificacion_twilio: faltan variables TWILIO_*/WHATSAPP_TO en .env")
        return False

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    try:
        resp = requests.post(
            url,
            auth=(account_sid, auth_token),
            data={
                "From": remitente,
                "To": destinatario,
                "Body": _texto_evento(falla, nivel, comandos, estado),
            },
            timeout=TIMEOUT_SEGUNDOS,
        )
        resp.raise_for_status()
        return True
    except requests.RequestException:
        logging.exception("notificacion_twilio: fallo enviando WhatsApp")
        return False


def notificar_whatsapp_plantilla(
    content_sid: str, content_variables: dict[str, str]
) -> bool:
    """Mensaje con plantilla aprobada (ContentSid), para fuera de la ventana
    de 24h. Requiere salir de Trial para poder consultar/crear plantillas vía
    Content API; no se ha podido obtener un ContentSid válido todavía."""
    import json

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    remitente = os.getenv("TWILIO_WHATSAPP_FROM")
    destinatario = os.getenv("WHATSAPP_TO")
    if not all([account_sid, auth_token, remitente, destinatario]):
        logging.warning("notificacion_twilio: faltan variables TWILIO_*/WHATSAPP_TO en .env")
        return False

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    try:
        resp = requests.post(
            url,
            auth=(account_sid, auth_token),
            data={
                "From": remitente,
                "To": destinatario,
                "ContentSid": content_sid,
                "ContentVariables": json.dumps(content_variables),
            },
            timeout=TIMEOUT_SEGUNDOS,
        )
        resp.raise_for_status()
        return True
    except requests.RequestException:
        logging.exception("notificacion_twilio: fallo enviando WhatsApp con plantilla")
        return False
