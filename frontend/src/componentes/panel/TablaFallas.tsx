import { ArrowRight } from "lucide-react";
import Pildora from "../comunes/Pildora";
import { formatearDuracion, formatearHora, nombreNivel, nombreTipo, textoSoloNotificacion } from "../../formato";
import type { FilaHistorial } from "../../tipos";

interface Props {
  filas: FilaHistorial[];
  limite?: number;
  titulo?: string;
  onVerTodas?: () => void;
}

export default function TablaFallas({
  filas,
  limite,
  titulo = "Últimos eventos",
  onVerTodas,
}: Props) {
  const filasMostradas = limite ? filas.slice(0, limite) : filas;

  return (
    <div className="flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-line">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">{titulo}</p>
        {onVerTodas && (
          <button
            type="button"
            onClick={onVerTodas}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-3 transition-colors hover:text-accent"
          >
            Ver todas
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {filasMostradas.length === 0 ? (
        <p className="mt-4 text-sm text-ink-3">Sin eventos registrados todavía.</p>
      ) : (
        <div className="mt-3 min-h-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-wide text-ink-4 uppercase">
                <th className="pr-4 pb-2.5 font-medium">Detectada</th>
                <th className="pr-4 pb-2.5 font-medium">Dispositivo</th>
                <th className="pr-4 pb-2.5 font-medium">Falla</th>
                <th className="pr-4 pb-2.5 font-medium">Interfaz</th>
                <th className="pr-4 pb-2.5 font-medium">Clasificó</th>
                <th className="pr-4 pb-2.5 font-medium">Acción</th>
                <th className="pr-4 pb-2.5 font-medium">Duración</th>
                <th className="pb-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {filasMostradas.map((f) => (
                <tr key={f.id_falla} className="text-ink-2 transition-colors hover:bg-card-2/40">
                  <td className="py-2.5 pr-4 whitespace-nowrap text-ink-3">{formatearHora(f.detectada)}</td>
                  <td className="py-2.5 pr-4 font-medium text-ink">{f.dispositivo}</td>
                  <td className="py-2.5 pr-4">{nombreTipo(f.falla)}</td>
                  <td className="py-2.5 pr-4 mono text-xs">{f.interfaz ?? "—"}</td>
                  <td className="py-2.5 pr-4">{nombreNivel(f.clasifico)}</td>
                  <td className="py-2.5 pr-4 max-w-[200px]">
                    {f.accion.length > 0 ? (
                      <code className="mono line-clamp-2 text-xs text-ink-3">{f.accion.join(" · ")}</code>
                    ) : (
                      <span className="text-xs text-ink-4">{textoSoloNotificacion(f.origen)}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 whitespace-nowrap text-ink-3">
                    {formatearDuracion(f.duracion_segundos)}
                  </td>
                  <td className="py-2.5">
                    <Pildora
                      texto={f.estado}
                      variante={f.estado === "Activa" ? "critica" : "ok"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
