import { ShieldCheck } from "lucide-react";
import { NIVELES_CASCADA } from "../../cascada";

export default function ExplicacionCascada() {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-line">
      <p className="text-sm font-medium text-ink">¿Cómo funciona la cascada?</p>
      <ol className="mt-4 flex-1 space-y-3">
        {NIVELES_CASCADA.map((n) => (
          <li key={n.id} className="flex gap-3">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
              style={{ backgroundColor: n.colorBg, color: n.color }}
            >
              {n.etapa}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{n.etiqueta}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{n.explicacion}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex gap-2.5 rounded-xl border border-accent/25 bg-tag-warn/70 px-3 py-2.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
        <p className="text-xs leading-relaxed text-ink-2">
          Solo se aceptan clasificaciones válidas y comandos permitidos. Las reglas fijas funcionan
          como última línea de respaldo.
        </p>
      </div>
    </div>
  );
}
