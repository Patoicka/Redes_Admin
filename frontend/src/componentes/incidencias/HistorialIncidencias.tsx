import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { formatearDuracion, formatearHora, nombreTipo } from "../../formato";
import type { FilaHistorial } from "../../tipos";
import EtiquetaNivel from "../comunes/EtiquetaNivel";
import Pildora from "../comunes/Pildora";

const POR_PAGINA = 8;

interface Props {
  filas: FilaHistorial[];
  idSeleccionado: string | null;
  onSeleccionar: (id: string) => void;
  pagina: number;
  onPaginaChange: (p: number) => void;
  mensajeVacio: string;
}

export default function HistorialIncidencias({
  filas,
  idSeleccionado,
  onSeleccionar,
  pagina,
  onPaginaChange,
  mensajeVacio,
}: Props) {
  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * POR_PAGINA;
  const paginaFilas = filas.slice(inicio, inicio + POR_PAGINA);

  const paginasVisibles = Array.from({ length: totalPaginas }, (_, i) => i + 1).filter((p) => {
    if (totalPaginas <= 5) return true;
    return Math.abs(p - paginaSegura) <= 1 || p === 1 || p === totalPaginas;
  });

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl bg-card ring-1 ring-line">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
        <p className="text-sm font-medium text-ink">
          Historial de incidencias
          <span className="ml-1.5 text-ink-3">({filas.length})</span>
        </p>
      </div>

      {filas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-16 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-card-2 text-ink-4">
            <Inbox className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <p className="text-sm text-ink-3">{mensajeVacio}</p>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-line text-[11px] tracking-wide text-ink-4 uppercase">
                  <th className="px-5 py-2.5 font-medium">Fecha y hora</th>
                  <th className="px-3 py-2.5 font-medium">Dispositivo</th>
                  <th className="px-3 py-2.5 font-medium">Tipo de falla</th>
                  <th className="px-3 py-2.5 font-medium">Interfaz</th>
                  <th className="px-3 py-2.5 font-medium">Clasificación</th>
                  <th className="px-3 py-2.5 font-medium">Duración</th>
                  <th className="px-5 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {paginaFilas.map((f) => {
                  const seleccionada = f.id_falla === idSeleccionado;
                  return (
                    <tr
                      key={f.id_falla}
                      onClick={() => onSeleccionar(f.id_falla)}
                      className={`cursor-pointer transition-colors ${
                        seleccionada
                          ? "bg-accent/8 ring-1 ring-inset ring-accent/40"
                          : "hover:bg-card-2/50"
                      }`}
                    >
                      <td className="px-5 py-3 whitespace-nowrap text-ink-3">
                        <span
                          className={`mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                            f.estado === "Activa" ? "bg-danger" : "bg-ok"
                          }`}
                        />
                        {formatearHora(f.detectada)}
                      </td>
                      <td className="px-3 py-3 font-medium text-ink">{f.dispositivo}</td>
                      <td className="px-3 py-3 text-ink-2">{nombreTipo(f.falla)}</td>
                      <td className="px-3 py-3 mono text-xs text-ink-3">{f.interfaz ?? "—"}</td>
                      <td className="px-3 py-3">
                        <EtiquetaNivel nivel={f.clasifico} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-ink-3">
                        {formatearDuracion(f.duracion_segundos)}
                      </td>
                      <td className="px-5 py-3">
                        <Pildora
                          texto={f.estado}
                          variante={f.estado === "Activa" ? "critica" : "ok"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-5 py-3">
              <p className="text-xs text-ink-4">
                {inicio + 1}–{Math.min(inicio + POR_PAGINA, filas.length)} de {filas.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={paginaSegura <= 1}
                  onClick={() => onPaginaChange(paginaSegura - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-card-2 hover:text-ink disabled:opacity-30"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {paginasVisibles.map((p, i) => {
                  const prev = paginasVisibles[i - 1];
                  const mostrarElipsis = prev !== undefined && p - prev > 1;
                  return (
                    <span key={p} className="flex items-center">
                      {mostrarElipsis && <span className="px-1 text-ink-4">…</span>}
                      <button
                        type="button"
                        onClick={() => onPaginaChange(p)}
                        className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors ${
                          p === paginaSegura
                            ? "bg-accent text-page"
                            : "text-ink-3 hover:bg-card-2 hover:text-ink"
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  disabled={paginaSegura >= totalPaginas}
                  onClick={() => onPaginaChange(paginaSegura + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-card-2 hover:text-ink disabled:opacity-30"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { POR_PAGINA };
