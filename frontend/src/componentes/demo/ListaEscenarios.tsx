import { Loader2, Play } from "lucide-react";
import { visualEscenario } from "../../escenariosDemo";
import type { EscenarioInfo } from "../../tipos";

interface Props {
  escenarios: EscenarioInfo[];
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
  ejecutandoId: string | null;
  /** Desactiva todos los «Ejecutar» mientras una prueba no esté Resuelta. */
  bloqueado?: boolean;
  onEjecutar: (id: string) => void;
}

export default function ListaEscenarios({
  escenarios,
  seleccionadoId,
  onSeleccionar,
  ejecutandoId,
  bloqueado = false,
  onEjecutar,
}: Props) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-line">
      <div className="border-b border-line px-5 py-3.5">
        <p className="text-sm font-medium text-ink">Escenarios de prueba</p>
        <p className="mt-0.5 text-xs text-ink-4">
          {bloqueado
            ? "Prueba en curso: los botones se reactivan al marcarse como Resuelta."
            : "Selecciona uno para ver el detalle; ejecuta para seguirlo en vivo."}
        </p>
      </div>

      {escenarios.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-3">Cargando escenarios…</p>
      ) : (
        <ul className="grid gap-2 p-3 sm:grid-cols-2">
          {escenarios.map((e) => {
            const visual = visualEscenario(e.id);
            const Icono = visual.icono;
            const activo = seleccionadoId === e.id;
            const cargando = ejecutandoId === e.id;
            return (
              <li key={e.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSeleccionar(e.id)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      onSeleccionar(e.id);
                    }
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors duration-150 ${
                    activo
                      ? "border-accent/50 bg-accent/8 shadow-[0_0_0_1px_rgba(255,181,71,0.15)]"
                      : "border-line/80 bg-card-2/40 hover:border-ink-4 hover:bg-card-2/70"
                  }`}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: visual.colorBg, color: visual.color }}
                  >
                    <Icono className="h-4 w-4" strokeWidth={2} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{e.nombre}</p>
                    {!e.disponible && (
                      <p className="text-[10px] font-medium text-ink-4">No disponible</p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={
                      !e.disponible || cargando || ejecutandoId !== null || bloqueado
                    }
                    title={
                      bloqueado
                        ? "Espera a que la prueba actual se resuelva"
                        : e.disponible
                          ? "Ejecutar prueba"
                          : "No disponible"
                    }
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEjecutar(e.id);
                    }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-medium text-page transition-colors hover:bg-accent-hot disabled:cursor-not-allowed disabled:bg-card disabled:text-ink-4"
                  >
                    {cargando ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    {cargando ? "…" : "Ejecutar"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
