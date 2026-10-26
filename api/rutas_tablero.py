"""GET /api/tablero: todo lo que necesita la pantalla principal, en una sola
lectura de eventos.jsonl + estado_equipos.json + dispositivos.yaml, para que
las secciones 1-6 reflejen exactamente el mismo instante.
"""

import os
from datetime import datetime

from fastapi import APIRouter

import conexion
import tablero
from equipos import leer_estado as leer_estado_equipos
from registro import leer_eventos

from .esquemas import (
    Banner,
    Equipo,
    FallaActiva,
    FallaBanner,
    FilaHistorial,
    Indicadores,
    Tablero,
)

router = APIRouter()


def _construir_tablero() -> Tablero:
    eventos = leer_eventos()
    filas = tablero.construir_filas_falla(eventos)
    activas = sorted(
        (f for f in filas if f["estado"] == "Activa"),
        key=lambda f: f["hora_nueva"], reverse=True,
    )
    resumen = tablero.resumen(filas, eventos)

    banner = Banner(
        estado="alerta" if activas else "ok",
        fallas=[FallaBanner(dispositivo=f["dispositivo"], interfaz=f["interfaz"]) for f in activas],
    )
    indicadores = Indicadores(
        fallas_detectadas=resumen["total"],
        pct_corregidas=resumen["pct_corregidas"],
        promedio_resolucion_segundos=resumen["promedio_resolucion"],
        notificaciones_enviadas=resumen["notificaciones"],
    )
    fallas_activas = [
        FallaActiva(
            id_falla=f["id_falla"],
            dispositivo=f["dispositivo"],
            tipo=f["tipo"],
            interfaz=f["interfaz"],
            desde=f["hora_nueva"],
            nivel=f["nivel"],
            comandos_aplicados=f["comandos_aplicados"],
        )
        for f in activas
    ]

    estados_equipos = leer_estado_equipos()
    equipos = [
        Equipo(
            nombre=nombre,
            ip=dispositivo["ip_gestion"],
            rol=dispositivo.get("rol", ""),
            en_linea=estados_equipos.get(nombre, {}).get("responde"),
            ultima_revision=estados_equipos.get(nombre, {}).get("ultima_revision"),
        )
        for nombre, dispositivo in conexion.cargar_dispositivos().items()
    ]

    niveles = tablero.conteo_por_nivel(filas)

    historial = [
        FilaHistorial(
            id_falla=f["id_falla"],
            detectada=f["hora_nueva"],
            dispositivo=f["dispositivo"],
            falla=f["tipo"],
            interfaz=f["interfaz"],
            clasifico=f["nivel"],
            accion=f["comandos_aplicados"],
            origen=f["origen"],
            duracion_segundos=f["duracion_segundos"],
            estado=f["estado"],
        )
        for f in sorted(filas, key=lambda f: f["hora_nueva"], reverse=True)
    ]

    telegram_configurado = bool(os.getenv("TELEGRAM_BOT_TOKEN")) and bool(os.getenv("TELEGRAM_CHAT_ID"))

    return Tablero(
        hora_servidor=datetime.now().isoformat(timespec="seconds"),
        banner=banner,
        indicadores=indicadores,
        fallas_activas=fallas_activas,
        equipos=equipos,
        niveles=niveles,
        historial=historial,
        telegram_configurado=telegram_configurado,
    )


@router.get("/tablero", response_model=Tablero)
def obtener_tablero() -> Tablero:
    return _construir_tablero()
