"""Endpoints del panel de demostración: escenarios fijos de red, interruptores
de fallo forzado para la cascada de IA, y limpieza del laboratorio.

Regla de seguridad: ningún endpoint de aquí acepta comandos desde el
navegador. Lo que se ejecuta en los equipos sale de demo_escenarios.py
(fijo, en el backend) o de limpiar_laboratorio.py (ya existente); ambos pasan
por conexion.py, que sigue protegiendo ether1 y la red de gestión.
"""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import conexion
import demo_config
import limpiar_laboratorio
from conexion import ComandoNoPermitidoError

from . import demo_escenarios

router = APIRouter(prefix="/demo")


class EscenarioInfo(BaseModel):
    id: str
    nombre: str
    descripcion: str
    disponible: bool


class FallasIA(BaseModel):
    groq: bool
    deepseek: bool
    ollama: bool


class FallasIAActualizar(BaseModel):
    groq: bool | None = None
    deepseek: bool | None = None
    ollama: bool | None = None


class ResultadoLimpieza(BaseModel):
    dispositivo: str
    ok: bool
    detalle: str


_MAPA_CLAVES = {"groq": "forzar_fallo_groq", "deepseek": "forzar_fallo_deepseek", "ollama": "forzar_fallo_ollama"}


def _a_fallas_ia(cfg: dict) -> FallasIA:
    return FallasIA(
        groq=cfg["forzar_fallo_groq"],
        deepseek=cfg["forzar_fallo_deepseek"],
        ollama=cfg["forzar_fallo_ollama"],
    )


@router.get("/escenarios", response_model=list[EscenarioInfo])
def listar_escenarios() -> list[EscenarioInfo]:
    return [
        EscenarioInfo(id=e.id, nombre=e.nombre, descripcion=e.descripcion, disponible=e.disponible)
        for e in demo_escenarios.ESCENARIOS.values()
    ]


@router.post("/escenarios/{id_escenario}")
def activar_escenario(id_escenario: str) -> dict:
    try:
        salida, resumen = demo_escenarios.ejecutar(id_escenario)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Escenario desconocido: {id_escenario}")
    except demo_escenarios.EscenarioNoDisponibleError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ComandoNoPermitidoError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logging.exception("Fallo ejecutando escenario %s", id_escenario)
        raise HTTPException(status_code=502, detail=f"No se pudo ejecutar en el equipo: {e}")
    return {"ejecutado": True, "salida": salida, "resumen": resumen}


@router.get("/fallas-ia", response_model=FallasIA)
def obtener_fallas_ia() -> FallasIA:
    return _a_fallas_ia(demo_config.leer())


@router.put("/fallas-ia", response_model=FallasIA)
def actualizar_fallas_ia(cambios: FallasIAActualizar) -> FallasIA:
    cambios_mapeados = {
        _MAPA_CLAVES[clave]: valor for clave, valor in cambios.model_dump(exclude_none=True).items()
    }
    return _a_fallas_ia(demo_config.escribir(cambios_mapeados))


@router.post("/limpiar-laboratorio", response_model=list[ResultadoLimpieza])
def limpiar_laboratorio_ruta() -> list[ResultadoLimpieza]:
    resultados = []
    for nombre, dispositivo in conexion.cargar_dispositivos().items():
        try:
            conteos = limpiar_laboratorio.limpiar_dispositivo(nombre, dispositivo)
            detalle = ", ".join(f"{desc}: {n}" for desc, n in conteos.items())
            resultados.append(ResultadoLimpieza(dispositivo=nombre, ok=True, detalle=detalle))
        except Exception as e:
            resultados.append(ResultadoLimpieza(dispositivo=nombre, ok=False, detalle=str(e)))
    return resultados
