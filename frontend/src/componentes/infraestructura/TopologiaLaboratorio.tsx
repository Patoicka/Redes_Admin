import { AlertTriangle, Monitor, Network, Router, Server } from "lucide-react";
import {
  ENLACES_TRUNK,
  HOSTS_LABORATORIO,
  RED_GESTION,
  vlanPorId,
  type HostLaboratorio,
} from "../../laboratorio";
import { ordenarCadenaEquipos } from "../../agregaciones";
import type { Equipo, FallaActiva } from "../../tipos";

interface Props {
  equipos: Equipo[];
  fallasActivas: FallaActiva[];
  seleccionado: string | null;
  onSeleccionar?: (nombre: string) => void;
  compacto?: boolean;
}

function IconoEquipo({ rol }: { rol: string }) {
  const r = rol.toLowerCase();
  if (r.includes("router")) return <Router className="h-6 w-6" strokeWidth={1.75} />;
  if (r.includes("switch")) return <Network className="h-6 w-6" strokeWidth={1.75} />;
  return <Server className="h-6 w-6" strokeWidth={1.75} />;
}

function IconoHost({ nombre }: { nombre: string }) {
  if (nombre.startsWith("SRV")) return <Server className="h-3.5 w-3.5" strokeWidth={2} />;
  return <Monitor className="h-3.5 w-3.5" strokeWidth={2} />;
}

function clasesEstado(enLinea: boolean | null) {
  if (enLinea === true) {
    return {
      nodo: "border-ok/45 bg-ok/10 text-ok",
      punto: "bg-ok",
      label: "En línea",
    };
  }
  if (enLinea === false) {
    return {
      nodo: "border-danger/45 bg-danger/10 text-danger",
      punto: "bg-danger",
      label: "Fuera de línea",
    };
  }
  return {
    nodo: "border-line bg-card-2 text-ink-3",
    punto: "bg-ink-4",
    label: "Sin verificar",
  };
}

function HostCard({ host }: { host: HostLaboratorio }) {
  const vlan = vlanPorId(host.vlan);
  return (
    <div
      className="group relative flex items-center gap-2 rounded-lg border border-line/80 bg-card-2/50 px-2.5 py-1.5"
      title={`${host.nombre} · ${host.ip} · VLAN ${host.vlan} (documentado)`}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{
          backgroundColor: vlan?.colorBg ?? "#131b1e",
          color: vlan?.color ?? "#849399",
        }}
      >
        <IconoHost nombre={host.nombre} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-ink">{host.nombre}</p>
        <p className="mono truncate text-[10px] text-ink-4">{host.ip}</p>
      </div>
      <span
        className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
        style={{
          backgroundColor: vlan?.colorBg ?? "#131b1e",
          color: vlan?.color ?? "#849399",
        }}
      >
        VLAN {host.vlan}
      </span>
    </div>
  );
}

export default function TopologiaLaboratorio({
  equipos,
  fallasActivas,
  seleccionado,
  onSeleccionar,
  compacto = false,
}: Props) {
  const cadena = ordenarCadenaEquipos(equipos);
  const fallasPorEquipo = new Set(fallasActivas.map((f) => f.dispositivo));

  if (cadena.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-6 ring-1 ring-line">
        <p className="text-sm font-medium text-ink">Topología del laboratorio</p>
        <p className="mt-3 text-sm text-ink-3">Sin equipos configurados.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-line">
      {/* Cuadrícula técnica sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(38,48,51,0.9) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">Topología del laboratorio</p>
            <p className="mt-0.5 text-xs text-ink-4">
              Cadena de gestión · {RED_GESTION}
              <span className="text-ink-4/80"> · enlaces documentados</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" /> En línea
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Fuera de línea
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-4" /> Sin verificar
            </span>
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-warn" /> Con incidencias
            </span>
          </div>
        </div>

        {/* Cadena principal */}
        <div className="mt-8 flex flex-wrap items-start justify-center gap-y-6">
          {cadena.map((equipo, i) => {
            const estado = clasesEstado(equipo.en_linea);
            const activo = seleccionado === equipo.nombre;
            const conFallas = fallasPorEquipo.has(equipo.nombre);
            const trunk = ENLACES_TRUNK.find(
              (e) => e.desde === equipo.nombre && e.hacia === cadena[i + 1]?.nombre,
            );
            const hosts = HOSTS_LABORATORIO.filter(
              (h) => h.conectadoA === equipo.nombre.toUpperCase(),
            );

            return (
              <div key={equipo.nombre} className="flex items-start">
                <div className="flex w-[9.5rem] flex-col items-center sm:w-[10.5rem]">
                  <button
                    type="button"
                    onClick={() => onSeleccionar?.(equipo.nombre)}
                    disabled={!onSeleccionar}
                    className={`relative flex w-full flex-col items-center gap-2 rounded-2xl border px-3 py-3 text-center transition-all duration-150 ${
                      activo
                        ? "border-accent/50 bg-accent/10 shadow-[0_0_0_1px_rgba(255,181,71,0.2)]"
                        : "border-line/80 bg-card-2/40 hover:border-ink-4 hover:bg-card-2/70"
                    } ${!onSeleccionar ? "cursor-default" : ""}`}
                  >
                    <div className="relative">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${estado.nodo}`}
                      >
                        <IconoEquipo rol={equipo.rol} />
                      </div>
                      <span
                        className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${estado.punto}`}
                        title={estado.label}
                      />
                      {conFallas && (
                        <span
                          className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-tag-warn text-warn ring-2 ring-card"
                          title="Incidencias activas"
                        >
                          <AlertTriangle className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{equipo.nombre}</p>
                      <p className="text-[10px] tracking-wide text-ink-4 uppercase">{equipo.rol}</p>
                      <p className="mono mt-0.5 text-[11px] text-ink-3">{equipo.ip}</p>
                    </div>
                  </button>

                  {!compacto && hosts.length > 0 && (
                    <div className="mt-3 w-full space-y-1.5">
                      <div className="mx-auto h-3 w-px border-l border-dashed border-ink-4/60" />
                      {hosts.map((h) => (
                        <HostCard key={h.nombre} host={h} />
                      ))}
                    </div>
                  )}
                </div>

                {cadena[i + 1] && (
                  <div className="mt-8 flex w-14 flex-col items-center sm:w-20" aria-hidden>
                    <div className="relative flex w-full items-center">
                      <div className="h-px flex-1 border-t-2 border-dashed border-info/50" />
                      <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border border-info/30 bg-card px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-info uppercase">
                        Trunk
                      </span>
                    </div>
                    {trunk && (
                      <p className="mt-2 text-center text-[9px] leading-tight text-ink-4">
                        {trunk.interfazDesde} ↔ {trunk.interfazHacia}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] text-ink-4">
          Los hosts y VLANs son configuración documentada del laboratorio. Solo R1, SW1 y SW2
          reportan estado en vivo desde la API.
        </p>
      </div>
    </div>
  );
}
