import { AlertCircle, CheckCircle2, Clock, List } from "lucide-react";
import { useMemo, useState } from "react";
import { exportarHistorialCSV } from "../../agregaciones";
import { formatearDuracion, formatearHora, nombreNivel, nombreTipo } from "../../formato";
import type { Tablero } from "../../tipos";
import TarjetaIndicador from "../comunes/TarjetaIndicador";
import BarraFiltros from "../incidencias/BarraFiltros";
import DetalleIncidencia from "../incidencias/DetalleIncidencia";
import HistorialIncidencias from "../incidencias/HistorialIncidencias";

interface Props {
  tablero: Tablero;
  enVivo: boolean;
}

export default function Fallas({ tablero, enVivo }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [dispositivo, setDispositivo] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [estado, setEstado] = useState("todas");
  const [clasificacion, setClasificacion] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [idSeleccionado, setIdSeleccionado] = useState<string | null>(null);

  function actualizarFiltro<T>(setter: (v: T) => void) {
    return (valor: T) => {
      setter(valor);
      setPagina(1);
    };
  }

  const dispositivos = useMemo(
    () => Array.from(new Set(tablero.historial.map((f) => f.dispositivo))).sort(),
    [tablero.historial],
  );

  const activas = useMemo(
    () => tablero.historial.filter((f) => f.estado === "Activa").length,
    [tablero.historial],
  );
  const resueltas = useMemo(
    () => tablero.historial.filter((f) => f.estado === "Resuelta").length,
    [tablero.historial],
  );
  const total = tablero.historial.length;

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return tablero.historial.filter((f) => {
      if (dispositivo !== "todos" && f.dispositivo !== dispositivo) return false;
      if (tipo !== "todos" && f.falla !== tipo) return false;
      if (estado !== "todas" && f.estado !== estado) return false;
      if (clasificacion !== "todos" && f.clasifico !== clasificacion) return false;
      if (!q) return true;

      const haystack = [
        f.dispositivo,
        f.interfaz ?? "",
        f.falla,
        nombreTipo(f.falla),
        f.origen ?? "",
        f.clasifico ?? "",
        nombreNivel(f.clasifico),
        f.estado,
        f.id_falla,
        ...f.accion,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [tablero.historial, busqueda, dispositivo, tipo, estado, clasificacion]);

  const filtrosActivos =
    busqueda.trim() !== "" ||
    dispositivo !== "todos" ||
    tipo !== "todos" ||
    estado !== "todas" ||
    clasificacion !== "todos";

  // Selección estable entre polls: si el id ya no existe, el detalle queda vacío
  // sin reiniciar filtros ni página.
  const filaSeleccionada = useMemo(() => {
    if (!idSeleccionado) return null;
    return tablero.historial.find((f) => f.id_falla === idSeleccionado) ?? null;
  }, [tablero.historial, idSeleccionado]);

  function limpiarFiltros() {
    setBusqueda("");
    setDispositivo("todos");
    setTipo("todos");
    setEstado("todas");
    setClasificacion("todos");
    setPagina(1);
  }

  function mensajeVacio(): string {
    if (tablero.historial.length === 0) {
      return "No existen incidencias registradas todavía.";
    }
    if (busqueda.trim()) {
      return "La búsqueda no produjo resultados.";
    }
    if (filtrosActivos) {
      return "Ningún registro coincide con los filtros aplicados.";
    }
    return "Sin incidencias para mostrar.";
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
            Incidencias
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            Historial y detalles de las incidencias detectadas en la red.
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          icono={AlertCircle}
          etiqueta="Incidencias activas"
          valor={String(activas)}
          acento="danger"
          detalle={total > 0 ? `de ${total} totales` : undefined}
        />
        <TarjetaIndicador
          icono={CheckCircle2}
          etiqueta="Incidencias resueltas"
          valor={String(resueltas)}
          acento="ok"
          detalle={total > 0 ? `${resueltas} de ${total}` : undefined}
        />
        <TarjetaIndicador
          icono={Clock}
          etiqueta="Tiempo promedio de resolución"
          valor={formatearDuracion(tablero.indicadores.promedio_resolucion_segundos)}
          acento="info"
          detalle="Media de fallas ya resueltas"
        />
        <TarjetaIndicador
          icono={List}
          etiqueta="Total de incidencias"
          valor={String(total)}
          acento="accent"
          detalle="Registros en el historial"
        />
      </div>

      <BarraFiltros
        busqueda={busqueda}
        onBusquedaChange={actualizarFiltro(setBusqueda)}
        dispositivos={dispositivos}
        dispositivo={dispositivo}
        onDispositivoChange={actualizarFiltro(setDispositivo)}
        tipo={tipo}
        onTipoChange={actualizarFiltro(setTipo)}
        estado={estado}
        onEstadoChange={actualizarFiltro(setEstado)}
        clasificacion={clasificacion}
        onClasificacionChange={actualizarFiltro(setClasificacion)}
        onLimpiar={limpiarFiltros}
        onExportar={() => exportarHistorialCSV(filasFiltradas)}
        filtrosActivos={filtrosActivos}
      />

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
        <div className="min-h-[420px] xl:col-span-8">
          <HistorialIncidencias
            filas={filasFiltradas}
            idSeleccionado={filaSeleccionada?.id_falla ?? null}
            onSeleccionar={setIdSeleccionado}
            pagina={pagina}
            onPaginaChange={setPagina}
            mensajeVacio={mensajeVacio()}
          />
        </div>

        {/* Detalle escritorio */}
        <div className="hidden min-h-[420px] xl:col-span-4 xl:block">
          <DetalleIncidencia fila={filaSeleccionada} />
        </div>
      </div>

      {/* Drawer móvil / tablet */}
      {idSeleccionado && filaSeleccionada && (
        <div className="xl:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/55"
            onClick={() => setIdSeleccionado(null)}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col overflow-hidden rounded-t-2xl border border-line bg-page shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:h-auto sm:w-[420px] sm:rounded-none sm:border-l sm:border-t-0">
            <DetalleIncidencia
              fila={filaSeleccionada}
              onCerrar={() => setIdSeleccionado(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
