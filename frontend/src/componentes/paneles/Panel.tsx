import { AlertCircle, CheckCircle2, Clock, Wifi } from "lucide-react";
import { useMemo, useState } from "react";
import { contarEquiposEnLinea, exportarHistorialCSV } from "../../agregaciones";
import { formatearDuracion } from "../../formato";
import type { Tablero } from "../../tipos";
import FiltroFallas from "../comunes/FiltroFallas";
import TarjetaIndicador from "../comunes/TarjetaIndicador";
import BannerAlerta from "../panel/BannerAlerta";
import DonaNiveles from "../panel/DonaNiveles";
import EncabezadoPanel from "../panel/EncabezadoPanel";
import GraficaFallasTiempo from "../panel/GraficaFallasTiempo";
import IncidenciasActivas from "../panel/IncidenciasActivas";
import TablaFallas from "../panel/TablaFallas";
import Topologia from "../panel/Topologia";

interface Props {
  tablero: Tablero;
  enVivo: boolean;
  onVerIncidencias: () => void;
}

export default function Panel({ tablero, enVivo, onVerIncidencias }: Props) {
  const [mostrarFiltro, setMostrarFiltro] = useState(false);
  const [dispositivo, setDispositivo] = useState("todos");
  const [estado, setEstado] = useState("todas");

  const dispositivos = useMemo(
    () => Array.from(new Set(tablero.historial.map((f) => f.dispositivo))),
    [tablero.historial],
  );

  const filasFiltradas = useMemo(
    () =>
      tablero.historial.filter(
        (f) =>
          (dispositivo === "todos" || f.dispositivo === dispositivo) &&
          (estado === "todas" || f.estado === estado),
      ),
    [tablero.historial, dispositivo, estado],
  );

  const filtroActivo = dispositivo !== "todos" || estado !== "todas";
  const equiposEnLinea = contarEquiposEnLinea(tablero.equipos);
  const todosEnLinea =
    equiposEnLinea.total > 0 && equiposEnLinea.enLinea === equiposEnLinea.total;

  return (
    <div className="space-y-5">
      <div className="relative">
        <EncabezadoPanel
          enVivo={enVivo}
          filtroActivo={filtroActivo}
          onFiltroClick={() => setMostrarFiltro((v) => !v)}
          onExportarClick={() => exportarHistorialCSV(filasFiltradas)}
        />
        {mostrarFiltro && (
          <div className="absolute top-full right-0 z-10 mt-2 rounded-xl border border-line bg-card p-4 shadow-lg shadow-black/40">
            <FiltroFallas
              dispositivos={dispositivos}
              dispositivo={dispositivo}
              estado={estado}
              onDispositivoChange={setDispositivo}
              onEstadoChange={setEstado}
            />
          </div>
        )}
      </div>

      <BannerAlerta banner={tablero.banner} onVerTodas={onVerIncidencias} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          icono={AlertCircle}
          etiqueta="Incidencias detectadas"
          valor={String(tablero.indicadores.fallas_detectadas)}
          acento="danger"
          detalle="Total acumulado en el historial"
        />
        <TarjetaIndicador
          icono={CheckCircle2}
          etiqueta="Resueltas automáticamente"
          valor={`${tablero.indicadores.pct_corregidas.toFixed(0)}%`}
          acento="ok"
          detalle="Del total de incidencias"
        />
        <TarjetaIndicador
          icono={Clock}
          etiqueta="Tiempo promedio de resolución"
          valor={formatearDuracion(tablero.indicadores.promedio_resolucion_segundos)}
          acento="accent"
          detalle="Media de fallas ya resueltas"
        />
        <TarjetaIndicador
          icono={Wifi}
          etiqueta="Equipos en línea"
          valor={`${equiposEnLinea.enLinea}/${equiposEnLinea.total}`}
          acento={todosEnLinea ? "ok" : "danger"}
          detalle={
            <div className="space-y-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-card-2">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    todosEnLinea ? "bg-ok" : "bg-danger"
                  }`}
                  style={{
                    width:
                      equiposEnLinea.total > 0
                        ? `${(equiposEnLinea.enLinea / equiposEnLinea.total) * 100}%`
                        : "0%",
                  }}
                />
              </div>
              <span>
                {todosEnLinea
                  ? "Todos los equipos operativos"
                  : `${equiposEnLinea.enLinea} de ${equiposEnLinea.total} respondiendo`}
              </span>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <IncidenciasActivas
            fallas={tablero.fallas_activas}
            onVerTodas={onVerIncidencias}
          />
        </div>
        <div className="xl:col-span-5">
          <GraficaFallasTiempo historial={tablero.historial} />
        </div>
        <div className="xl:col-span-3">
          <DonaNiveles niveles={tablero.niveles} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <TablaFallas
            filas={filasFiltradas}
            limite={3}
            titulo="Últimos eventos"
            onVerTodas={onVerIncidencias}
          />
        </div>
        <div className="xl:col-span-5">
          <Topologia equipos={tablero.equipos} />
        </div>
      </div>
    </div>
  );
}
