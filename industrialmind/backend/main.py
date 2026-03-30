"""IndustrialMind FastAPI entrypoint."""

from __future__ import annotations

import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.chroma_client import init_chroma
from db.sqlite_client import init_db
from observability.langfuse_client import init_langfuse
from routers import chat, health, rag, sensors
from services.sensor_simulator import start_sensor_simulator, stop_sensor_simulator

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("industrialmind.main")

app = FastAPI(
    title="IndustrialMind API",
    version="1.0.0",
    description="AI-powered Industrial IoT monitoring system",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(sensors.router)
app.include_router(rag.router)
app.include_router(health.router)


@app.on_event("startup")
async def on_startup() -> None:
    """Initialize persistent services and start sensor simulation."""
    try:
        init_db()
        init_chroma()
        init_langfuse()
        await start_sensor_simulator()
        logger.info("IndustrialMind startup complete")
    except Exception as exc:
        logger.exception("Startup failed: %s", exc)
        raise


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Gracefully stop background tasks."""
    try:
        await stop_sensor_simulator()
        logger.info("IndustrialMind shutdown complete")
    except Exception as exc:
        logger.exception("Shutdown error: %s", exc)


@app.get("/")
async def root() -> dict[str, str]:
    """Provide a minimal root status payload."""
    return {"service": "IndustrialMind", "status": "running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
