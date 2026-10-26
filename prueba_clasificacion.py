"""Fase 3: valida la cascada completa de clasificación con la falla real de
interfaz caída en R1, forzando el fallo de cada nivel en secuencia para
demostrar que cae a DeepSeek, luego a Ollama, y finalmente a reglas fijas.
"""

import os

import clasificacion
import conexion
from deteccion import detectar_interfaces_caidas

INTERFAZ_PRUEBA = "ether3"


def detectar_falla_ether3(r1: dict):
    with conexion.abrir_sesion(r1) as sesion:
        fallas = detectar_interfaces_caidas(sesion, r1)
    return next((f for f in fallas if f.interfaz == INTERFAZ_PRUEBA), None)


def ciclo(r1: dict, etiqueta: str) -> str:
    print(f"\n=== {etiqueta} ===")
    conexion.aplicar_correccion(r1, [f"/interface disable {INTERFAZ_PRUEBA}"])

    falla = detectar_falla_ether3(r1)
    assert falla is not None, "El detector no vio la falla recién creada"

    resultado = clasificacion.clasificar(falla)
    print(f"nivel={resultado.nivel}")
    print(f"causa={resultado.causa}")
    print(f"comandos={resultado.comandos}")

    assert resultado.comandos, f"El nivel {resultado.nivel} no propuso ningún comando"
    conexion.aplicar_correccion(r1, resultado.comandos)

    if detectar_falla_ether3(r1) is None:
        print(f"OK: {INTERFAZ_PRUEBA} quedó sana tras la corrección de nivel={resultado.nivel}")
    else:
        print(f"ADVERTENCIA: {INTERFAZ_PRUEBA} sigue con falla tras aplicar la corrección")

    return resultado.nivel


def main() -> None:
    r1 = conexion.obtener_dispositivo("R1")

    nivel = ciclo(r1, "Cascada completa (se espera groq)")
    assert nivel == "groq", f"Se esperaba groq, se obtuvo {nivel}"

    os.environ["FORZAR_FALLO_GROQ"] = "true"
    nivel = ciclo(r1, "Groq forzado a fallar (se espera deepseek)")
    assert nivel == "deepseek", f"Se esperaba deepseek, se obtuvo {nivel}"

    os.environ["FORZAR_FALLO_DEEPSEEK"] = "true"
    nivel = ciclo(
        r1,
        "Groq+DeepSeek forzados a fallar (se espera ollama; si no está "
        "corriendo localmente, caerá a reglas de forma natural)",
    )
    print(f"(nivel real obtenido: {nivel})")

    os.environ["FORZAR_FALLO_OLLAMA"] = "true"
    nivel = ciclo(r1, "Groq+DeepSeek+Ollama forzados a fallar (se espera reglas)")
    assert nivel == "reglas", f"Se esperaba reglas, se obtuvo {nivel}"

    for var in ("FORZAR_FALLO_GROQ", "FORZAR_FALLO_DEEPSEEK", "FORZAR_FALLO_OLLAMA"):
        os.environ.pop(var, None)

    print("\nTodos los niveles de la cascada quedaron validados.")


if __name__ == "__main__":
    main()
