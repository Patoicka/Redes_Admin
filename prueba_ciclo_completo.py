"""Valida el ciclo de monitoreo ya conectado a la cascada: deshabilita ether3
"a mano" (simulando que algo externo rompió la interfaz) y deja que el propio
ejecutar_ciclo la detecte, clasifique y corrija sin más intervención; el
segundo ciclo debe confirmar la resolución y marcar el evento como corregido.
"""

import conexion
from monitoreo import EstadoMonitoreo, ejecutar_ciclo, obtener_eventos

INTERFAZ_PRUEBA = "ether3"


def interfaz_deshabilitada(r1: dict) -> bool:
    valor = conexion.leer_estado(
        r1, f":put [/interface get [find name={INTERFAZ_PRUEBA}] disabled]"
    )
    return valor.strip().lower() == "true"


def main() -> None:
    r1 = conexion.obtener_dispositivo("R1")
    estado = EstadoMonitoreo()

    print(f"--- Rompiendo {INTERFAZ_PRUEBA} manualmente (simula una falla externa) ---")
    conexion.aplicar_correccion(r1, [f"/interface disable {INTERFAZ_PRUEBA}"])
    assert interfaz_deshabilitada(r1)

    print("\n--- Ciclo 1: debe detectar, clasificar y corregir automáticamente ---")
    ejecutar_ciclo(estado)
    if not interfaz_deshabilitada(r1):
        print(f"OK: {INTERFAZ_PRUEBA} ya quedó habilitada por el propio ciclo.")
    else:
        print(f"ADVERTENCIA: {INTERFAZ_PRUEBA} sigue deshabilitada tras el ciclo 1.")

    print("\n--- Ciclo 2: debe confirmar la resolución ---")
    ejecutar_ciclo(estado)

    print("\n--- Eventos registrados ---")
    for evento in obtener_eventos():
        print(evento)

    eventos_ether3 = [e for e in obtener_eventos() if e.interfaz == INTERFAZ_PRUEBA]
    assert len(eventos_ether3) == 2, f"Se esperaban 2 eventos (NUEVA+RESUELTA), hay {len(eventos_ether3)}"
    nueva, resuelta = eventos_ether3
    assert nueva.estado == "NUEVA" and resuelta.estado == "RESUELTA"
    assert resuelta.corregido is True, f"Se esperaba corregido=True, quedó en {resuelta.corregido}"
    assert nueva.notificado, "El evento NUEVA debía notificarse por Telegram"
    assert resuelta.notificado, "El evento RESUELTA debía notificarse por Telegram"
    print("\nOK: NUEVA y RESUELTA quedaron registrados, corregido=True y notificado=True en ambos.")


if __name__ == "__main__":
    main()
