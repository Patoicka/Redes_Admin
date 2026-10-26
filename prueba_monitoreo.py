"""Fase 2: valida en vivo contra R1 lo único que se puede probar hoy sin SW1/VLANs:

1. Una sola sesión SSH por ciclo (compartida entre los detectores).
2. El detector de interfaz caída detecta cuando se deshabilita ether3.
3. Mientras la falla sigue activa, no se vuelve a notificar como "nueva".
4. Al rehabilitar la interfaz, se notifica como "resuelta".
5. La protección de la red de gestión rechaza un comando de firewall que
   apunte a 192.168.56.0/24, además del ya probado para ether1.
"""

import conexion
from conexion import ComandoNoPermitidoError
from deteccion import detectar_interfaces_caidas
from monitoreo import EstadoMonitoreo

INTERFAZ_PRUEBA = "ether3"


def ciclo_una_vez(estado: EstadoMonitoreo, dispositivo: dict):
    with conexion.abrir_sesion(dispositivo) as sesion:
        fallas = detectar_interfaces_caidas(sesion, dispositivo)
    return estado.actualizar_dispositivo(dispositivo["nombre"], fallas)


def main() -> None:
    r1 = conexion.obtener_dispositivo("R1")
    estado = EstadoMonitoreo()

    print("--- Ciclo inicial (debería estar sano) ---")
    nuevas, resueltas = ciclo_una_vez(estado, r1)
    print(f"nuevas={nuevas}\nresueltas={resueltas}")

    print(f"\n--- Deshabilitando {INTERFAZ_PRUEBA} ---")
    conexion.aplicar_correccion(r1, [f"/interface disable {INTERFAZ_PRUEBA}"])
    nuevas, _ = ciclo_una_vez(estado, r1)
    if any(f.interfaz == INTERFAZ_PRUEBA for f in nuevas):
        print(f"OK: se detectó como NUEVA la falla en {INTERFAZ_PRUEBA}: {nuevas}")
    else:
        print(f"ADVERTENCIA: no se detectó la falla nueva en {INTERFAZ_PRUEBA}.")

    print("\n--- Repitiendo ciclo con la falla aún activa (no debe re-notificar) ---")
    nuevas, resueltas = ciclo_una_vez(estado, r1)
    if not nuevas and not resueltas:
        print("OK: ningún evento nuevo mientras la falla sigue activa.")
    else:
        print(f"ADVERTENCIA: se esperaba silencio, se obtuvo nuevas={nuevas} resueltas={resueltas}")

    print(f"\n--- Habilitando nuevamente {INTERFAZ_PRUEBA} ---")
    conexion.aplicar_correccion(r1, [f"/interface enable {INTERFAZ_PRUEBA}"])
    _, resueltas = ciclo_una_vez(estado, r1)
    if any(f.interfaz == INTERFAZ_PRUEBA for f in resueltas):
        print(f"OK: se detectó como RESUELTA la falla en {INTERFAZ_PRUEBA}: {resueltas}")
    else:
        print(f"ADVERTENCIA: no se detectó la resolución en {INTERFAZ_PRUEBA}.")

    print("\n--- Probando protección de la red de gestión (debe rechazarse) ---")
    try:
        conexion.aplicar_correccion(
            r1,
            [
                "/ip firewall address-list add list=cuarentena address=192.168.56.5",
                "/ip firewall filter add chain=forward src-address-list=cuarentena action=drop",
            ],
        )
        print("ERROR: el comando sobre la red de gestión NO fue rechazado.")
    except ComandoNoPermitidoError as e:
        print(f"OK: comando rechazado correctamente -> {e}")


if __name__ == "__main__":
    main()
