"""API de solo lectura para la interfaz web del monitor de red.

Solo para uso local en la demo: se arranca con
    uvicorn api.main:app --host 127.0.0.1 --port 8000
(--host 127.0.0.1, nunca 0.0.0.0, para no exponerla en la red).
CORS se abre únicamente al servidor de desarrollo de Vite.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import rutas_demo, rutas_tablero

app = FastAPI(title="Monitor de red - API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["*"],
)

app.include_router(rutas_tablero.router, prefix="/api")
app.include_router(rutas_demo.router, prefix="/api")
