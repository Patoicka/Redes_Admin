"""Borra en cada dispositivo únicamente lo que el agente creó (comment=agente):
queues simple, entradas de address-list y reglas de firewall. Para reiniciar
el laboratorio entre ensayos de la demo sin tocar nada configurado a mano.

No toca /interface (enable/disable no deja rastro que limpiar) ni nada sin
ese comentario exacto.
"""

import conexion

_OBJETOS = [
    ("/queue simple", "queues simple"),
    ("/ip firewall address-list", "entradas de address-list"),
    ("/ip firewall filter", "reglas de firewall"),
]


def limpiar_dispositivo(nombre: str, dispositivo: dict) -> dict[str, int]:
    """Devuelve cuántos objetos se borraron por categoría, para que tanto la
    CLI (main) como la API (ver api/rutas_demo.py) reporten lo mismo."""
    resultados: dict[str, int] = {}
    with conexion.abrir_sesion(dispositivo) as sesion:
        for ruta, descripcion in _OBJETOS:
            script = (
                ':local borrados 0;'
                f':foreach o in=[{ruta} find comment="agente"] do={{'
                f'{ruta} remove $o;'
                ':set borrados ($borrados + 1)'
                '};'
                ':put $borrados'
            )
            # A veces el prompt de RouterOS viene pegado tras el número.
            salida = sesion.leer_estado(script).split()
            resultados[descripcion] = int(salida[0]) if salida and salida[0].isdigit() else 0
    return resultados


def main() -> None:
    for nombre, dispositivo in conexion.cargar_dispositivos().items():
        print(f"--- {nombre} ---")
        try:
            resultados = limpiar_dispositivo(nombre, dispositivo)
            for descripcion, cantidad in resultados.items():
                print(f"  {descripcion} borradas: {cantidad}")
        except Exception as e:
            print(f"  ERROR limpiando {nombre}: {e}")


if __name__ == "__main__":
    main()
