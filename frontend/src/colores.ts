// Paleta del panel: fondos carbón, ámbar como identidad, naranja actividad,
// esmeralda estabilidad, cian tiempo real. La dona de niveles usa 4 acentos
// distintos (un nivel = un color) en el orden de la cascada.
export const NIVEL_ORDEN = ["groq", "deepseek", "ollama", "reglas"] as const;

export const NIVEL_DISPLAY: Record<string, string> = {
  groq: "Groq",
  deepseek: "DeepSeek",
  ollama: "Ollama",
  reglas: "Reglas fijas",
};

export const NIVEL_COLOR_DONA: Record<string, string> = {
  groq: "#FFB547",
  deepseek: "#FF7A30",
  ollama: "#20D9E8",
  reglas: "#00D6A0",
};

// Fondos oscuros de píldora (sección 5 de la paleta).
export const NIVEL_COLOR_PILDORA_BG: Record<string, string> = {
  groq: "#292014",
  deepseek: "#292014",
  ollama: "#0a2226",
  reglas: "#09251F",
};

export const NIVEL_COLOR_PILDORA_TEXTO: Record<string, string> = {
  groq: "#FFB547",
  deepseek: "#FF7A30",
  ollama: "#20D9E8",
  reglas: "#00D6A0",
};

// Serie principal de la gráfica de fallas en el tiempo (ámbar identidad).
export const COLOR_SERIE_PRINCIPAL = "#FFB547";
export const COLOR_EJE = "#849399";
export const COLOR_REJILLA = "#263033";
export const COLOR_DONA_VACIA = "#263033";
