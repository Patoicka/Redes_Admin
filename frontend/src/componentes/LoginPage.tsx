import {
  Eye,
  EyeOff,
  FlaskConical,
  Lock,
  LogIn,
  Mail,
  Network,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import {
  errorContrasena,
  errorCorreo,
  mensajeErrorContrasena,
  mensajeErrorCorreo,
} from "../demoAuth";

interface Props {
  onExito: (correo: string, recordar: boolean) => void;
}

const FEATURES = [
  {
    icono: Network,
    titulo: "Monitoreo en tiempo real",
    detalle: "Estado de la infraestructura del laboratorio.",
  },
  {
    icono: ShieldCheck,
    titulo: "Detección y corrección",
    detalle: "Agente IA para incidencias de red.",
  },
  {
    icono: FlaskConical,
    titulo: "Entorno de demostración",
    detalle: "Escenarios controlados para pruebas.",
  },
] as const;

export default function LoginPage({ onExito }: Props) {
  const idCorreo = useId();
  const idClave = useId();
  const idRecordar = useId();

  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [recordar, setRecordar] = useState(false);
  const [mostrarClave, setMostrarClave] = useState(false);
  const [intentado, setIntentado] = useState(false);

  const errCorreo = intentado ? errorCorreo(correo) : null;
  const errClave = intentado ? errorContrasena(contrasena) : null;
  const msgCorreo = mensajeErrorCorreo(errCorreo);
  const msgClave = mensajeErrorContrasena(errClave);

  function enviar(ev: FormEvent) {
    ev.preventDefault();
    setIntentado(true);
    const eC = errorCorreo(correo);
    const eP = errorContrasena(contrasena);
    if (eC || eP) return;
    onExito(correo.trim(), recordar);
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-page text-ink">
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(38,48,51,0.9) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,181,71,0.07),transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-10 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-page shadow-[0_0_24px_rgba(255,181,71,0.22)]">
            <Radio className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight text-ink">Monitor de red</p>
            <p className="text-xs text-ink-4">Network Intelligence</p>
          </div>
        </div>

        <div className="mb-6">
          <span className="mb-4 block h-0.5 w-10 rounded-full bg-accent" aria-hidden />
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-[2rem]">
            Bienvenido
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-3">
            Accede al panel de monitoreo y administración del laboratorio de redes.
          </p>
        </div>

        <form
          onSubmit={enviar}
          noValidate
          className="w-full rounded-2xl border border-line/80 bg-card/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-6"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor={idCorreo} className="mb-1.5 block text-xs font-medium text-ink-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4"
                  aria-hidden
                />
                <input
                  id={idCorreo}
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="usuario@ejemplo.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  aria-invalid={msgCorreo ? true : undefined}
                  aria-describedby={msgCorreo ? `${idCorreo}-error` : undefined}
                  className={`w-full rounded-xl border bg-card-2/80 py-2.5 pr-3 pl-10 text-sm text-ink placeholder:text-ink-4 transition-colors outline-none focus:ring-2 focus:ring-accent/35 ${
                    msgCorreo
                      ? "border-danger/50 focus:border-danger"
                      : "border-line focus:border-accent/50"
                  }`}
                />
              </div>
              {msgCorreo && (
                <p id={`${idCorreo}-error`} className="mt-1.5 text-xs text-danger" role="alert">
                  {msgCorreo}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={idClave} className="mb-1.5 block text-xs font-medium text-ink-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-4"
                  aria-hidden
                />
                <input
                  id={idClave}
                  type={mostrarClave ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Mínimo 9 caracteres"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  aria-invalid={msgClave ? true : undefined}
                  aria-describedby={msgClave ? `${idClave}-error` : undefined}
                  className={`w-full rounded-xl border bg-card-2/80 py-2.5 pr-11 pl-10 text-sm text-ink placeholder:text-ink-4 transition-colors outline-none focus:ring-2 focus:ring-accent/35 ${
                    msgClave
                      ? "border-danger/50 focus:border-danger"
                      : "border-line focus:border-accent/50"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setMostrarClave((v) => !v)}
                  className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-4 transition-colors hover:bg-card hover:text-ink-2"
                  aria-label={mostrarClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {mostrarClave ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
              {msgClave && (
                <p id={`${idClave}-error`} className="mt-1.5 text-xs text-danger" role="alert">
                  {msgClave}
                </p>
              )}
            </div>

            <label
              htmlFor={idRecordar}
              className="flex cursor-pointer items-center gap-2.5 select-none"
            >
              <input
                id={idRecordar}
                type="checkbox"
                checked={recordar}
                onChange={(e) => setRecordar(e.target.checked)}
                className="h-4 w-4 rounded border-line accent-accent"
              />
              <span className="text-sm text-ink-2">Recordar mi sesión</span>
            </label>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-page transition-colors hover:bg-accent-hot focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Iniciar sesión
            </button>
          </div>

          <div className="mt-5 flex gap-2 rounded-xl border border-line/70 bg-card-2/40 px-3 py-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" aria-hidden />
            <p className="text-[11px] leading-relaxed text-ink-4">
              <span className="font-medium text-ink-3">Acceso de demostración. </span>
              Solo se verifica el formato del correo electrónico y que la contraseña tenga al menos
              9 caracteres.
            </p>
          </div>
        </form>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-0">
          {FEATURES.map(({ icono: Icono, titulo, detalle }, i) => (
            <div
              key={titulo}
              className={`px-1 sm:px-3 ${i > 0 ? "sm:border-l sm:border-line/70" : ""}`}
            >
              <Icono className="mb-2 h-4 w-4 text-accent" strokeWidth={2} aria-hidden />
              <p className="text-xs font-medium text-ink">{titulo}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-4">{detalle}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="relative z-10 border-t border-line/60 px-5 py-4 text-center text-[11px] text-ink-4">
        Laboratorio de Redes · Proyecto Académico
      </footer>
    </div>
  );
}
