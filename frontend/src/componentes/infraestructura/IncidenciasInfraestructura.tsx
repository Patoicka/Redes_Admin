import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { nombreNivel, nombreTipo, tiempoDesde } from "../../formato";
import type { FallaActiva } from "../../tipos";

const LIMITE = 4;

interface Props {
  fallas: FallaActiva[];
  onVerTodas?: () => void;
}

export default function IncidenciasInfraestructura({ fallas, onVerTodas }: Props) {
  const visibles = fallas.slice(0, LIMITE);

  return (
    <div className="rounded-2xl bg-card ring-1 ring-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="text-sm font-medium text-ink">
            Incidencias de infraestructura
            <span className="ml-1.5 text-ink-3">({fallas.length})</span>
          </p>
          <p className="mt-0.5 text-xs text-ink-4">Incidencias activas en dispositivos monitoreados</p>
        </div>
        {onVerTodas && (
          <button
            type="button"
            onClick={onVerTodas}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-3 transition-colors hover:text-accent"
          >
            Ver todas
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {fallas.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tag-ok text-ok">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <p className="text-sm text-ink-3">
            Todos los dispositivos monitoreados se encuentran sin incidencias activas
            registradas.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line/70">
          {visibles.map((f) => (
            <li key={f.id_falla} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tag-danger text-danger">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-[6rem]">
                <p className="text-sm font-semibold text-ink">{f.dispositivo}</p>
                <p className="text-[11px] text-ink-4">{nombreNivel(f.nivel)}</p>
              </div>
              <span className="rounded-md bg-tag-danger px-2 py-0.5 text-[11px] font-semibold text-danger">
                {nombreTipo(f.tipo)}
              </span>
              <span className="mono text-xs text-ink-3">{f.interfaz ?? "—"}</span>
              <span className="ml-auto text-xs text-ink-4">hace {tiempoDesde(f.desde)}</span>
            </li>
          ))}
          {fallas.length > LIMITE && onVerTodas && (
            <li className="px-5 py-2.5 text-center">
              <button
                type="button"
                onClick={onVerTodas}
                className="text-xs text-ink-4 transition-colors hover:text-accent"
              >
                +{fallas.length - LIMITE} más en Incidencias
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
