import type { NivelResumen } from "../../agregaciones";
import { metaNivel } from "../../cascada";

export default function IndicadoresNiveles({ resumen }: { resumen: NivelResumen[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {resumen.map((n) => {
        const meta = metaNivel(n.nivel);
        const Icono = meta?.icono;
        return (
          <div key={n.nivel} className="rounded-2xl bg-card p-4 ring-1 ring-line sm:p-5">
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: n.colorPildoraBg,
                  color: n.colorDona,
                }}
              >
                {Icono && <Icono className="h-5 w-5" strokeWidth={2} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">{n.etiqueta}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-ink tabular-nums">
                  {n.valor}
                  <span className="ml-1.5 text-base font-medium text-ink-3">
                    · {n.porcentaje.toFixed(0)}%
                  </span>
                </p>
                <p className="mt-1.5 text-xs text-ink-4">fallas clasificadas</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
