"""Modelos de respuesta de la API. Los nombres y la forma calzan 1:1 con
tipos.ts del frontend.
"""

from pydantic import BaseModel


class FallaBanner(BaseModel):
    dispositivo: str
    interfaz: str | None


class Banner(BaseModel):
    estado: str  # "ok" | "alerta"
    fallas: list[FallaBanner]


class Indicadores(BaseModel):
    fallas_detectadas: int
    pct_corregidas: float
    promedio_resolucion_segundos: float | None
    notificaciones_enviadas: int


class FallaActiva(BaseModel):
    id_falla: str
    dispositivo: str
    tipo: str
    interfaz: str | None
    desde: str
    nivel: str | None
    comandos_aplicados: list[str]


class Equipo(BaseModel):
    nombre: str
    ip: str
    rol: str
    en_linea: bool | None
    ultima_revision: str | None


class FilaHistorial(BaseModel):
    id_falla: str
    detectada: str
    dispositivo: str
    falla: str
    interfaz: str | None
    clasifico: str | None
    accion: list[str]
    origen: str | None = None
    duracion_segundos: float | None
    estado: str


class Tablero(BaseModel):
    hora_servidor: str
    banner: Banner
    indicadores: Indicadores
    fallas_activas: list[FallaActiva]
    equipos: list[Equipo]
    niveles: dict[str, int]
    historial: list[FilaHistorial]
    telegram_configurado: bool
