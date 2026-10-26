// Cálculos derivados del payload de /api/tablero, hechos en el cliente para
// no tener que tocar el backend solo por un cambio de capa visual: el
// bucket de tiempo, los porcentajes por nivel, el conteo de equipos en
// línea, la topología y el CSV salen todos de `historial`/`equipos`, que la
// API ya entrega completos.

import {
  NIVEL_COLOR_DONA,
  NIVEL_COLOR_PILDORA_BG,
  NIVEL_COLOR_PILDORA_TEXTO,
  NIVEL_DISPLAY,
  NIVEL_ORDEN,
} from "./colores";
import { formatearDuracion, nombreNivel, nombreTipo, textoSoloNotificacion } from "./formato";
import type { Equipo, FilaHistorial } from "./tipos";

// --- "Fallas en el tiempo" ---

export interface PuntoSerie {
  etiqueta: string;
  valor: number;
}

export function bucketFallasPorHora(historial: FilaHistorial[]): PuntoSerie[] {
  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const finDia = new Date(inicioDia);
  finDia.setDate(finDia.getDate() + 1);

  const conteos = new Array(24).fill(0);
  for (const fila of historial) {
    const fecha = new Date(fila.detectada);
    if (Number.isNaN(fecha.getTime()) || fecha < inicioDia || fecha >= finDia) continue;
    conteos[fecha.getHours()] += 1;
  }

  return conteos.map((valor, hora) => ({ etiqueta: `${String(hora).padStart(2, "0")}h`, valor }));
}

const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export function bucketFallasPorSemana(historial: FilaHistorial[]): PuntoSerie[] {
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(inicioHoy);
    fecha.setDate(fecha.getDate() - (6 - i));
    return fecha;
  });

  return dias.map((fecha) => {
    const finDia = new Date(fecha);
    finDia.setDate(finDia.getDate() + 1);
    const valor = historial.filter((fila) => {
      const d = new Date(fila.detectada);
      return !Number.isNaN(d.getTime()) && d >= fecha && d < finDia;
    }).length;
    const etiqueta = `${DIAS_SEMANA[fecha.getDay()]} ${String(fecha.getDate()).padStart(2, "0")}`;
    return { etiqueta, valor };
  });
}

// --- "Clasificación por nivel" ---

export interface NivelResumen {
  nivel: string;
  etiqueta: string;
  valor: number;
  porcentaje: number;
  colorDona: string;
  colorPildoraBg: string;
  colorPildoraTexto: string;
}

export function resumenNiveles(niveles: Record<string, number>): NivelResumen[] {
  const total = NIVEL_ORDEN.reduce((acc, n) => acc + (niveles[n] ?? 0), 0);
  return NIVEL_ORDEN.map((nivel) => {
    const valor = niveles[nivel] ?? 0;
    return {
      nivel,
      etiqueta: NIVEL_DISPLAY[nivel],
      valor,
      porcentaje: total > 0 ? (valor / total) * 100 : 0,
      colorDona: NIVEL_COLOR_DONA[nivel],
      colorPildoraBg: NIVEL_COLOR_PILDORA_BG[nivel],
      colorPildoraTexto: NIVEL_COLOR_PILDORA_TEXTO[nivel],
    };
  });
}

// --- Equipos en línea ---

export function contarEquiposEnLinea(equipos: Equipo[]): { enLinea: number; total: number } {
  return { enLinea: equipos.filter((e) => e.en_linea === true).length, total: equipos.length };
}

// --- Topología (cadena de gestión: R1 → SW1 → SW2) ---

const ORDEN_CADENA = ["R1", "SW1", "SW2"];

export function ordenarCadenaEquipos(equipos: Equipo[]): Equipo[] {
  return [...equipos].sort((a, b) => {
    const ia = ORDEN_CADENA.indexOf(a.nombre.toUpperCase());
    const ib = ORDEN_CADENA.indexOf(b.nombre.toUpperCase());
    if (ia === -1 && ib === -1) return a.nombre.localeCompare(b.nombre);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/** @deprecated Preferir ordenarCadenaEquipos; se mantiene por compatibilidad. */
export interface Topologia {
  hub: Equipo | null;
  hojas: Equipo[];
}

export function construirTopologia(equipos: Equipo[]): Topologia {
  if (equipos.length === 0) return { hub: null, hojas: [] };
  const cadena = ordenarCadenaEquipos(equipos);
  const hub = cadena.find((e) => e.rol.toLowerCase() === "router") ?? cadena[0];
  return { hub, hojas: cadena.filter((e) => e !== hub) };
}

// --- Exportar historial a CSV ---

function escaparCSV(valor: string): string {
  const limpio = valor.replace(/"/g, '""');
  return /[",\n]/.test(valor) ? `"${limpio}"` : limpio;
}

export function exportarHistorialCSV(
  filas: FilaHistorial[],
  nombreArchivo = "historial-fallas.csv",
): void {
  const encabezados = [
    "Detectada",
    "Dispositivo",
    "Falla",
    "Interfaz",
    "Clasificó",
    "Acción",
    "Duración",
    "Estado",
  ];

  const lineas = [
    encabezados.join(","),
    ...filas.map((f) =>
      [
        f.detectada,
        f.dispositivo,
        nombreTipo(f.falla),
        f.interfaz ?? "",
        nombreNivel(f.clasifico),
        f.accion.length > 0 ? f.accion.join(" | ") : textoSoloNotificacion(f.origen),
        formatearDuracion(f.duracion_segundos),
        f.estado,
      ]
        .map((v) => escaparCSV(String(v)))
        .join(","),
    ),
  ];

  // BOM al inicio para que Excel detecte UTF-8 y no rompa acentos/ñ.
  const csv = "﻿" + lineas.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
