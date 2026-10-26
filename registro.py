"""Persistencia de eventos a un archivo JSON Lines (un evento por línea),
para que la API del tablero (api/) los lea. JSON Lines en vez de CSV porque
EventoFalla tiene un campo de lista (comandos_aplicados); así se guarda tal
cual, sin inventar un separador propio dentro de una celda CSV.
"""

import json
from dataclasses import asdict
from pathlib import Path

RUTA_EVENTOS = Path(__file__).parent / "eventos.jsonl"


def escribir_evento(evento) -> None:
    with open(RUTA_EVENTOS, "a", encoding="utf-8") as f:
        f.write(json.dumps(asdict(evento), ensure_ascii=False) + "\n")


def leer_eventos() -> list[dict]:
    if not RUTA_EVENTOS.exists():
        return []
    eventos = []
    with open(RUTA_EVENTOS, "r", encoding="utf-8") as f:
        for linea in f:
            # Una línea sin "\n" final es un evento que el agente está
            # escribiendo en este instante: se leerá completo en la próxima.
            if not linea.endswith("\n"):
                break
            linea = linea.strip()
            if linea:
                eventos.append(json.loads(linea))
    return eventos
