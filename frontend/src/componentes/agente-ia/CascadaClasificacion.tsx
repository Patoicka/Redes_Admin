import { ChevronDown, ChevronRight } from "lucide-react";
import { NIVELES_CASCADA } from "../../cascada";

export default function CascadaClasificacion() {
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-line sm:p-6">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-ink">Cascada de clasificación</p>
        <p className="mt-1 text-sm text-ink-3">
          Cada falla se evalúa en orden hasta que un nivel devuelve una clasificación válida. Si un
          nivel no consigue clasificarla, se intenta con el siguiente.
        </p>
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-3 lg:flex-row lg:items-stretch lg:gap-0">
        {NIVELES_CASCADA.map((nivel, i) => {
          const Icono = nivel.icono;
          const ultimo = i === NIVELES_CASCADA.length - 1;
          return (
            <div key={nivel.id} className="flex flex-1 flex-col lg:flex-row lg:items-stretch">
              <div
                className="group relative flex flex-1 flex-col rounded-2xl border border-line/90 bg-card-2/40 p-4 transition-colors duration-150 hover:border-ink-4 hover:bg-card-2/70"
                title={nivel.descripcion}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: nivel.colorBg, color: nivel.color }}
                  >
                    <Icono className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                    style={{ backgroundColor: nivel.colorBg, color: nivel.colorTexto }}
                  >
                    {nivel.etapa}
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold text-ink">{nivel.etiqueta}</p>
                <p className="mt-0.5 text-[11px] font-medium tracking-wide uppercase" style={{ color: nivel.color }}>
                  {nivel.rol}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-3">{nivel.descripcion}</p>
              </div>

              {!ultimo && (
                <>
                  <div className="flex items-center justify-center py-1 lg:hidden" aria-hidden>
                    <ChevronDown className="h-4 w-4 text-ink-4" />
                  </div>
                  <div className="hidden w-8 shrink-0 items-center justify-center lg:flex" aria-hidden>
                    <ChevronRight className="h-4 w-4 text-ink-4" />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
