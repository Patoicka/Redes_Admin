// Calzan 1:1 con los modelos Pydantic de api/esquemas.py.

export interface FallaBanner {
  dispositivo: string;
  interfaz: string | null;
}

export interface Banner {
  estado: "ok" | "alerta";
  fallas: FallaBanner[];
}

export interface Indicadores {
  fallas_detectadas: number;
  pct_corregidas: number;
  promedio_resolucion_segundos: number | null;
  notificaciones_enviadas: number;
}

export interface FallaActiva {
  id_falla: string;
  dispositivo: string;
  tipo: string;
  interfaz: string | null;
  desde: string;
  nivel: string | null;
  comandos_aplicados: string[];
}

export interface Equipo {
  nombre: string;
  ip: string;
  rol: string;
  en_linea: boolean | null;
  ultima_revision: string | null;
}

export interface FilaHistorial {
  id_falla: string;
  detectada: string;
  dispositivo: string;
  falla: string;
  interfaz: string | null;
  clasifico: string | null;
  accion: string[];
  origen: string | null;
  duracion_segundos: number | null;
  estado: "Activa" | "Resuelta";
}

export interface Tablero {
  hora_servidor: string;
  banner: Banner;
  indicadores: Indicadores;
  fallas_activas: FallaActiva[];
  equipos: Equipo[];
  niveles: Record<string, number>;
  historial: FilaHistorial[];
  telegram_configurado: boolean;
}

// --- Panel de demostración ---

export interface EscenarioInfo {
  id: string;
  nombre: string;
  descripcion: string;
  disponible: boolean;
}

/** Lo que hizo un escenario que no genera falla (hoy, restaurar_pc_ven1). */
export interface ResumenRestauracion {
  host: string;
  ip_esperada: string;
  ip_configurada: string | null;
  gateway: string | null;
  ping_respuestas: number;
  ping_enviados: number;
  cuarentenas_quitadas: number;
}

export interface ResultadoEscenario {
  ejecutado: boolean;
  salida: string;
  resumen: ResumenRestauracion | null;
}

export interface FallasIA {
  groq: boolean;
  deepseek: boolean;
  ollama: boolean;
}

export interface ResultadoLimpieza {
  dispositivo: string;
  ok: boolean;
  detalle: string;
}
