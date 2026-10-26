import { AlertTriangle, CheckCircle2, Monitor, Network, Router, Server } from "lucide-react";
import { ordenarCadenaEquipos } from "../../agregaciones";
import { ENLACES_TRUNK, HOSTS_LABORATORIO } from "../../laboratorio";
import { nombreTipo } from "../../formato";
import type { Equipo, FilaHistorial } from "../../tipos";

export type EstadoTopo = "esperando" | "activa" | "resuelta";

interface Props {
  equipos: Equipo[];
  dispositivoFoco: string | null;
  hostFoco: string | null;
  estado: EstadoTopo;
  fila: FilaHistorial | null;
  agenteActivo?: boolean;
}

function IconoEquipo({ rol }: { rol: string }) {
  const r = rol.toLowerCase();
  if (r.includes("router")) return <Router className="h-5 w-5" strokeWidth={1.75} />;
  if (r.includes("switch")) return <Network className="h-5 w-5" strokeWidth={1.75} />;
  return <Server className="h-5 w-5" strokeWidth={1.75} />;
}

function clasesNodo(enLinea: boolean | null) {
  if (enLinea === true) return "border-ok/45 bg-ok/10 text-ok";
  if (enLinea === false) return "border-danger/45 bg-danger/10 text-danger";
  return "border-line bg-card-2 text-ink-3";
}

function anilloFoco(esFoco: boolean, estado: EstadoTopo) {
  if (!esFoco) return "border-line/80 bg-card-2/40";
  if (estado === "activa") {
    return "border-danger/55 bg-danger/10 shadow-[0_0_0_1px_rgba(255,93,93,0.25)] animate-pulse";
  }
  if (estado === "resuelta") {
    return "border-ok/55 bg-ok/10 shadow-[0_0_0_1px_rgba(0,214,160,0.2)]";
  }
  return "border-accent/50 bg-accent/8 shadow-[0_0_0_1px_rgba(255,181,71,0.15)]";
}

export default function TopologiaSeguimiento({
  equipos,
  dispositivoFoco,
  hostFoco,
  estado,
  fila,
  agenteActivo = true,
}: Props) {
  const cadena = ordenarCadenaEquipos(equipos);

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-card-2/30">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(38,48,51,0.9) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      />

      <div className="relative px-3 py-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-medium tracking-wide text-ink-4 uppercase">
            Topología en vivo
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-ink-4">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Esperando
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Detectada
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Corregida
            </span>
          </div>
        </div>

        {cadena.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-4">Sin equipos en /tablero.</p>
        ) : (
          <div className="flex flex-wrap items-start justify-center gap-y-4">
            {cadena.map((equipo, i) => {
              const esFoco = dispositivoFoco === equipo.nombre;
              const trunk = ENLACES_TRUNK.find(
                (e) => e.desde === equipo.nombre && e.hacia === cadena[i + 1]?.nombre,
              );
              const hosts = HOSTS_LABORATORIO.filter(
                (h) => h.conectadoA === equipo.nombre.toUpperCase(),
              );

              return (
                <div key={equipo.nombre} className="flex items-start">
                  <div className="flex w-[7.5rem] flex-col items-center sm:w-[8.25rem]">
                    <div
                      className={`relative flex w-full flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-all duration-300 ${anilloFoco(esFoco, estado)}`}
                    >
                      <div className="relative">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${clasesNodo(equipo.en_linea)}`}
                        >
                          <IconoEquipo rol={equipo.rol} />
                        </div>
                        {esFoco && estado === "activa" && (
                          <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-tag-danger text-danger ring-2 ring-card">
                            <AlertTriangle className="h-2.5 w-2.5" />
                          </span>
                        )}
                        {esFoco && estado === "resuelta" && (
                          <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-tag-ok text-ok ring-2 ring-card">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-ink">{equipo.nombre}</p>
                      <p className="text-[9px] tracking-wide text-ink-4 uppercase">{equipo.rol}</p>
                    </div>

                    {hosts.length > 0 && (
                      <div className="mt-2 w-full space-y-1">
                        <div className="mx-auto h-2 w-px border-l border-dashed border-ink-4/50" />
                        {hosts.map((h) => {
                          const hostFocoActivo = hostFoco === h.nombre;
                          return (
                            <div
                              key={h.nombre}
                              className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1 transition-all duration-300 ${
                                hostFocoActivo
                                  ? anilloFoco(true, estado)
                                  : "border-line/60 bg-card/40"
                              }`}
                            >
                              <Monitor className="h-3 w-3 shrink-0 text-ink-4" strokeWidth={2} />
                              <p className="truncate text-[10px] font-medium text-ink">{h.nombre}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {cadena[i + 1] && (
                    <div className="mt-6 flex w-10 flex-col items-center sm:w-12" aria-hidden>
                      <div className="h-px w-full border-t border-dashed border-info/45" />
                      {trunk && (
                        <p className="mt-1 text-center text-[8px] leading-tight text-ink-4">
                          {trunk.interfazDesde}↔{trunk.interfazHacia}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 border-t border-line/60 pt-2.5">
          {fila ? (
            <p className="text-center text-[11px] leading-relaxed text-ink-3">
              <span className="font-medium text-ink">{fila.dispositivo}</span>
              {" · "}
              {nombreTipo(fila.falla)}
              {fila.interfaz ? ` · ${fila.interfaz}` : ""}
              {" · "}
              <span className={fila.estado === "Activa" ? "text-danger" : "text-ok"}>
                {fila.estado}
              </span>
            </p>
          ) : (
            <p className="text-center text-[11px] text-ink-4">
              {agenteActivo
                ? dispositivoFoco
                  ? `Esperando detección en ${dispositivoFoco}${hostFoco ? ` / ${hostFoco}` : ""}…`
                  : "Esperando detección del agente…"
                : "El agente no está ciclando. Arranca monitoreo.py."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
