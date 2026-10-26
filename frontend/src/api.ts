import { useEffect, useRef, useState } from "react";
import type { EscenarioInfo, FallasIA, ResultadoEscenario, ResultadoLimpieza, Tablero } from "./tipos";

export const BASE_URL = "http://127.0.0.1:8000/api";

const INTERVALO_MS = 3000;
// Dos fallos de polling seguidos (≈6 s) antes de marcar "Sin conexión": un
// solo fallo puntual de red no debe hacer parpadear el indicador.
const FALLOS_PARA_DESCONECTAR = 2;

async function obtenerTablero(): Promise<Tablero> {
  const resp = await fetch(`${BASE_URL}/tablero`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export function useTablero(): { tablero: Tablero | null; enVivo: boolean } {
  const [tablero, setTablero] = useState<Tablero | null>(null);
  const [enVivo, setEnVivo] = useState(true);
  const fallosConsecutivos = useRef(0);

  useEffect(() => {
    let cancelado = false;

    async function ciclo() {
      try {
        const datos = await obtenerTablero();
        if (cancelado) return;
        fallosConsecutivos.current = 0;
        setTablero(datos);
        setEnVivo(true);
      } catch {
        if (cancelado) return;
        fallosConsecutivos.current += 1;
        if (fallosConsecutivos.current >= FALLOS_PARA_DESCONECTAR) {
          setEnVivo(false);
        }
      }
    }

    ciclo();
    const id = setInterval(ciclo, INTERVALO_MS);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, []);

  return { tablero, enVivo };
}

// --- Panel de demostración: peticiones puntuales, sin polling. ---

async function leerError(resp: Response): Promise<string> {
  const cuerpo = await resp.json().catch(() => null);
  return cuerpo?.detail ?? `HTTP ${resp.status}`;
}

export async function obtenerEscenarios(): Promise<EscenarioInfo[]> {
  const resp = await fetch(`${BASE_URL}/demo/escenarios`);
  if (!resp.ok) throw new Error(await leerError(resp));
  return resp.json();
}

export async function activarEscenario(id: string): Promise<ResultadoEscenario> {
  const resp = await fetch(`${BASE_URL}/demo/escenarios/${id}`, { method: "POST" });
  if (!resp.ok) throw new Error(await leerError(resp));
  return resp.json();
}

export async function obtenerFallasIA(): Promise<FallasIA> {
  const resp = await fetch(`${BASE_URL}/demo/fallas-ia`);
  if (!resp.ok) throw new Error(await leerError(resp));
  return resp.json();
}

export async function actualizarFallasIA(cambios: Partial<FallasIA>): Promise<FallasIA> {
  const resp = await fetch(`${BASE_URL}/demo/fallas-ia`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios),
  });
  if (!resp.ok) throw new Error(await leerError(resp));
  return resp.json();
}

export async function limpiarLaboratorio(): Promise<ResultadoLimpieza[]> {
  const resp = await fetch(`${BASE_URL}/demo/limpiar-laboratorio`, { method: "POST" });
  if (!resp.ok) throw new Error(await leerError(resp));
  return resp.json();
}
