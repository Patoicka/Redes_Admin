import { useEffect, useMemo, useState } from "react";
import {
  activarEscenario,
  actualizarFallasIA,
  limpiarLaboratorio,
  obtenerEscenarios,
  obtenerFallasIA,
} from "../../api";
import { formatearHora } from "../../formato";
import type { EscenarioInfo, FallasIA, ResultadoLimpieza, Tablero } from "../../tipos";
import FallosIA from "../demo/FallosIA";
import LimpiezaLaboratorio from "../demo/LimpiezaLaboratorio";
import ListaEscenarios from "../demo/ListaEscenarios";
import {
  seguimientoEnCurso,
  seguimientoFinalizado,
  type SeguimientoActivo,
} from "../../seguimientoDemo";
import SeguimientoEscenario from "../demo/SeguimientoEscenario";

interface Props {
  tablero: Tablero;
  enVivo: boolean;
  onVerIncidencias?: () => void;
}

type Mensaje = { tipo: "info" | "error"; texto: string } | null;

export default function Demo({ tablero, enVivo, onVerIncidencias }: Props) {
  const [escenarios, setEscenarios] = useState<EscenarioInfo[]>([]);
  const [fallasIA, setFallasIA] = useState<FallasIA | null>(null);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [ejecutando, setEjecutando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [resultadosLimpieza, setResultadosLimpieza] = useState<ResultadoLimpieza[] | null>(null);
  const [seguimiento, setSeguimiento] = useState<SeguimientoActivo | null>(null);

  useEffect(() => {
    obtenerEscenarios()
      .then((lista) => {
        setEscenarios(lista);
        setSeleccionadoId((prev) => prev ?? lista[0]?.id ?? null);
      })
      .catch(() => setMensaje({ tipo: "error", texto: "No se pudieron cargar los escenarios." }));
    obtenerFallasIA()
      .then(setFallasIA)
      .catch(() =>
        setMensaje({ tipo: "error", texto: "No se pudo leer el estado de fallos forzados de IA." }),
      );
  }, []);

  const escenarioSeleccionado = useMemo(
    () => escenarios.find((e) => e.id === seleccionadoId) ?? null,
    [escenarios, seleccionadoId],
  );

  const pruebaEnCurso = seguimientoEnCurso(seguimiento, tablero);

  function manejarSeleccionar(id: string) {
    setSeleccionadoId(id);
    // Tras resolver, elegir otra prueba vuelve al detalle (no al historial en vivo).
    if (
      seguimiento &&
      seguimientoFinalizado(seguimiento, tablero) &&
      id !== seguimiento.escenarioId
    ) {
      setSeguimiento(null);
    }
  }

  async function manejarEjecutar(id: string) {
    const escenario = escenarios.find((e) => e.id === id);
    setEjecutando(id);
    setMensaje(null);
    const idsPrevios = tablero.historial.map((f) => f.id_falla);
    const fallaRelacionada =
      id === "restaurar_pc_ven1"
        ? tablero.historial.find((f) => f.falla === "ip_fuera_de_vlan" && f.estado === "Activa")
        : undefined;
    try {
      const resultado = await activarEscenario(id);
      setSeguimiento({
        escenarioId: id,
        escenarioNombre: escenario?.nombre ?? id,
        solicitadoEn: new Date().toISOString(),
        idsPrevios,
        resumen: resultado.resumen,
        idFallaRelacionada: fallaRelacionada?.id_falla ?? null,
      });
      setMensaje({
        tipo: "info",
        texto:
          "Escenario solicitado. El seguimiento se actualizará con lo que reporte el agente.",
      });
    } catch (e) {
      setMensaje({
        tipo: "error",
        texto: e instanceof Error ? e.message : "Error desconocido al ejecutar el escenario.",
      });
    } finally {
      setEjecutando(null);
    }
  }

  async function manejarToggleIA(clave: keyof FallasIA) {
    if (!fallasIA) return;
    const anterior = fallasIA;
    const siguiente = { ...fallasIA, [clave]: !fallasIA[clave] };
    setFallasIA(siguiente);
    try {
      setFallasIA(await actualizarFallasIA({ [clave]: siguiente[clave] }));
    } catch {
      setFallasIA(anterior);
      setMensaje({ tipo: "error", texto: "No se pudo actualizar el interruptor de fallos de IA." });
    }
  }

  async function manejarLimpieza() {
    setEjecutando("limpiar-laboratorio");
    setMensaje(null);
    setResultadosLimpieza(null);
    try {
      setResultadosLimpieza(await limpiarLaboratorio());
    } catch (e) {
      setMensaje({
        tipo: "error",
        texto: e instanceof Error ? e.message : "Error al limpiar el laboratorio.",
      });
    } finally {
      setEjecutando(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
            Laboratorio demo
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            Ejecuta escenarios predefinidos para probar la detección y corrección automática del
            agente.
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

      {mensaje && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            mensaje.tipo === "error"
              ? "border-danger/25 bg-tag-danger text-danger"
              : "border-ok/25 bg-tag-ok text-ok"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <ListaEscenarios
        escenarios={escenarios}
        seleccionadoId={seleccionadoId}
        onSeleccionar={manejarSeleccionar}
        ejecutandoId={ejecutando}
        bloqueado={pruebaEnCurso}
        onEjecutar={manejarEjecutar}
      />

      <SeguimientoEscenario
        seguimiento={seguimiento}
        escenario={escenarioSeleccionado}
        tablero={tablero}
        onVerIncidencias={onVerIncidencias}
        onLimpiarSeguimiento={() => setSeguimiento(null)}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FallosIA fallasIA={fallasIA} onToggle={manejarToggleIA} />
        <LimpiezaLaboratorio
          limpiando={ejecutando === "limpiar-laboratorio"}
          resultados={resultadosLimpieza}
          onLimpiar={manejarLimpieza}
        />
      </div>
    </div>
  );
}
