"""Fase 1: prueba de conexión y corrección básica contra R1.

1. Imprime el estado de las interfaces.
2. Deshabilita una interfaz de prueba (no ether1) y verifica el cambio.
3. La vuelve a habilitar y confirma que quedó activa.
4. Verifica que un comando sobre ether1 sea rechazado por conexion.py.
"""

from conexion import (
    ComandoNoPermitidoError,
    aplicar_correccion,
    leer_estado,
    obtener_dispositivo,
)

INTERFAZ_PRUEBA = "ether3"


def mostrar_interfaces(dispositivo: dict) -> None:
    print("\n--- Estado de interfaces (print terse) ---")
    print(leer_estado(dispositivo, "/interface print terse"))


def interfaz_esta_deshabilitada(dispositivo: dict, nombre_interfaz: str) -> bool:
    # Salida "as-value": devuelve literalmente "true" o "false", sin tabla que parsear.
    # Nota: ":put" es necesario porque "/interface get ... disabled" sin él no
    # imprime nada en una sesión SSH no interactiva (sí lo hace en terminal manual).
    valor = leer_estado(
        dispositivo, f":put [/interface get [find name={nombre_interfaz}] disabled]"
    )
    return valor.strip().lower() == "true"


def main() -> None:
    r1 = obtener_dispositivo("R1")

    mostrar_interfaces(r1)

    print(f"\n--- Deshabilitando {INTERFAZ_PRUEBA} ---")
    aplicar_correccion(r1, [f"/interface disable {INTERFAZ_PRUEBA}"])
    if interfaz_esta_deshabilitada(r1, INTERFAZ_PRUEBA):
        print(f"OK: {INTERFAZ_PRUEBA} quedó deshabilitada.")
    else:
        print(f"ADVERTENCIA: {INTERFAZ_PRUEBA} no se deshabilitó como se esperaba.")

    print(f"\n--- Habilitando nuevamente {INTERFAZ_PRUEBA} ---")
    aplicar_correccion(r1, [f"/interface enable {INTERFAZ_PRUEBA}"])
    if not interfaz_esta_deshabilitada(r1, INTERFAZ_PRUEBA):
        print(f"OK: {INTERFAZ_PRUEBA} quedó habilitada nuevamente.")
    else:
        print(f"ADVERTENCIA: {INTERFAZ_PRUEBA} sigue deshabilitada.")

    print("\n--- Probando protección de ether1 (debe rechazarse) ---")
    try:
        aplicar_correccion(r1, ["/interface disable ether1"])
        print("ERROR: el comando sobre ether1 NO fue rechazado (revisar validación).")
    except ComandoNoPermitidoError as e:
        print(f"OK: comando rechazado correctamente -> {e}")


if __name__ == "__main__":
    main()
