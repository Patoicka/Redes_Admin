import type { NivelResumen } from "../../agregaciones";
import { metaNivel } from "../../cascada";

export default function ClasificacionesPorEtapa({ resumen }: { resumen: NivelResumen[] }) {
  const max = Math.max(...resumen.map((n) => n.valor), 1);

  return (
    <div className="flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-line">
      <p className="text-sm font-medium text-ink">Clasificaciones por etapa</p>
      <p className="mt-0.5 text-xs text-ink-4">Participación de cada nivel en el total clasificado</p>

      <ul className="mt-5 flex-1 space-y-4">
        {resumen.map((n, i) => {
          const meta = metaNivel(n.nivel);
          const Icono = meta?.icono;
          const ancho = `${(n.valor / max) * 100}%`;
          return (
            <li key={n.nivel}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold"
                    style={{ backgroundColor: n.colorPildoraBg, color: n.colorDona }}
                  >
                    {i + 1}
                  </span>
                  {Icono && (
                    <Icono className="h-3.5 w-3.5 shrink-0" style={{ color: n.colorDona }} strokeWidth={2} />
                  )}
                  <span className="truncate text-sm font-medium text-ink">{n.etiqueta}</span>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-ink-3">
                  {n.valor} · {n.porcentaje.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-card-2">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: ancho, backgroundColor: n.colorDona }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
