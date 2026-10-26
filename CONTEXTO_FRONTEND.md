# Contexto del proyecto para rediseñar el frontend

Este documento es para el agente que va a rediseñar la interfaz web. Explica qué hace el sistema, cómo está repartido y qué contrato con el backend hay que respetar. **El rediseño debe limitarse a `frontend/`**: el backend y la API ya están validados en el laboratorio.

---

## 1. Qué es

Un **agente de monitoreo de red** para un laboratorio GNS3 con equipos MikroTik (RouterOS v7, CHR). Cada ~15 s revisa los tres equipos en paralelo por SSH (con conexiones que se mantienen abiertas), detecta fallas, las clasifica con una cascada de IA, aplica correcciones seguras cuando puede y avisa por Telegram. La interfaz web muestra todo eso en vivo y trae un panel para provocar fallas durante una presentación.

### Topología del laboratorio

```
                 red de gestión 192.168.56.0/24 (ether1 de cada equipo, el agente entra por aquí)

  R1 (router, .56.10) ──ether2 trunk── SW1 (switch, .56.11) ──ether3 trunk── SW2 (switch, .56.12)
   vlan10 192.168.10.1/24               └ ether4: PC-ADMIN 192.168.10.10 (VLAN10)
   vlan20 192.168.20.1/24                                                    ├ ether3: PC-VEN1 192.168.20.10 (VLAN20)
   vlan30 192.168.30.1/24                                                    ├ ether4: PC-VEN2 192.168.20.11 (VLAN20)
                                                                             └ ether5: SRV1   192.168.30.10 (VLAN30)
```

Es una **cadena R1 → SW1 → SW2**, no una estrella. El componente `Topologia.tsx` dibuja hoy una estrella genérica (router al centro, el resto como hojas). Es un buen candidato para rediseñar.

---

## 2. Los tres tipos de falla

| `tipo` (valor en la API) | Texto en la UI | Cómo se detecta | Qué hace el agente |
|---|---|---|---|
| `interfaz_caida` | Interfaz caída | La interfaz está deshabilitada, o un trunk no tiene enlace | Si está deshabilitada: `/interface enable <if>` (automático). Si no tiene enlace: solo notifica |
| `puerto_saturado` | Puerto saturado | El tráfico supera el 80 % de 1 Mbps (límite de la licencia CHR); `/tool torch` identifica el origen | Si el origen es un host de una VLAN: queue de 800k. Si es el propio equipo o algo desconocido: **solo notifica** |
| `ip_fuera_de_vlan` | IP fuera de VLAN | Captura ARP con sniffer en cada VLAN de R1: un host conectado a una VLAN con IP de otra subred | Cuarentena en R1 (address-list `cuarentena` más una regla `forward drop`) |

El campo `interfaz` puede ser un puerto físico (`ether2`) o una VLAN (`vlan20`).

### Cascada de clasificación (campo `nivel` / `clasifico`)

Se prueba en orden: **`groq` → `deepseek` → `ollama` → `reglas`**. El primer nivel que responde con un JSON válido y comandos dentro de la lista blanca es el que clasifica. `reglas` (reglas fijas, sin IA) nunca falla. Nombres para mostrar: Groq, DeepSeek, Ollama, Reglas fijas. Cada nivel tiene un color fijo en `colores.ts`.

### Ciclo de vida de una falla

- Un evento **NUEVA** se registra cuando la falla aparece y uno **RESUELTA** cuando deja de observarse en un ciclo posterior. La API los agrupa en una fila con `estado` `"Activa"` o `"Resuelta"`.
- "Corregida" significa que, después de aplicar los comandos, la falla dejó de observarse. No basta con que el comando se haya enviado.
- Si una falla no tiene comandos (`accion` vacío), la columna Acción muestra **"Solo notificación (origen: X)"**, donde `origen` es el host que la causa (IP, o "IP (MAC)"), o "no identificado".

---

## 3. Procesos y flujo de datos

```
 GNS3 (MikroTik + VPCS)
      ▲ SSH (netmiko) / SFTP / telnet a consolas VPCS (solo demo)
      │
 monitoreo.py ──escribe──► eventos.jsonl        (un evento por línea)
 (ciclo de ~15 s)  ────► estado_equipos.json    (si cada equipo respondió en el último ciclo)
      │
      └─► Telegram (notificaciones)

 api/ (FastAPI, 127.0.0.1:8000) ──lee── eventos.jsonl + estado_equipos.json + dispositivos.yaml
      ▲  y ejecuta escenarios FIJOS de demo
      │  HTTP (polling cada 3 s)
 frontend/ (React + Vite, localhost:5173)
```

Son tres procesos independientes: `monitoreo.py`, la API (`uvicorn api.main:app --host 127.0.0.1 --port 8000`) y el front (`npm run dev`). El front **nunca** habla con los equipos: solo con la API.

### Archivos del backend (no hace falta tocarlos)

