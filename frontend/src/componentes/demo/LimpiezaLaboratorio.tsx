import { Loader2, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { ResultadoLimpieza } from "../../tipos";
import Pildora from "../comunes/Pildora";

interface Props {
  limpiando: boolean;
  resultados: ResultadoLimpieza[] | null;
  onLimpiar: () => Promise<void>;
}

export default function LimpiezaLaboratorio({ limpiando, resultados, onLimpiar }: Props) {
  const [confirmar, setConfirmar] = useState(false);

  async function confirmarLimpieza() {
    setConfirmar(false);
    await onLimpiar();
  }

  return (
    <>
      <div className="rounded-2xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tag-danger text-danger">
              <Trash2 className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Restauración del laboratorio</p>
              <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-ink-3">
                Elimina las configuraciones temporales creadas por el agente durante las pruebas
                (colas, cuarentena, etc.). Distinto del escenario «Restaurar IP de PC-VEN1».
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={limpiando}
            onClick={() => setConfirmar(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-tag-danger px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {limpiando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Limpiando…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Limpiar laboratorio
              </>
            )}
          </button>
        </div>

        {resultados && (
          <ul className="mt-4 space-y-2 border-t border-line pt-4">
            {resultados.map((r) => (
              <li key={r.dispositivo} className="flex flex-wrap items-center gap-2 text-sm">
                <Pildora texto={r.dispositivo} variante={r.ok ? "ok" : "critica"} />
                <span className="text-ink-3">{r.detalle}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmar(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-semibold text-ink">¿Limpiar el laboratorio?</p>
              <button
                type="button"
                onClick={() => setConfirmar(false)}
                className="rounded-lg p-1 text-ink-3 hover:bg-card-2 hover:text-ink"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-3">
              Esta operación intentará eliminar las configuraciones creadas por el agente durante
              las pruebas. Revisa el resultado por dispositivo al terminar.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmar(false)}
                className="rounded-xl border border-line px-3.5 py-2 text-sm font-medium text-ink-2 hover:bg-card-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarLimpieza}
                className="rounded-xl bg-danger px-3.5 py-2 text-sm font-medium text-page hover:opacity-90"
              >
                Confirmar limpieza
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
