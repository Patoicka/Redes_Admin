import { ChevronDown, Download, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { NIVEL_DISPLAY, NIVEL_ORDEN } from "../../colores";

const TIPOS_FALLA = [
  { value: "interfaz_caida", label: "Interfaz caída" },
  { value: "puerto_saturado", label: "Puerto saturado" },
  { value: "ip_fuera_de_vlan", label: "IP fuera de VLAN" },
] as const;

interface Props {
  busqueda: string;
  onBusquedaChange: (v: string) => void;
  dispositivos: string[];
  dispositivo: string;
  onDispositivoChange: (v: string) => void;
  tipo: string;
  onTipoChange: (v: string) => void;
  estado: string;
  onEstadoChange: (v: string) => void;
  clasificacion: string;
  onClasificacionChange: (v: string) => void;
  onLimpiar: () => void;
  onExportar: () => void;
  filtrosActivos: boolean;
}

function SelectFiltro({
  etiqueta,
  value,
  onChange,
  activo,
  className = "",
  children,
}: {
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  activo: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex min-w-[8rem] flex-1 flex-col gap-1.5 sm:flex-none ${className}`}>
      <span className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">
        {etiqueta}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-xl border py-2.5 pr-9 pl-3 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow,background-color] duration-150 focus:outline-none ${
            activo
              ? "border-accent/45 bg-tag-warn text-accent shadow-[0_0_0_1px_rgba(255,181,71,0.12)]"
              : "border-line/90 bg-card-2 text-ink hover:border-ink-4 hover:bg-[#182024] focus:border-accent/60 focus:shadow-[0_0_0_3px_rgba(255,181,71,0.12)]"
          }`}
        >
          {children}
        </select>
        <ChevronDown
          className={`pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 ${
            activo ? "text-accent" : "text-ink-3"
          }`}
          strokeWidth={2}
        />
      </span>
    </label>
  );
}

export default function BarraFiltros({
  busqueda,
  onBusquedaChange,
  dispositivos,
  dispositivo,
  onDispositivoChange,
  tipo,
  onTipoChange,
  estado,
  onEstadoChange,
  clasificacion,
  onClasificacionChange,
  onLimpiar,
  onExportar,
  filtrosActivos,
}: Props) {
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl bg-card p-4 ring-1 ring-line">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-4" />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          placeholder="Buscar por dispositivo, interfaz, tipo u origen..."
          className="w-full rounded-xl border border-line/90 bg-card-2 py-2.5 pr-3 pl-10 text-sm text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-ink-4 transition-[border-color,box-shadow] duration-150 hover:border-ink-4 focus:border-accent/60 focus:shadow-[0_0_0_3px_rgba(255,181,71,0.12)] focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-end gap-2.5">
        <SelectFiltro
          etiqueta="Dispositivo"
          value={dispositivo}
          onChange={onDispositivoChange}
          activo={dispositivo !== "todos"}
          className="min-w-[8rem]"
        >
          <option value="todos">Todos</option>
          {dispositivos.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </SelectFiltro>

        <SelectFiltro
          etiqueta="Tipo de falla"
          value={tipo}
          onChange={onTipoChange}
          activo={tipo !== "todos"}
          className="min-w-[10rem]"
        >
          <option value="todos">Todos</option>
          {TIPOS_FALLA.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </SelectFiltro>

        <SelectFiltro
          etiqueta="Estado"
          value={estado}
          onChange={onEstadoChange}
          activo={estado !== "todas"}
          className="min-w-[8rem]"
        >
          <option value="todas">Todas</option>
          <option value="Activa">Activas</option>
          <option value="Resuelta">Resueltas</option>
        </SelectFiltro>

        <SelectFiltro
          etiqueta="Clasificación"
          value={clasificacion}
          onChange={onClasificacionChange}
          activo={clasificacion !== "todos"}
          className="min-w-[9rem]"
        >
          <option value="todos">Todos</option>
          {NIVEL_ORDEN.map((n) => (
            <option key={n} value={n}>
              {NIVEL_DISPLAY[n]}
            </option>
          ))}
        </SelectFiltro>

        <div className="ml-auto flex flex-wrap items-center gap-2 pb-px">
          <button
            type="button"
            onClick={onLimpiar}
            disabled={!filtrosActivos}
            className="inline-flex h-[42px] items-center gap-1.5 rounded-xl border border-line/90 bg-card-2 px-3.5 text-sm font-medium text-ink-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-ink-4 hover:bg-[#182024] hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" />
            Limpiar
          </button>
          <button
            type="button"
            onClick={onExportar}
            className="inline-flex h-[42px] items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-medium text-page transition-colors hover:bg-accent-hot"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>
    </div>
  );
}
