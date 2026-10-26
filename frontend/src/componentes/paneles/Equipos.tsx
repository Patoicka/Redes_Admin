import { AlertCircle, Server, Wifi, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { ordenarCadenaEquipos } from "../../agregaciones";
import { formatearHora } from "../../formato";
import { RED_GESTION } from "../../laboratorio";
import type { Tablero } from "../../tipos";
import TarjetaIndicador from "../comunes/TarjetaIndicador";
import DetalleDispositivo from "../infraestructura/DetalleDispositivo";
import IncidenciasInfraestructura from "../infraestructura/IncidenciasInfraestructura";
import TopologiaLaboratorio from "../infraestructura/TopologiaLaboratorio";

interface Props {
  tablero: Tablero;
  enVivo: boolean;
  onVerIncidencias?: () => void;
}

export default function Equipos({ tablero, enVivo, onVerIncidencias }: Props) {
  const equipos = useMemo(() => ordenarCadenaEquipos(tablero.equipos), [tablero.equipos]);
  const [seleccionado, setSeleccionado] = useState<string | null>(
    () => equipos[0]?.nombre ?? null,
  );

  // Mantener selección estable entre polls.
  const equipoSeleccionado = useMemo(() => {
    if (!seleccionado) return null;
    return equipos.find((e) => e.nombre === seleccionado) ?? null;
  }, [equipos, seleccionado]);

  const enLinea = equipos.filter((e) => e.en_linea === true).length;
  const fueraLinea = equipos.filter((e) => e.en_linea === false).length;
  const incidenciasActivas = tablero.fallas_activas.length;

  function seleccionar(nombre: string) {
    setSeleccionado(nombre);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
            Infraestructura
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            Estado y topología de los dispositivos monitoreados en tiempo real.
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

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <TarjetaIndicador
          icono={Server}
          etiqueta="Dispositivos monitoreados"
          valor={String(equipos.length)}
          acento="info"
          detalle={`Gestión ${RED_GESTION}`}
        />
        <TarjetaIndicador
          icono={Wifi}
          etiqueta="Equipos en línea"
          valor={String(enLinea)}
          acento="ok"
          detalle={`${enLinea} de ${equipos.length} respondiendo`}
        />
        <TarjetaIndicador
          icono={WifiOff}
          etiqueta="Equipos fuera de línea"
          valor={String(fueraLinea)}
          acento="danger"
          detalle={fueraLinea === 0 ? "Ninguno sin respuesta" : "Sin respuesta SSH"}
        />
        <TarjetaIndicador
          icono={AlertCircle}
          etiqueta="Incidencias activas"
          valor={String(incidenciasActivas)}
          acento={incidenciasActivas > 0 ? "danger" : "ok"}
          detalle="En dispositivos monitoreados"
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <TopologiaLaboratorio
            equipos={equipos}
            fallasActivas={tablero.fallas_activas}
            seleccionado={equipoSeleccionado?.nombre ?? null}
            onSeleccionar={seleccionar}
          />
        </div>
        <div className="min-h-[280px] xl:col-span-4">
          <DetalleDispositivo
            equipo={equipoSeleccionado}
            fallas={tablero.fallas_activas}
            onVerIncidencias={onVerIncidencias}
          />
        </div>
      </div>

      <IncidenciasInfraestructura
        fallas={tablero.fallas_activas}
        onVerTodas={onVerIncidencias}
      />
    </div>
  );
}
