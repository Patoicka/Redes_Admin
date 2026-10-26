import {
  Cable,
  FlaskConical,
  MonitorSmartphone,
  Network,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

export interface EscenarioVisual {
  icono: LucideIcon;
  color: string;
  colorBg: string;
  equipo: string | null;
  /** Host documentado involucrado (p. ej. PC-VEN1), si aplica. */
  host: string | null;
  /** Valor `falla` en el historial de la API, si aplica. */
  tipoApi: string | null;
  /** Interfaz esperada en el historial, si el escenario la fija. */
  interfaz: string | null;
  tipo: string;
  pasos: string[];
  notas: string[];
  /** Si false, el escenario no genera una falla observable en /tablero. */
  generaFalla: boolean;
}

const BASE: Record<string, EscenarioVisual> = {
  interfaz_caida_r1: {
    icono: Cable,
    color: "#FF5D5D",
    colorBg: "#241613",
    equipo: "R1",
    host: null,
    tipoApi: "interfaz_caida",
    interfaz: "ether3",
    tipo: "Interfaz caída",
    generaFalla: true,
    pasos: [
      "Se solicita el escenario a la API.",
      "El laboratorio deshabilita una interfaz predefinida en R1.",
      "El agente revisa el laboratorio en su siguiente ciclo.",
      "Si detecta la falla, la clasifica con la cascada de IA.",
      "Cuando corresponde, vuelve a habilitar la interfaz.",
      "El resultado se consulta en Incidencias.",
    ],
    notas: [
      "Tras rehabilitar la interfaz, el agente vuelve a revisar enseguida para confirmar la corrección.",
    ],
  },
  puerto_saturado_sw1: {
    icono: Network,
    color: "#FFB547",
    colorBg: "#292014",
    equipo: "SW1",
    host: "PC-ADMIN",
    tipoApi: "puerto_saturado",
    interfaz: null,
    tipo: "Puerto saturado",
    generaFalla: true,
    pasos: [
      "Se solicita el escenario de saturación controlada.",
      "Se genera tráfico hacia un puerto de SW1.",
      "El agente detecta la saturación en un ciclo posterior.",
      "Clasifica la falla y, según el origen, notifica o aplica una cola.",
      "La saturación se detiene sola a los 40 s y la falla pasa a Resuelta.",
      "Consulta el resultado en Incidencias.",
    ],
    notas: [
      "En algunos casos el agente solo notifica, según el origen del tráfico.",
      "El tráfico de prueba dura 40 segundos.",
    ],
  },
  ip_fuera_de_vlan: {
    icono: MonitorSmartphone,
    color: "#20D9E8",
    colorBg: "#0a2226",
    equipo: "R1",
    host: "PC-VEN1",
    tipoApi: "ip_fuera_de_vlan",
    interfaz: null,
    tipo: "IP fuera de VLAN",
    generaFalla: true,
    pasos: [
      "Se solicita el escenario de IP fuera de VLAN.",
      "Un host (p. ej. PC-VEN1) queda con una IP que no corresponde a su VLAN.",
      "El sniffer ARP de R1 detecta la inconsistencia.",
      "El agente clasifica y aplica cuarentena; con el host aislado, la falla pasa a Resuelta.",
      "Para recuperar el host o repetir la prueba: «Restaurar IP de PC-VEN1».",
      "Consulta el resultado en Incidencias.",
    ],
    notas: [
      "«Restaurar IP de PC-VEN1» devuelve el host a su IP original y le quita la cuarentena.",
    ],
  },
  restaurar_pc_ven1: {
    icono: RotateCcw,
    color: "#00D6A0",
    colorBg: "#09251F",
    equipo: "SW2",
    host: "PC-VEN1",
    tipoApi: null,
    interfaz: null,
    tipo: "Restauración",
    generaFalla: false,
    pasos: [
      "Se solicita restaurar la IP de PC-VEN1.",
      "El laboratorio restablece la dirección documentada de la VLAN 20.",
      "Útil tras la prueba de IP fuera de VLAN.",
      "También quita la cuarentena que el agente le haya puesto en R1.",
    ],
    notas: [
      "Para borrar todo lo que creó el agente (colas, reglas), usa «Limpiar laboratorio».",
    ],
  },
};

const FALLBACK: EscenarioVisual = {
  icono: FlaskConical,
  color: "#FFB547",
  colorBg: "#292014",
  equipo: null,
  host: null,
  tipoApi: null,
  interfaz: null,
  tipo: "Prueba controlada",
  generaFalla: true,
  pasos: [
    "Se solicita el escenario a la API.",
    "El laboratorio genera la condición de prueba.",
    "El agente la evalúa en su siguiente ciclo de monitoreo.",
    "El resultado puede consultarse en Incidencias.",
  ],
  notas: [
    "El agente revisa los equipos de forma continua.",
  ],
};

export function visualEscenario(id: string): EscenarioVisual {
  return BASE[id] ?? FALLBACK;
}
