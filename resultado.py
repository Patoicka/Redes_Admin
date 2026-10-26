"""Resultado común de cualquier nivel de la cascada de clasificación."""

from dataclasses import dataclass


@dataclass
class ResultadoClasificacion:
    nivel: str  # "groq" | "deepseek" | "ollama" | "reglas"
    tipo_falla: str
    causa: str
    comandos: list[str]
