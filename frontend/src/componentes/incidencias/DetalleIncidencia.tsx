import { Check, Copy, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  formatearDuracion,
  formatearHora,
  nombreTipo,
  textoSoloNotificacion,
} from "../../formato";
import type { FilaHistorial } from "../../tipos";
import EtiquetaNivel from "../comunes/EtiquetaNivel";
import Pildora from "../comunes/Pildora";

interface Props {
  fila: FilaHistorial | null;
  onCerrar?: () => void;
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium tracking-wide text-ink-4 uppercase">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-ink break-words">{valor}</dd>
    </div>
  );
}

function ContenidoDetalle({ fila, onCerrar }: { fila: FilaHistorial; onCerrar?: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const [pestana, setPestana] = useState<"info" | "acciones">("info");

  async function copiarComandos() {
    if (fila.accion.length === 0) return;
    try {
      await navigator.clipboard.writeText(fila.accion.join("\n"));
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      /* sin clipboard en contextos no seguros */
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl bg-card ring-1 ring-line">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink">{nombreTipo(fila.falla)}</p>
          <p className="mt-0.5 text-sm text-ink-3">
            {fila.dispositivo}
            <span className="text-ink-4"> · </span>
            {formatearHora(fila.detectada)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Pildora
            texto={fila.estado}
            variante={fila.estado === "Activa" ? "critica" : "ok"}
          />
          {onCerrar && (
            <button
              type="button"
              onClick={onCerrar}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-card-2 hover:text-ink lg:hidden"
              aria-label="Cerrar detalle"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-line px-4 pt-2">
        {(
          [
            { id: "info" as const, label: "Información" },
            { id: "acciones" as const, label: "Acciones" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPestana(t.id)}
            className={`relative px-3 py-2 text-sm font-medium transition-colors ${
              pestana === t.id ? "text-accent" : "text-ink-3 hover:text-ink"
            }`}
          >
            {t.label}
            {pestana === t.id && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {pestana === "info" ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="Identificador" valor={<span className="mono text-xs">{fila.id_falla}</span>} />
            <Campo etiqueta="Dispositivo" valor={fila.dispositivo} />
            <Campo
              etiqueta="Interfaz"
              valor={<span className="mono text-xs">{fila.interfaz ?? "—"}</span>}
            />
            <Campo etiqueta="Tipo de falla" valor={nombreTipo(fila.falla)} />
            <Campo etiqueta="Clasificación" valor={<EtiquetaNivel nivel={fila.clasifico} />} />
            <Campo etiqueta="Origen detectado" valor={fila.origen ?? "no identificado"} />
            <Campo etiqueta="Detectada" valor={formatearHora(fila.detectada)} />
            <Campo etiqueta="Duración" valor={formatearDuracion(fila.duracion_segundos)} />
            <Campo
              etiqueta="Estado"
              valor={
                <Pildora
                  texto={fila.estado}
                  variante={fila.estado === "Activa" ? "critica" : "ok"}
                />
              }
            />
          </dl>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink">Acciones del agente</p>
              {fila.accion.length > 0 && (
                <button
                  type="button"
                  onClick={copiarComandos}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:bg-card-2 hover:text-ink"
                >
                  {copiado ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-ok" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar
                    </>
                  )}
                </button>
              )}
            </div>

            {fila.accion.length > 0 ? (
              <ul className="space-y-2">
                {fila.accion.map((cmd, i) => (
                  <li
                    key={`${i}-${cmd}`}
                    className="rounded-xl border border-line bg-card-2/60 px-3 py-2.5"
                  >
                    <code className="mono text-xs break-all text-ink-2">{cmd}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-line bg-card-2/40 px-3 py-3">
                <p className="text-sm text-ink-2">{textoSoloNotificacion(fila.origen)}</p>
                <p className="mt-2 text-xs text-ink-4">
                  El agente no aplicó comandos para esta incidencia; solo notificó el evento.
                </p>
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-ink-4">
              La presencia de comandos no implica por sí sola que la falla haya quedado
              corregida; el estado se confirma cuando deja de observarse en un ciclo posterior.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DetalleIncidencia({ fila, onCerrar }: Props) {
  if (!fila) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl bg-card p-6 text-center ring-1 ring-line">
        <p className="text-sm font-medium text-ink-2">Sin selección</p>
        <p className="mt-1 max-w-[220px] text-xs text-ink-4">
          Selecciona una incidencia para consultar sus detalles.
        </p>
      </div>
    );
  }

  return <ContenidoDetalle key={fila.id_falla} fila={fila} onCerrar={onCerrar} />;
}
