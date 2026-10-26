"""Config que clasificacion._forzado() relee del disco en cada llamada, para
que el panel de demo (vía la API) pueda forzar el fallo de un nivel de la
cascada sin reiniciar monitoreo.py: a diferencia de .env (python-dotenv solo
lo carga una vez al importar el proceso), este archivo se abre de nuevo en
cada clasificación.

monitoreo.py sigue siendo un proceso aparte: si no existe demo_config.json
(porque la API nunca se usó), los tres flags son False, igual que hoy.
"""

import json
from pathlib import Path

RUTA = Path(__file__).parent / "demo_config.json"

_DEFAULT = {
    "forzar_fallo_groq": False,
    "forzar_fallo_deepseek": False,
    "forzar_fallo_ollama": False,
}


def leer() -> dict:
    if not RUTA.exists():
        return dict(_DEFAULT)
    with open(RUTA, "r", encoding="utf-8") as f:
        datos = json.load(f)
    return {**_DEFAULT, **datos}


def escribir(cambios: dict) -> dict:
    actual = leer()
    actual.update({k: v for k, v in cambios.items() if k in _DEFAULT})
    with open(RUTA, "w", encoding="utf-8") as f:
        json.dump(actual, f, ensure_ascii=False, indent=2)
    return actual
