"""Health and observability endpoints."""

from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from db.chroma_client import get_collection
from db.sqlite_client import check_sqlite_health
from observability.langfuse_client import get_llm_metrics
from schemas.models import HealthStatus
from services.llm_service import check_groq_health, check_ollama_health

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthStatus)
async def health_check() -> HealthStatus:
    """Return composite health across model providers and datastores."""
    try:
        groq = await check_groq_health()
        ollama = await check_ollama_health()

        chroma_start = time.perf_counter()
        chroma_component = {"reachable": False, "latency_ms": None, "error": None}
        try:
            collection = get_collection()
            _ = collection.count()
            chroma_component["reachable"] = True
        except Exception as exc:
            chroma_component["error"] = str(exc)
        chroma_component["latency_ms"] = int((time.perf_counter() - chroma_start) * 1000)

        sqlite_start = time.perf_counter()
        sqlite_ok, sqlite_error = check_sqlite_health()
        sqlite_component = {
            "reachable": sqlite_ok,
            "latency_ms": int((time.perf_counter() - sqlite_start) * 1000),
            "error": sqlite_error,
        }

        critical_components_ok = (
            ollama.get("reachable", False)
            and chroma_component["reachable"]
            and sqlite_component["reachable"]
        )
        overall = "ok" if critical_components_ok else "degraded"
        if not ollama.get("reachable", False) and not groq.get("reachable", False):
            overall = "down"

        return HealthStatus(
            overall_status=overall,
            timestamp=datetime.now(timezone.utc),
            components={
                "groq": groq,
                "ollama": ollama,
                "chroma": chroma_component,
                "sqlite": sqlite_component,
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Health check failed: {exc}") from exc


@router.get("/metrics")
async def metrics() -> dict:
    """Return recent LLM latency metrics captured through Langfuse logging."""
    try:
        return get_llm_metrics(limit=100)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Metrics fetch failed: {exc}") from exc

