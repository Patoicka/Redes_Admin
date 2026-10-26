import { NIVEL_COLOR_PILDORA_BG, NIVEL_COLOR_PILDORA_TEXTO } from "../../colores";
import { nombreNivel } from "../../formato";

export default function EtiquetaNivel({ nivel }: { nivel: string | null }) {
  if (!nivel) {
    return <span className="text-xs text-ink-4">—</span>;
  }

  const bg = NIVEL_COLOR_PILDORA_BG[nivel] ?? "#131B1E";
  const color = NIVEL_COLOR_PILDORA_TEXTO[nivel] ?? "#849399";

  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: bg, color }}
    >
      {nombreNivel(nivel)}
    </span>
  );
}
