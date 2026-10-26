// Formateadores compartidos por los componentes. Replican a propósito el
// mismo criterio que formato.py / dashboard.py (misma duración, mismos
// nombres de nivel y tipo) para que la cifra no cambie según la interfaz.

export function formatearDuracion(segundos: number | null | undefined): string {
  if (segundos === null || segundos === undefined || Number.isNaN(segundos)) {
    return "—";
  }
  const total = Math.floor(segundos);
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segs = total % 60;
  if (horas) return `${horas} h ${minutos} min ${segs} s`;
  if (minutos) return `${minutos} min ${segs} s`;
  return `${segs} s`;
}

export function formatearHora(horaIso: string | null | undefined): string {
  if (!horaIso) return "—";
  const fecha = new Date(horaIso);
  if (Number.isNaN(fecha.getTime())) return horaIso;
  return fecha.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function tiempoDesde(horaIso: string): string {
  const fecha = new Date(horaIso);
  if (Number.isNaN(fecha.getTime())) return "—";
  const segundos = Math.max((Date.now() - fecha.getTime()) / 1000, 0);
  return formatearDuracion(segundos);
}

const TIPO_DISPLAY: Record<string, string> = {
  interfaz_caida: "Interfaz caída",
  puerto_saturado: "Puerto saturado",
  ip_fuera_de_vlan: "IP fuera de VLAN",
};

export function nombreTipo(tipo: string): string {
  return TIPO_DISPLAY[tipo] ?? tipo;
}

const NIVEL_DISPLAY: Record<string, string> = {
  groq: "Groq",
  deepseek: "DeepSeek",
  ollama: "Ollama",
  reglas: "Reglas fijas",
};

// Texto de la columna Acción cuando el agente no aplicó comandos.
export function textoSoloNotificacion(origen: string | null): string {
  return `Solo notificación (origen: ${origen ?? "no identificado"})`;
}

export function nombreNivel(nivel: string | null): string {
  return nivel ? NIVEL_DISPLAY[nivel] ?? nivel : "—";
}
