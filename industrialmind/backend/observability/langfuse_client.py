"""Langfuse logging adapter plus local metrics cache."""

from __future__ import annotations

import os
from collections import deque
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv

load_dotenv()

try:
    from langfuse import Langfuse
except Exception:  # pragma: no cover - import guard for optional runtime setup
    Langfuse = None

_LANGFUSE_CLIENT = None
_CALL_LOGS: deque[dict[str, Any]] = deque(maxlen=5000)


def init_langfuse():
    """Initialize Langfuse client only when keys are configured."""
    global _LANGFUSE_CLIENT
    if _LANGFUSE_CLIENT is not None:
        return _LANGFUSE_CLIENT

    secret_key = os.getenv("LANGFUSE_SECRET_KEY", "").strip()
    public_key = os.getenv("LANGFUSE_PUBLIC_KEY", "").strip()
    host = os.getenv("LANGFUSE_HOST", "http://localhost:3000").strip()

    if not secret_key or not public_key or Langfuse is None:
        _LANGFUSE_CLIENT = None
        return None

    try:
        _LANGFUSE_CLIENT = Langfuse(
            secret_key=secret_key,
            public_key=public_key,
            host=host,
        )
    except Exception:
        _LANGFUSE_CLIENT = None
    return _LANGFUSE_CLIENT


def log_llm_call(
    system_prompt: str,
    user_message: str,
    history: list[dict[str, str]],
    response: str,
    latency_ms: int,
    provider: str,
    error: str | None = None,
) -> None:
    """Log each LLM call to local cache and Langfuse when available."""
    timestamp = datetime.now(timezone.utc)
    call_data = {
        "timestamp": timestamp,
        "latency_ms": latency_ms,
        "provider": provider,
        "error": error,
        "response_preview": response[:500],
    }
    _CALL_LOGS.append(call_data)

    client = init_langfuse()
    if client is None:
        return

    try:
        trace = client.trace(
            name="industrialmind.llm_call",
            input={
                "system_prompt": system_prompt,
                "user_message": user_message,
                "history": history,
            },
            output={"response": response},
            metadata={"provider": provider, "latency_ms": latency_ms, "error": error},
        )
        if hasattr(trace, "update"):
            trace.update(metadata={"provider": provider, "latency_ms": latency_ms, "error": error})
        if hasattr(client, "flush"):
            client.flush()
    except Exception:
        pass


def get_llm_metrics(limit: int = 100) -> dict[str, Any]:
    """Return recent LLM latency metrics and request counters."""
    recent = list(_CALL_LOGS)[-limit:]
    latencies = [int(item["latency_ms"]) for item in recent]
    active_provider = recent[-1]["provider"] if recent else None
    last_updated = recent[-1]["timestamp"] if recent else None

    today = datetime.now(timezone.utc).date()
    total_today = sum(1 for item in _CALL_LOGS if item["timestamp"].date() == today)

    return {
        "latencies_ms": latencies,
        "last_latency_ms": latencies[-1] if latencies else None,
        "active_provider": active_provider,
        "total_requests_today": total_today,
        "last_updated": last_updated.isoformat() if last_updated else None,
    }