| Archivo | Rol |
|---|---|
| `monitoreo.py` | Ciclo principal: detectar → clasificar → corregir → notificar → registrar |
| `deteccion.py`, `captura_arp.py` | Los tres detectores (sniffer ARP y torch) |
| `clasificacion.py`, `reglas.py` | Cascada de IA y reglas fijas |
| `comandos_permitidos.py`, `conexion.py` | Lista blanca de comandos; protección de ether1 y de la red de gestión |
| `notificacion.py` | Telegram |
| `tablero.py` | Agrupa los eventos en filas y calcula indicadores (lo usa la API) |
| `api/rutas_tablero.py`, `api/rutas_demo.py`, `api/esquemas.py` | Endpoints y modelos (los tipos calzan 1:1 con `frontend/src/tipos.ts`) |
| `api/demo_escenarios.py`, `consola_gns3.py` | Escenarios fijos del panel de demo |
| `limpiar_laboratorio.py` | Borra todo lo que creó el agente (`comment=agente`) |
| `dispositivos.yaml` | Equipos, interfaces monitoreadas y VLANs |

---

## 4. Contrato de la API (lo que el front debe respetar)

Base: `http://127.0.0.1:8000/api` (constante `BASE_URL` en `frontend/src/api.ts`). Por CORS, la API solo acepta peticiones de `http://localhost:5173` y `http://127.0.0.1:5173`. Si cambia el puerto del front, hay que tocar `api/main.py`.

### `GET /tablero`: todo lo de la pantalla principal, en una sola lectura

El front lo consulta cada **3 s**. Con dos fallos seguidos, la UI muestra "Sin conexión".

```ts
interface Tablero {
  hora_servidor: string;                 // ISO
  banner: { estado: "ok" | "alerta"; fallas: { dispositivo: string; interfaz: string | null }[] };
  indicadores: {
    fallas_detectadas: number;           // total de filas
    pct_corregidas: number;              // 0-100: resueltas tras una corrección automática / total
    promedio_resolucion_segundos: number | null;
    notificaciones_enviadas: number;
  };
  fallas_activas: {
    id_falla: string; dispositivo: string; tipo: string; interfaz: string | null;
    desde: string; nivel: string | null; comandos_aplicados: string[];
  }[];
  equipos: { nombre: string; ip: string; rol: string; en_linea: boolean | null; ultima_revision: string | null }[];
  niveles: Record<string, number>;       // { groq, deepseek, ollama, reglas } → cuántas fallas clasificó cada uno
  historial: {                            // más reciente primero
    id_falla: string; detectada: string; dispositivo: string; falla: string; interfaz: string | null;
    clasifico: string | null; accion: string[]; origen: string | null;
    duracion_segundos: number | null; estado: "Activa" | "Resuelta";
  }[];
  telegram_configurado: boolean;
}
```

`en_linea: null` significa que el agente todavía no revisó ese equipo. Los eventos antiguos pueden venir con `origen: null`.

### Panel de demo

| Método y ruta | Uso |
|---|---|
| `GET /demo/escenarios` | `[{ id, nombre, descripcion, disponible }]` |
| `POST /demo/escenarios/{id}` | Ejecuta el escenario. Responde `{ ejecutado, salida, resumen }`; `resumen` solo viene en `restaurar_pc_ven1` (IP aplicada, respuestas del ping al gateway, cuarentenas quitadas) y es lo que el front muestra como seguimiento, porque ese escenario no genera una falla. Errores: 404 si no existe, 409 si no está disponible, 403 si el comando está bloqueado, 502 si falla en el equipo. El cuerpo de error trae `detail` |
| `GET /demo/fallas-ia` / `PUT /demo/fallas-ia` | `{ groq, deepseek, ollama }` (booleanos): fuerzan el fallo de un nivel de la cascada. El PUT acepta campos parciales |
| `POST /demo/limpiar-laboratorio` | `[{ dispositivo, ok, detalle }]` |

IDs de escenario: `interfaz_caida_r1`, `puerto_saturado_sw1`, `ip_fuera_de_vlan`, `restaurar_pc_ven1`. Conviene renderizarlos a partir de la lista que devuelve la API y no fijarlos en el front.

Tiempos que la UI debería comunicar:
- Tiempos medidos del botón a "Resuelta": interfaz caída ~35 s, puerto saturado ~70 s, IP fuera de VLAN ~15–30 s. Una falla suele aparecer entre 10 y 30 s después de provocarla.
- Tras aplicar una corrección, el agente revisa de nuevo a los ~2 s para confirmarla.
- La saturación dura 40 s y se resuelve sola (solo notifica).
- IP fuera de VLAN se da por resuelta cuando la cuarentena queda aplicada en R1. "Restaurar IP de PC-VEN1" devuelve el host a su IP y quita su cuarentena, y así el escenario se puede repetir. "Limpiar laboratorio" borra todo lo que creó el agente.

**Regla de seguridad:** el navegador nunca envía comandos. Solo pide escenarios por `id`. Un rediseño no debe agregar ningún campo para escribir comandos.

---

## 5. Frontend actual

**Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS 4 (plugin `@tailwindcss/vite`, tema en `index.css` con `@theme`), Recharts 3 para gráficas, lucide-react para íconos y fuente Inter (`@fontsource`, solo latin/latin-ext). Lint con `oxlint`. No hay router: la navegación son pestañas en un `useState` dentro de `App.tsx`.

