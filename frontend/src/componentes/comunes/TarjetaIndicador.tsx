import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  icono: LucideIcon;
  etiqueta: string;
  valor: string;
  detalle?: ReactNode;
  acento?: "accent" | "ok" | "danger" | "info";
}

const ACENTO_CLASES = {
  accent: "bg-tag-warn text-accent",
  ok: "bg-tag-ok text-ok",
  danger: "bg-tag-danger text-danger",
  info: "bg-card-2 text-info",
} as const;

export default function TarjetaIndicador({
  icono: Icono,
  etiqueta,
  valor,
  detalle,
  acento = "accent",
}: Props) {
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-line">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ACENTO_CLASES[acento]}`}
        >
          <Icono className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">{etiqueta}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-ink tabular-nums">{valor}</p>
          {detalle && <div className="mt-2 text-xs text-ink-4">{detalle}</div>}
        </div>
      </div>
    </div>
  );
}
