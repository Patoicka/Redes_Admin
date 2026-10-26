"""Nivel 4 de la cascada: reglas fijas, deterministas, sin IA.

Última línea de defensa: nunca falla la validación de comandos_permitidos.py
porque sus comandos salen literalmente de esa misma lista blanca.
"""

from deteccion import Falla
from resultado import ResultadoClasificacion


def clasificar_con_reglas(falla: Falla) -> ResultadoClasificacion:
    if falla.tipo == "interfaz_caida":
        return ResultadoClasificacion(
            nivel="reglas",
            tipo_falla=falla.tipo,
            causa="Interfaz deshabilitada o sin enlace (regla fija, sin IA).",
            comandos=[f"/interface enable {falla.interfaz}"],
        )

    if falla.tipo == "puerto_saturado":
        ip = falla.detalle.get("origen_ip")
        comandos = (
            [f"/queue simple add name=limite-{falla.interfaz} target={ip} max-limit=800k/800k"]
            if ip
            else []
        )
        return ResultadoClasificacion(
            nivel="reglas",
            tipo_falla=falla.tipo,
            causa="Tráfico cercano al límite de 1 Mbps (regla fija, sin IA).",
            comandos=comandos,
        )

    if falla.tipo == "ip_fuera_de_vlan":
        ip = falla.detalle.get("ip")
        comandos = (
            [
                f"/ip firewall address-list add list=cuarentena address={ip}",
                "/ip firewall filter add chain=forward src-address-list=cuarentena action=drop",
            ]
            if ip
            else []
        )
        return ResultadoClasificacion(
            nivel="reglas",
            tipo_falla=falla.tipo,
            causa=(
                "Host visto en VLAN incorrecta (regla fija, sin IA); no se puede "
                "corregir su IP, solo aislarlo."
            ),
            comandos=comandos,
        )

    return ResultadoClasificacion(
        nivel="reglas",
        tipo_falla=falla.tipo,
        causa="Tipo de falla no reconocido por las reglas fijas.",
        comandos=[],
    )
