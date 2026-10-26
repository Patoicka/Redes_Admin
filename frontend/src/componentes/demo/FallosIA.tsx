import { Loader2 } from "lucide-react";
import { useState } from "react";
import { metaNivel } from "../../cascada";
import type { FallasIA } from "../../tipos";

interface Props {
  fallasIA: FallasIA | null;
  onToggle: (clave: keyof FallasIA) => Promise<void>;
}

const CLAVES: Array<keyof FallasIA> = ["groq", "deepseek", "ollama"];

export default function FallosIA({ fallasIA, onToggle }: Props) {
  const [pendiente, setPendiente] = useState<keyof FallasIA | null>(null);

  async function manejar(clave: keyof FallasIA) {
    setPendiente(clave);
    try {
      await onToggle(clave);
    } finally {
      setPendiente(null);
    }
  }

  return (
    <div className="rounded-2xl bg-card ring-1 ring-line">
      <div className="border-b border-line px-5 py-4">
        <p className="text-sm font-medium text-ink">Simulación de fallos de IA</p>
        <p className="mt-0.5 text-xs text-ink-4">
          Desactiva temporalmente niveles de clasificación para comprobar cómo responde la cascada
          ante fallos controlados.
        </p>
      </div>

      {!fallasIA ? (
        <p className="px-5 py-6 text-sm text-ink-3">Cargando estado de interruptores…</p>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          {CLAVES.map((clave) => {
            const meta = metaNivel(clave);
            const activo = fallasIA[clave];
            const Icono = meta?.icono;
            const cargando = pendiente === clave;
            return (
              <div
                key={clave}
                className={`rounded-xl border p-4 transition-colors ${
                  activo
                    ? "border-accent/40 bg-tag-warn/50"
                    : "border-line/80 bg-card-2/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: meta?.colorBg,
                        color: meta?.color,
                      }}
                    >
                      {Icono && <Icono className="h-4 w-4" strokeWidth={2} />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{meta?.etiqueta ?? clave}</p>
                      <p className="text-[11px] text-ink-4">
                        {activo ? "Fallo forzado activado" : "Fallo forzado desactivado"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={activo}
                    disabled={cargando || pendiente !== null}
                    onClick={() => manejar(clave)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                      activo ? "bg-accent" : "bg-line"
                    }`}
                  >
                    {cargando ? (
                      <Loader2 className="absolute top-1 left-1/2 h-4 w-4 -translate-x-1/2 animate-spin text-page" />
                    ) : (
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-ink shadow transition-transform ${
                          activo ? "translate-x-5" : ""
                        }`}
                      />
                    )}
                  </button>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-ink-4">
                  {activo
                    ? "El backend simulará un fallo para este nivel."
                    : "El nivel funciona según su configuración habitual."}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <p className="border-t border-line px-5 py-3 text-xs text-ink-4">
        Los fallos forzados permiten demostrar cómo el sistema utiliza los siguientes niveles de la
        cascada. Reglas fijas no se desactiva: es el respaldo final.
      </p>
    </div>
  );
}
