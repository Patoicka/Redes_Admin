import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Banner } from "../../tipos";

interface Props {
  banner: Banner;
  onVerTodas?: () => void;
}

export default function BannerAlerta({ banner, onVerTodas }: Props) {
  if (banner.estado === "ok" || banner.fallas.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-ok/20 bg-tag-ok/60 px-4 py-3 text-ok sm:px-5">
        <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Red operativa</p>
          <p className="text-xs text-ok/80">Sin incidencias activas en este momento.</p>
        </div>
      </div>
    );
  }

  const n = banner.fallas.length;
  const dispositivos = Array.from(new Set(banner.fallas.map((f) => f.dispositivo)));

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/25 bg-tag-danger px-4 py-3 text-danger sm:gap-4 sm:px-5">
      <AlertTriangle className="h-5 w-5 shrink-0" strokeWidth={2} />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {n} incidencia{n !== 1 ? "s" : ""} activa{n !== 1 ? "s" : ""}
        </p>
        <p className="text-xs text-danger/75">
          Se han detectado problemas en la red que requieren atención.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-danger/70">Dispositivos afectados:</span>
        {dispositivos.map((nombre) => (
          <span
            key={nombre}
            className="rounded-md border border-danger/30 bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger"
          >
            {nombre}
          </span>
        ))}
      </div>

      {onVerTodas && (
        <button
          type="button"
          onClick={onVerTodas}
          className="inline-flex items-center gap-1 text-sm font-medium text-danger transition-opacity hover:opacity-80"
        >
          Ver todas
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
