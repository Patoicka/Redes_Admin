import { Network, Router, Server } from "lucide-react";
import { ordenarCadenaEquipos } from "../../agregaciones";
import type { Equipo } from "../../tipos";

function IconoRol({ rol }: { rol: string }) {
  const r = rol.toLowerCase();
  if (r.includes("router")) return <Router className="h-4 w-4" strokeWidth={1.75} />;
  if (r.includes("switch")) return <Network className="h-4 w-4" strokeWidth={1.75} />;
  return <Server className="h-4 w-4" strokeWidth={1.75} />;
}

function colorEstado(enLinea: boolean | null): {
  nodo: string;
  punto: string;
  etiqueta: string;
} {
  if (enLinea === true) {
    return {
      nodo: "border-ok/40 bg-ok/10 text-ok",
      punto: "bg-ok",
      etiqueta: "En línea",
    };
  }
  if (enLinea === false) {
    return {
      nodo: "border-danger/40 bg-danger/10 text-danger",
      punto: "bg-danger",
      etiqueta: "Sin respuesta",
    };
  }
  return {
    nodo: "border-line bg-card-2 text-ink-3",
    punto: "bg-ink-4",
    etiqueta: "Sin datos",
  };
}

function enlaceActivo(a: Equipo, b: Equipo): boolean {
  return a.en_linea === true && b.en_linea === true;
}

export default function Topologia({ equipos }: { equipos: Equipo[] }) {
  const cadena = ordenarCadenaEquipos(equipos);

  if (cadena.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-line">
        <p className="text-sm font-medium text-ink">Topología del laboratorio</p>
        <p className="mt-4 text-sm text-ink-3">Sin equipos configurados en dispositivos.yaml.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-line">
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-ink">Topología del laboratorio</p>
        <p className="text-[11px] text-ink-4">192.168.56.0/24</p>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center gap-4">
        <div className="flex w-full flex-wrap items-center justify-center">
          {cadena.map((equipo, i) => {
            const estado = colorEstado(equipo.en_linea);
            const siguiente = cadena[i + 1];
            return (
              <div key={equipo.nombre} className="flex items-center">
                <div className="flex w-[6.5rem] flex-col items-center gap-1.5 text-center">
                  <div className="relative">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${estado.nodo}`}
                    >
                      <IconoRol rol={equipo.rol} />
                    </div>
                    <span
                      className={`absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full ring-2 ring-card ${estado.punto}`}
                      title={estado.etiqueta}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink">{equipo.nombre}</p>
                    <p className="mono text-[10px] text-ink-4">{equipo.ip}</p>
                  </div>
                </div>

                {siguiente && (
                  <div className="mx-0.5 flex w-8 flex-col items-center sm:w-10" aria-hidden>
                    <div
                      className={`h-px w-full border-t-2 border-dashed ${
                        enlaceActivo(equipo, siguiente) ? "border-info/70" : "border-danger/40"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" /> En línea
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Sin respuesta
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-4" /> Sin datos
          </span>
        </div>
      </div>
    </div>
  );
}
