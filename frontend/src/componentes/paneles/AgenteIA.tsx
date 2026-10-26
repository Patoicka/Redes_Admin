import { resumenNiveles } from "../../agregaciones";
import { formatearHora } from "../../formato";
import type { Tablero } from "../../tipos";
import CascadaClasificacion from "../agente-ia/CascadaClasificacion";
import ClasificacionesPorEtapa from "../agente-ia/ClasificacionesPorEtapa";
import ExplicacionCascada from "../agente-ia/ExplicacionCascada";
import IndicadoresNiveles from "../agente-ia/IndicadoresNiveles";
import DonaNiveles from "../panel/DonaNiveles";

interface Props {
  tablero: Tablero;
  enVivo: boolean;
}

export default function AgenteIA({ tablero, enVivo }: Props) {
  const resumen = resumenNiveles(tablero.niveles);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
            Agente IA
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            Supervisión del flujo de clasificación automática y desempeño por nivel.
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
          {tablero.hora_servidor && (
            <span className="text-xs text-ink-4" title="Hora del servidor">
              Actualizado {formatearHora(tablero.hora_servidor)}
            </span>
          )}
        </div>
      </div>

      <CascadaClasificacion />

      <IndicadoresNiveles resumen={resumen} />

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <DonaNiveles niveles={tablero.niveles} />
        </div>
        <div className="xl:col-span-4">
          <ClasificacionesPorEtapa resumen={resumen} />
        </div>
        <div className="xl:col-span-4">
          <ExplicacionCascada />
        </div>
      </div>
    </div>
  );
}
