import { visualEscenario } from "./escenariosDemo";
import type { FilaHistorial, ResumenRestauracion, Tablero } from "./tipos";

export interface SeguimientoActivo {
  escenarioId: string;
  escenarioNombre: string;
  solicitadoEn: string;
  idsPrevios: string[];
  /** Solo en escenarios sin falla propia: lo que el backend dice que hizo. */
  resumen?: ResumenRestauracion | null;
  /** Falla de IP fuera de VLAN que seguía activa al restaurar, para seguirla hasta Resuelta. */
  idFallaRelacionada?: string | null;
}

function coincideEscenario(fila: FilaHistorial, escenarioId: string): boolean {
  const visual = visualEscenario(escenarioId);
  if (visual.equipo && fila.dispositivo !== visual.equipo) return false;
  if (visual.tipoApi && fila.falla !== visual.tipoApi) return false;
  if (visual.interfaz && fila.interfaz !== visual.interfaz) return false;
  return true;
}

export function encontrarFilaSeguimiento(
  seguimiento: SeguimientoActivo,
  historial: FilaHistorial[],
): FilaHistorial | null {
  const prev = new Set(seguimiento.idsPrevios);
  const desde = Date.parse(seguimiento.solicitadoEn) - 15_000;

  const candidatas = historial.filter((f) => {
    if (!coincideEscenario(f, seguimiento.escenarioId)) return false;
    if (!prev.has(f.id_falla)) return true;
    return f.estado === "Activa" && Date.parse(f.detectada) >= desde;
  });

  if (candidatas.length === 0) return null;
  return candidatas[0];
}

/** True mientras hay una prueba en curso que aún no figura como Resuelta. */
export function seguimientoEnCurso(
  seguimiento: SeguimientoActivo | null,
  tablero: Tablero,
): boolean {
  if (!seguimiento) return false;
  const visual = visualEscenario(seguimiento.escenarioId);
  if (!visual.generaFalla) return false;
  const fila = encontrarFilaSeguimiento(seguimiento, tablero.historial);
  return !fila || fila.estado !== "Resuelta";
}

/** True si el seguimiento ya terminó (Resuelta) o no genera falla. */
export function seguimientoFinalizado(
  seguimiento: SeguimientoActivo | null,
  tablero: Tablero,
): boolean {
  if (!seguimiento) return false;
  return !seguimientoEnCurso(seguimiento, tablero);
}

const AGENTE_STALE_MS = 90_000;

export function agentePareceActivo(tablero: Tablero, desdeIso: string): boolean {
  const desde = Date.parse(desdeIso);
  const revisiones = tablero.equipos
    .map((e) => (e.ultima_revision ? Date.parse(e.ultima_revision) : NaN))
    .filter((t) => !Number.isNaN(t));
  if (revisiones.length === 0) return false;
  const masReciente = Math.max(...revisiones);
  return masReciente >= desde - 5_000 || Date.now() - masReciente < AGENTE_STALE_MS;
}
