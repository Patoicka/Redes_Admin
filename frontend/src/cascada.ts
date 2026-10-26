import { Bot, Cpu, ShieldCheck, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  NIVEL_COLOR_DONA,
  NIVEL_COLOR_PILDORA_BG,
  NIVEL_COLOR_PILDORA_TEXTO,
  NIVEL_DISPLAY,
  NIVEL_ORDEN,
} from "./colores";

export interface NivelCascadaMeta {
  id: (typeof NIVEL_ORDEN)[number];
  etapa: number;
  etiqueta: string;
  rol: string;
  descripcion: string;
  explicacion: string;
  icono: LucideIcon;
  color: string;
  colorBg: string;
  colorTexto: string;
}

const ICONOS: Record<(typeof NIVEL_ORDEN)[number], LucideIcon> = {
  groq: Sparkles,
  deepseek: Cpu,
  ollama: Bot,
  reglas: ShieldCheck,
};

const ROLES: Record<(typeof NIVEL_ORDEN)[number], string> = {
  groq: "Primer intento",
  deepseek: "Segundo intento",
  ollama: "Tercer intento",
  reglas: "Respaldo determinista",
};

const DESCRIPCIONES: Record<(typeof NIVEL_ORDEN)[number], string> = {
  groq: "IA rápida en la nube: primer intento de clasificación.",
  deepseek: "IA alternativa cuando Groq no obtiene un resultado válido.",
  ollama: "Modelo local cuando los servicios externos no clasifican.",
  reglas: "Última línea de defensa: reglas fijas que no fallan.",
};

const EXPLICACIONES: Record<(typeof NIVEL_ORDEN)[number], string> = {
  groq: "Se intenta clasificar la falla mediante el primer modelo.",
  deepseek: "Si el resultado anterior no es válido, se utiliza el segundo nivel.",
  ollama: "Cuando los servicios anteriores no consiguen clasificar, se intenta con el modelo local.",
  reglas: "Si ninguno de los anteriores funciona, se aplican reglas deterministas.",
};

export const NIVELES_CASCADA: NivelCascadaMeta[] = NIVEL_ORDEN.map((id, i) => ({
  id,
  etapa: i + 1,
  etiqueta: NIVEL_DISPLAY[id],
  rol: ROLES[id],
  descripcion: DESCRIPCIONES[id],
  explicacion: EXPLICACIONES[id],
  icono: ICONOS[id],
  color: NIVEL_COLOR_DONA[id],
  colorBg: NIVEL_COLOR_PILDORA_BG[id],
  colorTexto: NIVEL_COLOR_PILDORA_TEXTO[id],
}));

export function metaNivel(id: string | null): NivelCascadaMeta | undefined {
  if (!id) return undefined;
  return NIVELES_CASCADA.find((n) => n.id === id);
}
