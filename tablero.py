"""Lógica de datos del tablero usada por la API (FastAPI, ver api/).
Agrupa eventos.jsonl en una fila por falla (par NUEVA/RESUELTA) y calcula
los indicadores. Pura: sin dependencias de FastAPI, solo listas y dicts.
"""

NIVELES_ORDEN = ["groq", "deepseek", "ollama", "reglas"]


def construir_filas_falla(eventos: list[dict]) -> list[dict]:
    """Una fila por falla (par NUEVA/RESUELTA). Eventos nuevos se agrupan por
    id_falla; los viejos (sin ese campo) se emparejan por dispositivo+tipo+
    interfaz, en el orden en que aparecen."""
    filas: dict[str, dict] = {}
    orden: list[str] = []
    pendientes_legacy: dict[tuple, str] = {}

    for e in eventos:
        id_falla = e.get("id_falla")
        clave = (e["dispositivo"], e["tipo"], e["interfaz"])

        if e["estado"] == "NUEVA":
            if id_falla is None:
                id_falla = f"legacy-{len(orden)}"
                pendientes_legacy[clave] = id_falla
            filas[id_falla] = {
                "id_falla": id_falla,
                "dispositivo": e["dispositivo"],
                "tipo": e["tipo"],
                "interfaz": e["interfaz"],
                "nivel": e["nivel"],
                "comandos_aplicados": e["comandos_aplicados"],
                "origen": e.get("origen"),
                "hora_nueva": e["hora"],
                "hora_resuelta": None,
                "duracion_segundos": None,
                "corregida_automaticamente": e.get("corregido") is None,
                "estado": "Activa",
            }
            orden.append(id_falla)
        elif e["estado"] == "RESUELTA":
            objetivo = id_falla if id_falla is not None else pendientes_legacy.pop(clave, None)
            fila = filas.get(objetivo) if objetivo else None
            if fila is None:
                continue  # RESUELTA huérfana: no debería pasar en operación normal
            fila["hora_resuelta"] = e["hora"]
            fila["duracion_segundos"] = e["duracion_segundos"]
            fila["estado"] = "Resuelta"

    return [filas[i] for i in orden]


def resumen(filas: list[dict], eventos: list[dict]) -> dict:
    total = len(filas)
    resueltas = [f for f in filas if f["estado"] == "Resuelta"]
    corregidas_auto = sum(1 for f in resueltas if f["corregida_automaticamente"])
    pct_corregidas = (corregidas_auto / total * 100) if total else 0.0
    duraciones = [f["duracion_segundos"] for f in resueltas if f["duracion_segundos"] is not None]
    promedio = sum(duraciones) / len(duraciones) if duraciones else None
    notificaciones = sum(1 for e in eventos if e.get("notificado"))
    return {
        "total": total,
        "pct_corregidas": pct_corregidas,
        "promedio_resolucion": promedio,
        "notificaciones": notificaciones,
    }


def conteo_por_nivel(filas: list[dict]) -> dict[str, int]:
    conteos = {n: 0 for n in NIVELES_ORDEN}
    for f in filas:
        if f["nivel"] in conteos:
            conteos[f["nivel"]] += 1
    return conteos
