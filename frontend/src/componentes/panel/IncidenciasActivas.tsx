import { ArrowRight, CheckCircle2, Network, Router } from "lucide-react";
import { nombreNivel, nombreTipo, tiempoDesde } from "../../formato";
import type { FallaActiva } from "../../tipos";

interface Props {
  fallas: FallaActiva[];
  onVerTodas?: () => void;
}

function IconoDispositivo({ nombre }: { nombre: string }) {
  const esRouter = nombre.toUpperCase().startsWith("R");
  const Icono = esRouter ? Router : Network;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tag-danger text-danger">
      <Icono className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}

export default function IncidenciasActivas({ fallas, onVerTodas }: Props) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-line">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">
          Incidencias activas
          <span className="ml-1.5 text-ink-3">({fallas.length})</span>
        </p>
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
        <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tag-ok text-ok">
            <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <p className="text-sm font-medium text-ink-2">Sin incidencias activas</p>
          <p className="max-w-[220px] text-xs text-ink-4">
            La red no reporta fallas abiertas en este momento.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex-1 space-y-2.5 overflow-y-auto">
          {fallas.map((f) => (
            <li
              key={f.id_falla}
              className="rounded-xl border border-line/80 bg-card-2/50 px-3.5 py-3 transition-colors hover:border-line"
            >
              <div className="flex items-start gap-3">
                <IconoDispositivo nombre={f.dispositivo} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{f.dispositivo}</p>
                    <span className="rounded-md bg-tag-danger px-2 py-0.5 text-[11px] font-semibold text-danger">
                      {nombreTipo(f.tipo)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
                    <span>
                      Interfaz:{" "}
                      <span className="mono text-ink-2">{f.interfaz ?? "—"}</span>
                    </span>
                    <span>hace {tiempoDesde(f.desde)}</span>
                    <span>{nombreNivel(f.nivel)}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-4">
                    {f.comandos_aplicados.length > 0 ? (
                      <code className="mono break-all text-ink-3">
                        {f.comandos_aplicados.join(" · ")}
                      </code>
                    ) : (
                      "Solo notificación"
                    )}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
