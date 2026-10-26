import {
  AlertTriangle,
  Bot,
  ChevronLeft,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Radio,
  Send,
  Server,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Pestana = "panel" | "fallas" | "equipos" | "agente-ia" | "demo";

const PESTANAS: Array<{ id: Pestana; etiqueta: string; icono: LucideIcon }> = [
  { id: "panel", etiqueta: "Centro de control", icono: LayoutDashboard },
  { id: "fallas", etiqueta: "Incidencias", icono: AlertTriangle },
  { id: "equipos", etiqueta: "Infraestructura", icono: Server },
  { id: "agente-ia", etiqueta: "Agente IA", icono: Bot },
  { id: "demo", etiqueta: "Laboratorio demo", icono: FlaskConical },
];

interface Props {
  pestanaActiva: Pestana;
  onCambiarPestana: (p: Pestana) => void;
  colapsado: boolean;
  onToggleColapso: () => void;
  movilAbierto: boolean;
  onCerrarMovil: () => void;
  telegramConfigurado: boolean;
  correoUsuario: string;
  onCerrarSesion: () => void;
}

export default function Sidebar({
  pestanaActiva,
  onCambiarPestana,
  colapsado,
  onToggleColapso,
  movilAbierto,
  onCerrarMovil,
  telegramConfigurado,
  correoUsuario,
  onCerrarSesion,
}: Props) {
  function seleccionar(id: Pestana) {
    onCambiarPestana(id);
    onCerrarMovil();
  }

  const telegramEstado = telegramConfigurado ? "Configurado" : "No configurado";
  const telegramTooltip = `Telegram — ${telegramEstado}`;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 lg:hidden ${
          movilAbierto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCerrarMovil}
        aria-hidden={!movilAbierto}
      />

      <aside
        id="navegacion-lateral"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-x-hidden border-r border-line/80 bg-sidebar transition-[width,transform] duration-200 ease-out ${
          colapsado ? "lg:w-[4.5rem]" : "lg:w-64"
        } ${movilAbierto ? "translate-x-0 shadow-2xl shadow-black/40" : "-translate-x-full lg:translate-x-0 lg:shadow-none"}`}
        aria-label="Navegación principal"
      >
        {/* Cabecera */}
        <div
          className={`flex h-[4.25rem] shrink-0 items-center gap-3 border-b border-line/80 ${
            colapsado ? "lg:justify-center lg:px-2" : "px-4"
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-page shadow-[0_0_20px_rgba(255,181,71,0.18)]">
            <Radio className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </span>

          <div className={`min-w-0 flex-1 ${colapsado ? "lg:hidden" : ""}`}>
            <p className="truncate text-[15px] font-semibold tracking-tight text-ink">
              Monitor de red
            </p>
            <p className="truncate text-[11px] text-ink-4">Network Intelligence</p>
          </div>

          <button
            type="button"
            onClick={onCerrarMovil}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-card-2 hover:text-ink lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onToggleColapso}
            className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-4 transition-colors hover:bg-card-2 hover:text-ink lg:flex ${
              colapsado ? "lg:hidden" : ""
            }`}
            aria-label="Contraer menú"
            title="Contraer menú"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Navegación */}
        <nav
          className={`flex-1 space-y-1 overflow-x-hidden overflow-y-auto py-4 ${
            colapsado ? "lg:px-2" : "px-3"
          }`}
          aria-label="Secciones"
        >
          {PESTANAS.map(({ id, etiqueta, icono: Icono }) => {
            const activa = id === pestanaActiva;
            return (
              <button
                key={id}
                type="button"
                title={colapsado ? etiqueta : undefined}
                onClick={() => seleccionar(id)}
                aria-current={activa ? "page" : undefined}
                aria-label={etiqueta}
                className={`relative flex w-full items-center gap-3 overflow-hidden rounded-xl text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  activa
                    ? "bg-gradient-to-r from-accent/18 via-accent/10 to-transparent text-ink"
                    : "text-ink-3 hover:bg-card-2/70 hover:text-ink"
                } ${colapsado ? "lg:justify-center lg:px-0 lg:py-2.5" : "px-3 py-2.5"}`}
              >
                {activa && (
                  <span
                    className="absolute top-1/2 left-0 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
                    aria-hidden
                  />
                )}
                <Icono
                  className={`h-[18px] w-[18px] shrink-0 ${activa ? "text-accent" : ""}`}
                  strokeWidth={activa ? 2.35 : 2}
                  aria-hidden
                />
                <span className={`min-w-0 truncate ${colapsado ? "lg:hidden" : ""}`}>
                  {etiqueta}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Pie: Telegram + usuario */}
        <div
          className={`mt-auto shrink-0 space-y-2 overflow-x-hidden border-t border-line/80 ${
            colapsado ? "lg:p-2" : "p-3"
          }`}
        >
          <div
            className={`overflow-hidden rounded-xl bg-card-2/50 ring-1 ring-line/80 ${
              colapsado ? "lg:flex lg:justify-center lg:p-2" : "px-3 py-2.5"
            }`}
            title={colapsado ? telegramTooltip : undefined}
          >
            <div className={`flex items-center gap-2.5 ${colapsado ? "lg:justify-center" : ""}`}>
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-ink-2 ring-1 ring-line/60">
                <Send
                  className={`h-3.5 w-3.5 ${telegramConfigurado ? "text-ok" : "text-ink-4"}`}
                  strokeWidth={2}
                  aria-hidden
                />
                <span
                  className={`absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full ring-2 ring-card-2 ${
                    telegramConfigurado ? "bg-ok" : "bg-ink-4"
                  }`}
                  aria-hidden
                />
              </span>
              <div className={`min-w-0 ${colapsado ? "lg:hidden" : ""}`}>
                <p className="text-xs font-medium text-ink">Telegram</p>
                <p className={`text-[11px] ${telegramConfigurado ? "text-ok" : "text-ink-4"}`}>
                  {telegramEstado}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 overflow-hidden rounded-xl ${
              colapsado ? "lg:flex-col lg:justify-center lg:gap-1.5 lg:px-0 lg:py-1" : "px-2 py-1.5"
            }`}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-2 text-ink-2 ring-1 ring-line"
              title={colapsado ? `Administrador · ${correoUsuario}` : undefined}
            >
              <User className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            <div className={`min-w-0 flex-1 ${colapsado ? "lg:hidden" : ""}`}>
              <p className="truncate text-sm font-medium text-ink">Administrador</p>
              <p className="truncate text-xs text-ink-4" title={correoUsuario}>
                {correoUsuario}
              </p>
            </div>
            <button
              type="button"
              onClick={onCerrarSesion}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-4 transition-colors hover:bg-card-2 hover:text-danger"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>

          {colapsado && (
            <button
              type="button"
              onClick={onToggleColapso}
              className="mx-auto hidden h-8 w-8 items-center justify-center rounded-lg text-ink-4 transition-colors hover:bg-card-2 hover:text-ink lg:flex"
              aria-label="Expandir menú"
              title="Expandir menú"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
