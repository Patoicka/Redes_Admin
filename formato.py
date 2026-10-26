"""Utilidades de formato compartidas entre monitoreo.py (mensajes de Telegram)
y la API/frontend, para que ambos muestren la duración exactamente igual.
"""

import math


def formatear_duracion(segundos: float | None) -> str:
    if segundos is None or (isinstance(segundos, float) and math.isnan(segundos)):
        return ""
    segundos = int(segundos)
    minutos, segundos = divmod(segundos, 60)
    horas, minutos = divmod(minutos, 60)
    if horas:
        return f"{horas} h {minutos} min {segundos} s"
    if minutos:
        return f"{minutos} min {segundos} s"
    return f"{segundos} s"