**Tema:** oscuro, definido como tokens en `src/index.css`:
- Fondos: `page`, `nav`, `card`, `card-2`; líneas: `line`.
- Acento de identidad: `accent` (ámbar `#ffb547`), con `accent-hot` (naranja) para actividad.
- Estados: `ok` (esmeralda), `info` (cian, tiempo real), `danger`, `warn`.
- Texto: `ink`, `ink-2`, `ink-3`, `ink-4`.
- Fondos de etiqueta: `tag-*`; colores de la dona: `nivel-1..4`.

Los colores para Recharts están duplicados en `src/colores.ts`.

```
frontend/src/
├── main.tsx, App.tsx          Entrada; App elige la pestaña y pasa `tablero` a cada panel
├── api.ts                     useTablero() (polling 3 s y estado enVivo) + llamadas del panel de demo
├── tipos.ts                   Tipos de la API (calzan con api/esquemas.py)
├── formato.ts                 Duraciones, horas, nombres de tipo/nivel, textoSoloNotificacion()
├── agregaciones.ts            Series para gráficas, resumen de niveles, equipos en línea, topología, exportar CSV
├── colores.ts                 Colores por nivel para gráficas y píldoras
├── index.css                  Tailwind + tema (@theme) + fuentes
└── componentes/
    ├── TopBar.tsx             Pestañas (panel, fallas, equipos, agente-ia, demo), indicador "en vivo" y Telegram
    ├── PanelDemo.tsx          Escenarios, interruptores de IA y limpieza del laboratorio
    ├── comunes/               Pildora, TarjetaIndicador, FiltroFallas
    ├── panel/                 BannerAlerta, Saludo (filtro/exportar), GraficaFallasTiempo, DonaNiveles,
    │                          TablaFallas (compartida por Panel y Fallas), Topologia
    └── paneles/               Una vista por pestaña:
        ├── Panel.tsx          Banner, 4 indicadores, gráfica en el tiempo + dona, fallas recientes (6), topología
        ├── Fallas.tsx         Historial completo con filtro (dispositivo/estado) y exportación a CSV
        ├── Equipos.tsx        Estado de R1/SW1/SW2 (en línea, IP, última revisión)
        ├── AgenteIA.tsx       Explicación de la cascada, conteo/porcentaje por nivel y dona
        └── Demo.tsx           Envuelve PanelDemo
```

### Funcionalidad que el rediseño debe conservar

1. Polling de `/tablero` con indicador "en vivo / sin conexión", y la pantalla "Conectando con la API…" mientras no hay datos.
2. Banner de alerta cuando `banner.estado === "alerta"` (lista de dispositivo/interfaz con fallas activas).
3. Los 4 indicadores: fallas detectadas, % corregidas automáticamente, tiempo promedio de resolución y equipos en línea.
4. Gráfica de fallas en el tiempo (por hora y por semana, en `agregaciones.ts`) y dona por nivel de la cascada.
5. Tabla de historial con las columnas Detectada, Dispositivo, Falla, Interfaz, Clasificó, Acción (comandos o "Solo notificación (origen: …)"), Duración y Estado; filtro por dispositivo y estado; exportación a CSV (con BOM para Excel).
6. Topología con el estado de cada equipo.
7. Pestaña Agente IA explicando la cascada.
8. Panel de demo: escenarios desde la API (deshabilitar el botón mientras se ejecuta; mostrar errores con `detail`), interruptores de fallo forzado por nivel y limpieza del laboratorio con su resultado por equipo.
9. Indicador de si Telegram está configurado.

### Oportunidades conocidas

- La topología real es una cadena R1 → SW1 → SW2 con hosts por VLAN. Hoy se dibuja una estrella genérica.
- `fallas_activas` y `hora_servidor` ya vienen en la API pero el front no los usa (tampoco usa `tiempoDesde()` de `formato.ts`). `fallas_activas` podría mostrar las fallas activas en detalle (desde cuándo, quién las clasificó, comandos aplicados).
- Después de provocar un escenario, el panel de demo solo dice "lo detectará en el próximo ciclo". Podría mostrar progreso o enlazar con la falla cuando aparezca (comparando `historial` antes y después).
- `PanelDemo.tsx` todavía tiene una clase `slate-` del tema claro anterior.

---

## 6. Cómo correrlo

1. En GNS3: abrir el proyecto `agente-monitoreo-redes` y encender todos los nodos. (Sin el laboratorio, la API responde igual con lo que haya en `eventos.jsonl`; los equipos aparecen "fuera de línea" si `monitoreo.py` no puede conectarse.)
2. Desde la raíz del proyecto:
   ```powershell
   .\venv\Scripts\python.exe monitoreo.py
   .\venv\Scripts\uvicorn.exe api.main:app --host 127.0.0.1 --port 8000
   cd frontend; npm run dev        # http://localhost:5173
   ```
3. Verificación: `npm run build` (incluye `tsc -b`) y `npm run lint`.

Para trabajar solo en el diseño basta con la API levantada: `eventos.jsonl` ya tiene historial real de pruebas con los tres tipos de falla.
