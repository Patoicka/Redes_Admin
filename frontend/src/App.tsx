import { useState } from "react";
import { useTablero } from "./api";
import AppLayout from "./componentes/AppLayout";
import LoginPage from "./componentes/LoginPage";
import type { Pestana } from "./componentes/Sidebar";
import AgenteIA from "./componentes/paneles/AgenteIA";
import Demo from "./componentes/paneles/Demo";
import Equipos from "./componentes/paneles/Equipos";
import Fallas from "./componentes/paneles/Fallas";
import Panel from "./componentes/paneles/Panel";
import { useDemoAuth } from "./useDemoAuth";

function AppAutenticada({
  correo,
  onCerrarSesion,
}: {
  correo: string;
  onCerrarSesion: () => void;
}) {
  const { tablero, enVivo } = useTablero();
  const [pestana, setPestana] = useState<Pestana>("panel");

  if (!tablero) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="text-sm text-ink-3">Conectando con la API…</p>
      </div>
    );
  }

  return (
    <AppLayout
      pestana={pestana}
      onCambiarPestana={setPestana}
      telegramConfigurado={tablero.telegram_configurado}
      correoUsuario={correo}
      onCerrarSesion={onCerrarSesion}
    >
      {pestana === "panel" && (
        <Panel
          tablero={tablero}
          enVivo={enVivo}
          onVerIncidencias={() => setPestana("fallas")}
        />
      )}
      {pestana === "fallas" && <Fallas tablero={tablero} enVivo={enVivo} />}
      {pestana === "equipos" && (
        <Equipos
          tablero={tablero}
          enVivo={enVivo}
          onVerIncidencias={() => setPestana("fallas")}
        />
      )}
      {pestana === "agente-ia" && <AgenteIA tablero={tablero} enVivo={enVivo} />}
      {pestana === "demo" && (
        <Demo
          tablero={tablero}
          enVivo={enVivo}
          onVerIncidencias={() => setPestana("fallas")}
        />
      )}
    </AppLayout>
  );
}

export default function App() {
  const { sesion, autenticado, iniciarSesion, cerrarSesion } = useDemoAuth();

  if (!autenticado || !sesion) {
    return <LoginPage onExito={iniciarSesion} />;
  }

  return <AppAutenticada correo={sesion.correo} onCerrarSesion={cerrarSesion} />;
}
