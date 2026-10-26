"""Notificaciones por Telegram.

Reemplaza el intento con WhatsApp/Twilio (ver notificacion_twilio.py,
desactivado: la cuenta Trial de Twilio no recibe mensajes entrantes, así que
la ventana de 24h nunca se abre, y la Content API para usar plantillas
aprobadas también está bloqueada en Trial).

Mismas reglas que los demás niveles externos de la cascada: timeout corto, y
si falla no se lanza excepción hacia el ciclo de monitoreo — se devuelve
False y el evento queda registrado con notificado=False.
"""

import html
import logging
import os
from datetime import datetime

import requests
from dotenv import load_dotenv

load_dotenv()

TIMEOUT_SEGUNDOS = int(os.getenv("TIMEOUT_TELEGRAM_SEGUNDOS", "8"))


_TIPOS = {
    "interfaz_caida": ("🔌", "Interfaz caída"),
    "puerto_saturado": ("📈", "Puerto saturado"),
    "ip_fuera_de_vlan": ("🧭", "IP fuera de VLAN"),
}
_NIVELES = {"groq": "Groq", "deepseek": "DeepSeek", "ollama": "Ollama", "reglas": "Reglas fijas"}
_SEPARADOR = "━━━━━━━━━━━━━━━━"


def _e(valor) -> str:
    return html.escape(str(valor))


def _mbps(bps) -> str:
    return f"{float(bps) / 1_000_000:.2f} Mbps".replace(".", ",")


def _que_paso(falla) -> str:
    """Una frase con el dato que explica la falla, según su tipo."""
    d = falla.detalle
    if falla.tipo == "interfaz_caida":
        return "La interfaz estaba deshabilitada." if d.get("disabled") else (
            "La interfaz está habilitada pero sin enlace (revisar cable o extremo remoto)."
        )
    if falla.tipo == "puerto_saturado":
        pico = max(d.get("rx_bps", 0), d.get("tx_bps", 0))
        limite = d.get("limite_bps") or 1
        texto = f"Tráfico de {_mbps(pico)} sobre un límite de {_mbps(limite)} ({pico / limite:.0%})."
        if d.get("origen_torch"):
            texto += f"\n📍 <b>Origen:</b> <code>{_e(d['origen_torch'])}</code>"
        return texto
    if falla.tipo == "ip_fuera_de_vlan":
        return (
            f"Host <code>{_e(d.get('ip'))}</code> (MAC <code>{_e(d.get('mac'))}</code>) "
            f"conectado a {_e(falla.interfaz)}, que espera <code>{_e(d.get('subred_esperada'))}</code>."
        )
    return ""


def _accion(comandos: list[str]) -> str:
    if not comandos:
        return "Solo notificación: no hay una corrección segura para aplicar."
    if any(c.startswith("/interface enable") for c in comandos):
        return "Interfaz rehabilitada automáticamente."
    if any(c.startswith("/queue simple add") for c in comandos):
        return "Tráfico del origen limitado con una cola."
    if any(c.startswith("/ip firewall address-list add") for c in comandos):
        return "Host aislado en cuarentena en el firewall."
    return "Corrección aplicada."


def _texto_evento(
    falla, nivel: str | None, comandos: list[str], estado: str, duracion: str | None
) -> str:
    icono, nombre_tipo = _TIPOS.get(falla.tipo, ("⚠️", falla.tipo))
    ubicacion = f"<b>{_e(falla.dispositivo)}</b>"
    if falla.interfaz:
        ubicacion += f" · <code>{_e(falla.interfaz)}</code>"
    clasifico = _NIVELES.get(nivel, nivel or "desconocido")
    hora = datetime.now().strftime("%H:%M:%S")

    if estado == "RESUELTA":
        lineas = [
            f"✅ <b>Falla resuelta</b> · {icono} {_e(nombre_tipo)}",
            _SEPARADOR,
            f"🖥 {ubicacion}",
            f"⏱ <b>Duración:</b> {_e(duracion or '—')}",
            "🛠 " + ("Corregida por el agente." if comandos else "Dejó de observarse por sí sola."),
            f"🕒 {hora}",
        ]
        return "\n".join(lineas)

    lineas = [
        f"🔴 <b>Falla detectada</b> · {icono} {_e(nombre_tipo)}",
        _SEPARADOR,
        f"🖥 {ubicacion}",
        f"🔎 {_que_paso(falla)}",
        f"🧠 <b>Clasificó:</b> {_e(clasifico)}",
        f"🛠 <b>Acción:</b> {_accion(comandos)}",
    ]
    if comandos:
        lineas.append(
            "<blockquote expandable><b>Comandos</b>\n"
            + "\n".join(f"<code>{_e(c)}</code>" for c in comandos)
            + "</blockquote>"
        )
    lineas.append(f"🕒 {hora}")
    return "\n".join(lineas)


def notificar(
    falla,
    nivel: str | None,
    comandos: list[str],
    estado: str,
    duracion: str | None = None,
) -> bool:
    """Envía un mensaje a Telegram. Nunca lanza: devuelve True/False."""
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        logging.warning("notificacion: faltan TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID en .env")
        return False

    texto = _texto_evento(falla, nivel, comandos, estado, duracion)
    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": texto, "parse_mode": "HTML"},
            timeout=TIMEOUT_SEGUNDOS,
        )
        resp.raise_for_status()
        return True
    except requests.RequestException:
        logging.exception("notificacion: fallo enviando mensaje a Telegram")
        return False
