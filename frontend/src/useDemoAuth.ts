import { useCallback, useState } from "react";
import {
  borrarSesionDemo,
  guardarSesionDemo,
  leerSesionDemo,
  type SesionDemo,
} from "./demoAuth";

export function useDemoAuth() {
  const [sesion, setSesion] = useState<SesionDemo | null>(() => leerSesionDemo());

  const iniciarSesion = useCallback((correo: string, recordar: boolean) => {
    setSesion(guardarSesionDemo(correo, recordar));
  }, []);

  const cerrarSesion = useCallback(() => {
    borrarSesionDemo();
    setSesion(null);
  }, []);

  return {
    sesion,
    autenticado: sesion !== null,
    iniciarSesion,
    cerrarSesion,
  };
}
