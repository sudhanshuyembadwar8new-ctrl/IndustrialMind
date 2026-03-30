"""LLM service with Groq primary and Ollama fallback."""

from __future__ import annotations

import os
import time
from typing import Any

import httpx
from dotenv import load_dotenv

from observability.langfuse_client import log_llm_call

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
GROQ_MODEL = "llama3-70b-8192"
OLLAMA_MODEL = "qwen3:8b"


def _normalize_history(history: list[dict[str, str]] | None) -> list[dict[str, str]]:
    """Return role/content-safe message history."""
    normalized: list[dict[str, str]] = []
    if not history:
        return normalized
    for item in history:
        role = item.get("role", "user")
        content = item.get("content", "").strip()
        if content:
            normalized.append({"role": role, "content": content})
    return normalized


async def _call_groq(messages: list[dict[str, str]]) -> str:
    """Send a chat completion request to Groq."""
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not configured")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.2,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code == 429:
            raise RuntimeError("Groq rate limit reached (429)")
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()


async def _call_ollama(messages: list[dict[str, str]]) -> str:
    """Send a chat request to Ollama."""
    url = f"{OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.2},
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        if "message" in data and "content" in data["message"]:
            return data["message"]["content"].strip()
        if "response" in data:
            return str(data["response"]).strip()
        raise RuntimeError("Unexpected Ollama response payload")


async def call_llm(
    system_prompt: str,
    user_message: str,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Call Groq first, fallback to Ollama on any failure, and log to Langfuse."""
    started = time.perf_counter()
    normalized_history = _normalize_history(history)
    messages = [{"role": "system", "content": system_prompt}, *normalized_history, {"role": "user", "content": user_message}]
    provider = "groq"
    response_text = ""
    error_text = None

    try:
        response_text = await _call_groq(messages)
        provider = "groq"
    except Exception as groq_exc:
        provider = "ollama"
        error_text = f"Groq failed: {groq_exc}"
        try:
            response_text = await _call_ollama(messages)
        except Exception as ollama_exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            log_llm_call(
                system_prompt=system_prompt,
                user_message=user_message,
                history=normalized_history,
                response=f"ERROR: {ollama_exc}",
                latency_ms=latency_ms,
                provider="none",
                error=f"{error_text}; Ollama failed: {ollama_exc}",
            )
            raise RuntimeError(f"Both providers failed. {error_text}; Ollama failed: {ollama_exc}") from ollama_exc

    latency_ms = int((time.perf_counter() - started) * 1000)
    log_llm_call(
        system_prompt=system_prompt,
        user_message=user_message,
        history=normalized_history,
        response=response_text,
        latency_ms=latency_ms,
        provider=provider,
        error=error_text,
    )
    return {"response": response_text, "provider": provider, "latency_ms": latency_ms}


async def check_groq_health() -> dict[str, Any]:
    """Check whether Groq is reachable and return measured latency."""
    started = time.perf_counter()
    if not GROQ_API_KEY:
        return {"reachable": False, "latency_ms": 0, "error": "GROQ_API_KEY missing"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            )
            response.raise_for_status()
        return {"reachable": True, "latency_ms": int((time.perf_counter() - started) * 1000), "error": None}
    except Exception as exc:
        return {
            "reachable": False,
            "latency_ms": int((time.perf_counter() - started) * 1000),
            "error": str(exc),
        }


async def check_ollama_health() -> dict[str, Any]:
    """Check whether Ollama is reachable and return measured latency."""
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            response.raise_for_status()
        return {"reachable": True, "latency_ms": int((time.perf_counter() - started) * 1000), "error": None}
    except Exception as exc:
        return {
            "reachable": False,
            "latency_ms": int((time.perf_counter() - started) * 1000),
            "error": str(exc),
        }

