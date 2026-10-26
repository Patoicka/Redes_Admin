import { Menu } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import Sidebar, { type Pestana } from "./Sidebar";

const CLAVE_COLAPSO = "agente.sidebar.colapsado";

interface Props {
  pestana: Pestana;
  onCambiarPestana: (p: Pestana) => void;
  telegramConfigurado: boolean;
  correoUsuario: string;
  onCerrarSesion: () => void;
  children: ReactNode;
}

function leerColapsoInicial(): boolean {
  try {
    return localStorage.getItem(CLAVE_COLAPSO) === "1";
  } catch {
    return false;
  }
}

export default function AppLayout({
  pestana,
  onCambiarPestana,
  telegramConfigurado,
  correoUsuario,
  onCerrarSesion,
  children,
}: Props) {
  const [colapsado, setColapsado] = useState(leerColapsoInicial);
  const [movilAbierto, setMovilAbierto] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_COLAPSO, colapsado ? "1" : "0");
    } catch {
      /* sin almacenamiento: se ignora */
    }
  }, [colapsado]);

  useEffect(() => {
    function alRedimensionar() {
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setMovilAbierto(false);
      }
    }
    window.addEventListener("resize", alRedimensionar);
    return () => window.removeEventListener("resize", alRedimensionar);
  }, []);

  useEffect(() => {
    if (!movilAbierto) return;
    function alTecla(ev: KeyboardEvent) {
      if (ev.key === "Escape") setMovilAbierto(false);
    }
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [movilAbierto]);

  useEffect(() => {
    if (!movilAbierto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [movilAbierto]);

  return (
    <div className="min-h-screen bg-page">
      <Sidebar
        pestanaActiva={pestana}
        onCambiarPestana={onCambiarPestana}
        colapsado={colapsado}
        onToggleColapso={() => setColapsado((v) => !v)}
        movilAbierto={movilAbierto}
        onCerrarMovil={() => setMovilAbierto(false)}
        telegramConfigurado={telegramConfigurado}
        correoUsuario={correoUsuario}
        onCerrarSesion={onCerrarSesion}
      />

      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-200 ease-out ${
          colapsado ? "lg:pl-[4.5rem]" : "lg:pl-64"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-nav/95 px-4 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            onClick={() => setMovilAbierto(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-card-2 hover:text-ink"
            aria-label="Abrir menú"
            aria-expanded={movilAbierto}
            aria-controls="navegacion-lateral"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">Monitor de red</p>
            <p className="truncate text-[10px] text-ink-4">Network Intelligence</p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
