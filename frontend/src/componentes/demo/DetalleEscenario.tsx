import { ArrowRight, Clock, FlaskConical, Info } from "lucide-react";
import { visualEscenario } from "../../escenariosDemo";
import type { EscenarioInfo } from "../../tipos";

interface Props {
  escenario: EscenarioInfo | null;
  onVerIncidencias?: () => void;
}

export default function DetalleEscenario({ escenario, onVerIncidencias }: Props) {
  if (!escenario) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-card px-6 py-10 text-center ring-1 ring-line">
        <FlaskConical className="h-8 w-8 text-ink-4" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-ink-2">Sin escenario seleccionado</p>
        <p className="mt-1 max-w-sm text-xs text-ink-4">
          Elige una prueba arriba para revisar su descripción antes de ejecutarla.
        </p>
      </div>
    );
  }

  const visual = visualEscenario(escenario.id);
  const Icono = visual.icono;

  return (
    <div className="rounded-2xl bg-card ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: visual.colorBg, color: visual.color }}
          >
            <Icono className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-medium text-ink-4">Detalle del escenario</p>
            <p className="text-base font-semibold text-ink">{escenario.nombre}</p>
          </div>
        </div>
        {onVerIncidencias && (
          <button
            type="button"
            onClick={onVerIncidencias}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-3 transition-colors hover:text-accent"
          >
            Ir a Incidencias
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="grid gap-5 px-5 py-4 lg:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-ink-4 uppercase">Descripción</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{escenario.descripcion}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visual.equipo && (
              <span className="rounded-md bg-card-2 px-2 py-0.5 text-[11px] font-medium text-ink-2 ring-1 ring-line">
                Equipo: {visual.equipo}
              </span>
            )}
            <span className="rounded-md bg-card-2 px-2 py-0.5 text-[11px] font-medium text-ink-2 ring-1 ring-line">
              {visual.tipo}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ${
                escenario.disponible
                  ? "bg-tag-ok text-ok ring-ok/20"
                  : "bg-card-2 text-ink-4 ring-line"
              }`}
            >
              {escenario.disponible ? "Disponible" : "No disponible"}
            </span>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium tracking-wide text-ink-4 uppercase">
            Proceso esperado
          </p>
          <ol className="mt-2 space-y-1.5">
            {visual.pasos.map((paso, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-ink-3">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: visual.colorBg, color: visual.color }}
                >
                  {i + 1}
                </span>
                {paso}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="space-y-2 border-t border-line px-5 py-3">
        <div className="flex gap-2 rounded-xl border border-info/20 bg-card-2/50 px-3 py-2.5">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p className="text-xs leading-relaxed text-ink-3">
            El agente revisa la infraestructura de forma continua: la falla aparece en cuanto la
            detecta en un ciclo de monitoreo.
          </p>
        </div>
        {visual.notas.map((nota) => (
          <div
            key={nota}
            className="flex gap-2 rounded-xl border border-line bg-card-2/30 px-3 py-2.5"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />
            <p className="text-xs leading-relaxed text-ink-3">{nota}</p>
          </div>
        ))}
        <p className="text-[11px] text-ink-4">
          Estos pasos describen el funcionamiento esperado; no son una línea de tiempo verificada
          de la ejecución actual. Al ejecutar la prueba, este panel pasa al seguimiento en vivo.
        </p>
      </div>
    </div>
  );
}
