"""Estado de equipos: estado_equipos.json se sobrescribe completo en cada
ciclo de monitoreo.py (es una foto del momento, no un historial) y lo lee
la API para el tablero web.
"""

import json
from pathlib import Path

RUTA_ESTADO = Path(__file__).parent / "estado_equipos.json"


def escribir_estado(estados: dict[str, dict]) -> None:
    with open(RUTA_ESTADO, "w", encoding="utf-8") as f:
        json.dump(estados, f, ensure_ascii=False, indent=2)


def leer_estado() -> dict[str, dict]:
    if not RUTA_ESTADO.exists():
        return {}
    with open(RUTA_ESTADO, "r", encoding="utf-8") as f:
        return json.load(f)
