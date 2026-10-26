import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Network,
  Radar,
  RotateCcw,
  ShieldOff,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useMemo } from "react";
import { visualEscenario } from "../../escenariosDemo";
import {
  formatearDuracion,
  formatearHora,
  nombreNivel,
  nombreTipo,
  textoSoloNotificacion,
} from "../../formato";
import {
  agentePareceActivo,
  encontrarFilaSeguimiento,
  type SeguimientoActivo,
} from "../../seguimientoDemo";
import type { EscenarioInfo, FilaHistorial, ResumenRestauracion, Tablero } from "../../tipos";
import DetalleEscenario from "./DetalleEscenario";
import TopologiaSeguimiento, { type EstadoTopo } from "./TopologiaSeguimiento";

export type { SeguimientoActivo };

type FaseId = "solicitado" | "esperando" | "detectada" | "clasificada" | "finalizada";

interface Props {
  seguimiento: SeguimientoActivo | null;
  escenario: EscenarioInfo | null;
  tablero: Tablero;
  onVerIncidencias?: () => void;
  onLimpiarSeguimiento?: () => void;
}

function Paso({
  estado,
  titulo,
  detalle,
  icono: Icono,
}: {
  estado: "hecho" | "actual" | "pendiente";
  titulo: string;
  detalle?: string;
  icono: typeof Circle;
}) {
  const estilos =
    estado === "hecho"
      ? "border-ok/30 bg-tag-ok text-ok"
      : estado === "actual"
        ? "border-accent/40 bg-tag-warn text-accent"
        : "border-line bg-card-2 text-ink-4";

  return (
    <li className="flex gap-3">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${estilos}`}>
        {estado === "actual" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : estado === "hecho" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icono className="h-4 w-4" strokeWidth={2} />
        )}
      </span>
      <div className="min-w-0 pt-1">
        <p
          className={`text-sm font-medium ${
            estado === "pendiente" ? "text-ink-4" : "text-ink"
          }`}
        >
          {titulo}
        </p>
        {detalle && <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{detalle}</p>}
      </div>
    </li>
  );
}

// Restaurar PC-VEN1 no crea una falla que seguir en el historial: los pasos
// salen del resumen que devuelve la API (lo que pasó en la consola del VPCS y
// en R1) y, si al restaurar había una falla de IP fuera de VLAN activa, de su
// fila en el tablero hasta que pase a Resuelta.
function PasosRestauracion({
  resumen,
  fallaRelacionada,
}: {
  resumen: ResumenRestauracion;
  fallaRelacionada: FilaHistorial | null;
}) {
  const ipOk = resumen.ip_configurada === resumen.ip_esperada;
  const pingOk = resumen.ping_respuestas > 0;
  const fallaResuelta = fallaRelacionada?.estado === "Resuelta";

  return (
    <ol className="space-y-4 lg:col-span-2">
      <Paso
        estado="hecho"
        icono={CheckCircle2}
        titulo="Escenario solicitado"
        detalle={`La API escribió en la consola de ${resumen.host} en GNS3.`}
      />
      <Paso
        estado={ipOk ? "hecho" : "pendiente"}
        icono={RotateCcw}
        titulo={ipOk ? "IP restaurada" : "La IP no quedó como se esperaba"}
        detalle={
          resumen.ip_configurada
            ? `${resumen.host}: ${resumen.ip_configurada}${resumen.gateway ? ` · gateway ${resumen.gateway}` : ""}`
            : `No se pudo leer la IP en la consola; se esperaba ${resumen.ip_esperada}.`
        }
      />
      <Paso
        estado={pingOk ? "hecho" : "pendiente"}
        icono={Network}
        titulo={pingOk ? "Conectividad con su gateway" : "Sin respuesta del gateway"}
        detalle={`Ping a ${resumen.gateway ?? "192.168.20.1"}: ${resumen.ping_respuestas}/${resumen.ping_enviados} respuestas.`}
      />
      <Paso
        estado="hecho"
        icono={ShieldOff}
        titulo="Cuarentena en R1"
        detalle={
          resumen.cuarentenas_quitadas > 0
            ? `Se quitó la cuarentena que el agente le había puesto a ${resumen.host}.`
            : `${resumen.host} no tenía cuarentena activa.`
        }
      />
      {fallaRelacionada && (
        <Paso
          estado={fallaResuelta ? "hecho" : "actual"}
          icono={Radar}
          titulo={fallaResuelta ? "Falla de IP fuera de VLAN resuelta" : "Esperando que el agente lo vea bien configurado"}
          detalle={
            fallaResuelta
              ? `La falla abierta en ${fallaRelacionada.dispositivo} · ${fallaRelacionada.interfaz ?? ""} pasó a Resuelta.`
              : "La falla que seguía activa se cerrará en el próximo ciclo de monitoreo."
          }
        />
      )}
    </ol>
  );
}

export default function SeguimientoEscenario({
  seguimiento,
  escenario,
  tablero,
  onVerIncidencias,
  onLimpiarSeguimiento,
}: Props) {
  const visual = seguimiento ? visualEscenario(seguimiento.escenarioId) : null;

  const fila = useMemo(() => {
    if (!seguimiento || !visual?.generaFalla) return null;
    return encontrarFilaSeguimiento(seguimiento, tablero.historial);
  }, [seguimiento, tablero.historial, visual?.generaFalla]);

  const activa = useMemo(() => {
    if (!fila) return null;
    return tablero.fallas_activas.find((f) => f.id_falla === fila.id_falla) ?? null;
  }, [fila, tablero.fallas_activas]);

  const agenteActivo = useMemo(() => {
    if (!seguimiento) return true;
    return agentePareceActivo(tablero, seguimiento.solicitadoEn);
  }, [seguimiento, tablero]);

  const faseActual: FaseId | null = useMemo(() => {
    if (!seguimiento) return null;
    if (!visual?.generaFalla) {
      const relacionada = seguimiento.idFallaRelacionada
        ? tablero.historial.find((f) => f.id_falla === seguimiento.idFallaRelacionada)
        : null;
      return relacionada && relacionada.estado !== "Resuelta" ? "solicitado" : "finalizada";
    }
    if (!fila) return "esperando";
    if (fila.estado === "Resuelta") return "finalizada";
    if (fila.clasifico || (activa && activa.nivel)) return "clasificada";
    return "detectada";
  }, [seguimiento, visual?.generaFalla, fila, activa, tablero.historial]);

  function estadoPaso(id: FaseId): "hecho" | "actual" | "pendiente" {
    if (!faseActual) return "pendiente";
    const orden: FaseId[] = ["solicitado", "esperando", "detectada", "clasificada", "finalizada"];
    const i = orden.indexOf(id);
    const actual = orden.indexOf(faseActual);
    if (faseActual === "finalizada") {
      if (id === "esperando") return "hecho";
      return i <= actual ? "hecho" : "pendiente";
    }
    if (id === "esperando" && actual > orden.indexOf("esperando")) return "hecho";
    if (i < actual) return "hecho";
    if (i === actual) return "actual";
    return "pendiente";
  }

  if (!seguimiento) {
    return <DetalleEscenario escenario={escenario} onVerIncidencias={onVerIncidencias} />;
  }

  const nivel = fila?.clasifico ?? activa?.nivel ?? null;
  const comandos =
    activa?.comandos_aplicados?.length
      ? activa.comandos_aplicados
      : fila?.accion ?? [];

  return (
    <div className="rounded-2xl bg-card ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="text-sm font-medium text-ink">Seguimiento en tiempo real</p>
          <p className="mt-0.5 text-xs text-ink-4">
            {seguimiento.escenarioNombre}
            {" · "}
            solicitado {formatearHora(seguimiento.solicitadoEn)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onVerIncidencias && (
            <button
              type="button"
              onClick={onVerIncidencias}
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-3 transition-colors hover:text-accent"
            >
              Ver en Incidencias
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {onLimpiarSeguimiento && faseActual === "finalizada" && (
            <button
              type="button"
              onClick={onLimpiarSeguimiento}
              className="text-xs font-medium text-ink-4 hover:text-ink-2"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 px-5 py-4 lg:grid-cols-2 lg:gap-6">
        {!visual?.generaFalla ? (
          seguimiento.resumen ? (
            <PasosRestauracion
              resumen={seguimiento.resumen}
              fallaRelacionada={
                seguimiento.idFallaRelacionada
                  ? tablero.historial.find((f) => f.id_falla === seguimiento.idFallaRelacionada) ??
                    null
                  : null
              }
            />
          ) : (
            <div className="rounded-xl border border-ok/25 bg-tag-ok/50 px-4 py-3 text-sm text-ok lg:col-span-2">
              Escenario ejecutado. Esta prueba no genera una falla nueva en el historial.
            </div>
          )
        ) : (
          <ol className="space-y-4">
            <Paso
              estado={estadoPaso("solicitado")}
              icono={CheckCircle2}
              titulo="Escenario solicitado"
              detalle="La API aceptó la petición. El laboratorio genera la condición de prueba."
            />
            <Paso
              estado={estadoPaso("esperando")}
              icono={Clock}
              titulo="Esperando detección"
              detalle="El agente la verá en su próximo ciclo de monitoreo."
            />
            <Paso
              estado={estadoPaso("detectada")}
              icono={Radar}
              titulo="Falla detectada"
              detalle={
                fila
                  ? `${fila.dispositivo} · ${nombreTipo(fila.falla)}${fila.interfaz ? ` · ${fila.interfaz}` : ""} · ${formatearHora(fila.detectada)}`
                  : undefined
              }
            />
            <Paso
              estado={estadoPaso("clasificada")}
              icono={comandos.length > 0 ? Wrench : Sparkles}
              titulo={comandos.length > 0 ? "Clasificada · acción del agente" : "Clasificada"}
              detalle={
                fila || activa
                  ? [
                      nivel ? `Nivel: ${nombreNivel(nivel)}` : null,
                      comandos.length > 0
                        ? `Comandos: ${comandos.join(" · ")}`
                        : fila
                          ? textoSoloNotificacion(fila.origen)
                          : "Solo notificación o pendiente de comandos",
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : undefined
              }
            />
            <Paso
              estado={estadoPaso("finalizada")}
              icono={CheckCircle2}
              titulo="Finalizada"
              detalle={
                fila?.estado === "Resuelta"
                  ? `Resuelta${fila.duracion_segundos != null ? ` · duración ${formatearDuracion(fila.duracion_segundos)}` : ""}`
                  : "Cuando deje de observarse en un ciclo, pasará a Resuelta."
              }
            />
          </ol>
        )}

        <div className="space-y-3">
          {visual?.generaFalla && (
            <TopologiaSeguimiento
              equipos={tablero.equipos}
              dispositivoFoco={fila?.dispositivo ?? visual.equipo}
              hostFoco={visual.host}
              estado={
                (fila?.estado === "Resuelta"
                  ? "resuelta"
                  : fila
                    ? "activa"
                    : "esperando") satisfies EstadoTopo
              }
              fila={fila}
              agenteActivo={agenteActivo}
            />
          )}

          {faseActual === "esperando" && agenteActivo && (
            <p className="flex items-center gap-2 text-xs text-ink-4">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
              Escuchando /tablero cada 3 s…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
