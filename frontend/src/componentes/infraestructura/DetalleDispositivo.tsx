import { AlertTriangle, ArrowRight, Network, Router, Server } from "lucide-react";
import { formatearHora, nombreNivel, nombreTipo, tiempoDesde } from "../../formato";
import { hostsDeEquipo, RED_GESTION } from "../../laboratorio";
import type { Equipo, FallaActiva } from "../../tipos";
import Pildora, { type VariantePildora } from "../comunes/Pildora";

interface Props {
  equipo: Equipo | null;
  fallas: FallaActiva[];
  onVerIncidencias?: () => void;
}

function IconoRol({ rol }: { rol: string }) {
  const r = rol.toLowerCase();
  if (r.includes("router")) return <Router className="h-5 w-5" strokeWidth={1.75} />;
  if (r.includes("switch")) return <Network className="h-5 w-5" strokeWidth={1.75} />;
  return <Server className="h-5 w-5" strokeWidth={1.75} />;
}

function estadoEquipo(equipo: Equipo): { texto: string; variante: VariantePildora } {
  if (equipo.en_linea === null) return { texto: "Sin verificar", variante: "muted" };
  return equipo.en_linea
    ? { texto: "En línea", variante: "ok" }
    : { texto: "Fuera de línea", variante: "critica" };
}

export default function DetalleDispositivo({ equipo, fallas, onVerIncidencias }: Props) {
  if (!equipo) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl bg-card p-6 text-center ring-1 ring-line">
        <p className="text-sm font-medium text-ink-2">Sin selección</p>
        <p className="mt-1 max-w-[240px] text-xs text-ink-4">
          Selecciona un dispositivo en la topología o en la tabla para ver sus detalles.
        </p>
      </div>
    );
  }

  const estado = estadoEquipo(equipo);
  const hosts = hostsDeEquipo(equipo.nombre);
  const fallasEquipo = fallas.filter((f) => f.dispositivo === equipo.nombre);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl bg-card ring-1 ring-line">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card-2 text-accent ring-1 ring-line">
          <IconoRol rol={equipo.rol} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-ink">{equipo.nombre}</p>
            <Pildora texto={estado.texto} variante={estado.variante} />
          </div>
          <p className="mt-0.5 text-sm capitalize text-ink-3">{equipo.rol} · MikroTik RouterOS v7</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-medium tracking-wide text-ink-4 uppercase">IP de gestión</dt>
            <dd className="mono mt-0.5 text-sm text-ink">{equipo.ip}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium tracking-wide text-ink-4 uppercase">Red de gestión</dt>
            <dd className="mono mt-0.5 text-sm text-ink-2">{RED_GESTION}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-medium tracking-wide text-ink-4 uppercase">Última revisión</dt>
            <dd className="mt-0.5 text-sm text-ink-2">
              {equipo.ultima_revision ? formatearHora(equipo.ultima_revision) : "Sin revisión"}
            </dd>
          </div>
        </dl>

        {hosts.length > 0 && (
          <div>
            <p className="text-[11px] font-medium tracking-wide text-ink-4 uppercase">
              Hosts documentados
            </p>
            <ul className="mt-2 space-y-1.5">
              {hosts.map((h) => (
                <li
                  key={h.nombre}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line/80 bg-card-2/40 px-2.5 py-1.5 text-xs"
                >
                  <span className="font-medium text-ink-2">{h.nombre}</span>
                  <span className="mono text-ink-4">{h.ip}</span>
                  <span className="text-ink-4">VLAN {h.vlan}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-ink-4">
              Configuración del laboratorio; no son estados verificados por la API.
            </p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium tracking-wide text-ink-4 uppercase">
              Incidencias activas ({fallasEquipo.length})
            </p>
            {onVerIncidencias && (
              <button
                type="button"
                onClick={onVerIncidencias}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-3 transition-colors hover:text-accent"
              >
                Ver todas
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {fallasEquipo.length === 0 ? (
            <p className="mt-2 text-xs text-ink-4">Sin incidencias activas en este dispositivo.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {fallasEquipo.map((f) => (
                <li
                  key={f.id_falla}
                  className="rounded-lg border border-danger/20 bg-tag-danger/50 px-2.5 py-2"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-danger">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {nombreTipo(f.tipo)}
                  </div>
                  <p className="mt-1 text-[11px] text-ink-3">
                    <span className="mono">{f.interfaz ?? "—"}</span>
                    {" · "}
                    hace {tiempoDesde(f.desde)}
                    {" · "}
                    {nombreNivel(f.nivel)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
