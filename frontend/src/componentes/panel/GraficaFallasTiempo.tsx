import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import { bucketFallasPorHora, bucketFallasPorSemana } from "../../agregaciones";
import { COLOR_EJE, COLOR_REJILLA, COLOR_SERIE_PRINCIPAL } from "../../colores";
import type { FilaHistorial } from "../../tipos";

type Rango = "hoy" | "semana";

const ETIQUETA_RANGO: Record<Rango, string> = {
  hoy: "Hoy",
  semana: "Semana",
};

function TooltipOscuro({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const valor = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-lg border border-line bg-card-2 px-3 py-2 text-xs text-ink shadow-lg shadow-black/40">
      <p className="font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-ink-3">
        {valor} incidencia{valor === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export default function GraficaFallasTiempo({ historial }: { historial: FilaHistorial[] }) {
  const [rango, setRango] = useState<Rango>("hoy");
  const datos = useMemo(
    () => (rango === "hoy" ? bucketFallasPorHora(historial) : bucketFallasPorSemana(historial)),
    [historial, rango],
  );

  return (
    <div className="flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">Tendencia de incidencias</p>
        <div className="flex rounded-lg bg-card-2 p-0.5 text-xs">
          {(["hoy", "semana"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRango(r)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors duration-150 ${
                rango === r ? "bg-accent text-page" : "text-ink-3 hover:text-ink"
              }`}
            >
              {ETIQUETA_RANGO[r]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 min-h-[220px] flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={220}>
          <AreaChart data={datos} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="fallasArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_SERIE_PRINCIPAL} stopOpacity={0.22} />
                <stop offset="100%" stopColor={COLOR_SERIE_PRINCIPAL} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLOR_REJILLA} vertical={false} strokeDasharray="3 6" />
            <XAxis
              dataKey="etiqueta"
              tick={{ fontSize: 11, fill: COLOR_EJE, fontFamily: "Inter, sans-serif" }}
              axisLine={false}
              tickLine={false}
              interval={rango === "hoy" ? 2 : 0}
              dy={6}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: COLOR_EJE, fontFamily: "Inter, sans-serif" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={TooltipOscuro} cursor={{ stroke: COLOR_REJILLA, strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="valor"
              stroke={COLOR_SERIE_PRINCIPAL}
              strokeWidth={2}
              fill="url(#fallasArea)"
              dot={false}
              activeDot={{ r: 4, fill: COLOR_SERIE_PRINCIPAL, stroke: "#05090c", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
