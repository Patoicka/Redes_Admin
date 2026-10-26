export interface SesionDemo {
  correo: string;
  recordar: boolean;
}

const CLAVE_SESION = "agente.demo.sesion";

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function correoEsValido(correo: string): boolean {
  return REGEX_CORREO.test(correo.trim());
}

export function contrasenaEsValida(contrasena: string): boolean {
  return contrasena.length > 8;
}

export type ErrorCampoLogin = "vacio" | "invalido" | null;

export function errorCorreo(correo: string): ErrorCampoLogin {
  const t = correo.trim();
  if (!t) return "vacio";
  if (!correoEsValido(t)) return "invalido";
  return null;
}

export function errorContrasena(contrasena: string): ErrorCampoLogin {
  if (!contrasena) return "vacio";
  if (!contrasenaEsValida(contrasena)) return "invalido";
  return null;
}

export function mensajeErrorCorreo(error: ErrorCampoLogin): string | null {
  if (error === "vacio") return "Ingresa tu correo electrónico.";
  if (error === "invalido") return "Ingresa un correo electrónico válido.";
  return null;
}

export function mensajeErrorContrasena(error: ErrorCampoLogin): string | null {
  if (error === "vacio") return "Ingresa tu contraseña.";
  if (error === "invalido") return "La contraseña debe tener al menos 9 caracteres.";
  return null;
}

function leerDe(storage: Storage): SesionDemo | null {
  try {
    const raw = storage.getItem(CLAVE_SESION);
    if (!raw) return null;
    const datos = JSON.parse(raw) as Partial<SesionDemo>;
    if (typeof datos.correo !== "string" || !correoEsValido(datos.correo)) return null;
    return { correo: datos.correo, recordar: Boolean(datos.recordar) };
  } catch {
    return null;
  }
}

export function leerSesionDemo(): SesionDemo | null {
  try {
    return leerDe(localStorage) ?? leerDe(sessionStorage);
  } catch {
    return null;
  }
}

export function guardarSesionDemo(correo: string, recordar: boolean): SesionDemo {
  const sesion: SesionDemo = { correo: correo.trim(), recordar };
  const payload = JSON.stringify(sesion);
  try {
    sessionStorage.removeItem(CLAVE_SESION);
    localStorage.removeItem(CLAVE_SESION);
    if (recordar) localStorage.setItem(CLAVE_SESION, payload);
    else sessionStorage.setItem(CLAVE_SESION, payload);
  } catch {
    /* sin almacenamiento: la sesión vive solo en memoria del hook */
  }
  return sesion;
}

export function borrarSesionDemo(): void {
  try {
    sessionStorage.removeItem(CLAVE_SESION);
    localStorage.removeItem(CLAVE_SESION);
  } catch {
    /* ignore */
  }
}
