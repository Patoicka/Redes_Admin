interface Props {
  dispositivos: string[];
  dispositivo: string;
  estado: string;
  onDispositivoChange: (v: string) => void;
  onEstadoChange: (v: string) => void;
}

// Mismo control en dos lugares: como popover en Panel, como barra fija en
// Fallas. La lógica de filtrado vive en cada pantalla (son listas distintas
// de todas formas); esto es solo la presentación de los dos selects.
export default function FiltroFallas({
  dispositivos,
  dispositivo,
  estado,
  onDispositivoChange,
  onEstadoChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-2">
        Dispositivo
        <select
          value={dispositivo}
          onChange={(e) => onDispositivoChange(e.target.value)}
          className="rounded-lg border border-line bg-card-2 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
        >
          <option value="todos">Todos</option>
          {dispositivos.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-2">
        Estado
        <select
          value={estado}
          onChange={(e) => onEstadoChange(e.target.value)}
          className="rounded-lg border border-line bg-card-2 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
        >
          <option value="todas">Todos</option>
          <option value="Activa">Activa</option>
          <option value="Resuelta">Resuelta</option>
        </select>
      </label>
    </div>
  );
}
