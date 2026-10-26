import { Download, SlidersHorizontal } from "lucide-react";

interface Props {
  enVivo: boolean;
  filtroActivo: boolean;
  onFiltroClick: () => void;
  onExportarClick: () => void;
}

export default function EncabezadoPanel({
  enVivo,
  filtroActivo,
  onFiltroClick,
  onExportarClick,
}: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
          Centro de control
        </h1>
        <p className="mt-1 text-sm text-ink-3">
          Visión general del estado operativo de la red.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
            enVivo
              ? "border-ok/25 bg-tag-ok text-ok"
              : "border-danger/25 bg-tag-danger text-danger"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${enVivo ? "bg-ok animate-pulse" : "bg-danger"}`}
          />
          {enVivo ? "En vivo" : "Sin conexión"}
        </span>

        <button
          type="button"
          onClick={onFiltroClick}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors duration-150 ${
            filtroActivo
              ? "border-accent/40 bg-tag-warn text-accent"
              : "border-line bg-card text-ink-2 hover:bg-card-2 hover:text-ink"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtro</span>
        </button>

        <button
          type="button"
          onClick={onExportarClick}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-page transition-colors duration-150 hover:bg-accent-hot"
        >
          <Download className="h-4 w-4" />
          Exportar
        </button>
      </div>
    </div>
  );
}
