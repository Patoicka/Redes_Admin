import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { resumenNiveles } from "../../agregaciones";
import { COLOR_DONA_VACIA } from "../../colores";

interface PayloadDona {
  etiqueta: string;
  valor: number;
}

function TooltipDona({ active, payload }: { active?: boolean; payload?: Array<{ payload: PayloadDona }> }) {
  if (!active || !payload?.length) return null;
  const { etiqueta, valor } = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-card-2 px-3 py-2 text-xs text-ink shadow-lg shadow-black/40">
      <p className="font-medium">{etiqueta}</p>
      <p className="mt-0.5 text-ink-3">
        {valor} falla{valor === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export default function DonaNiveles({ niveles }: { niveles: Record<string, number> }) {
  const resumen = resumenNiveles(niveles);
  const total = resumen.reduce((acc, n) => acc + n.valor, 0);

  const segmentos = resumen.filter((n) => n.valor > 0);
  const datosDona =
    segmentos.length > 0
      ? segmentos
      : [
          {
            nivel: "vacio",
            etiqueta: "Sin datos",
            valor: 0,
            porcentaje: 0,
            colorDona: COLOR_DONA_VACIA,
            colorPildoraBg: "#131B1E",
            colorPildoraTexto: "#849399",
          },
        ];

  return (
    <div className="flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-line">
      <p className="text-sm font-medium text-ink">Clasificación por nivel</p>
      <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-5">
        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={datosDona}
                dataKey="valor"
                nameKey="etiqueta"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={segmentos.length > 1 ? 3 : 0}
                stroke="none"
                isAnimationActive={false}
              >
                {datosDona.map((n) => (
                  <Cell key={n.nivel} fill={n.colorDona} />
                ))}
              </Pie>
              {segmentos.length > 0 && <Tooltip content={<TooltipDona />} />}
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold text-ink tabular-nums">{total}</span>
            <span className="text-[11px] text-ink-3">clasificadas</span>
          </div>
        </div>
        <ul className="w-full space-y-2">
          {resumen.map((n) => (
            <li key={n.nivel} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-ink-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: n.colorDona }} />
                {n.etiqueta}
              </span>
              <span className="flex items-center gap-2 text-xs tabular-nums">
                <span className="text-ink-4">{n.valor}</span>
                <span
                  className="rounded-md px-2 py-0.5 font-semibold"
                  style={{ backgroundColor: n.colorPildoraBg, color: n.colorPildoraTexto }}
                >
                  {n.porcentaje.toFixed(0)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
