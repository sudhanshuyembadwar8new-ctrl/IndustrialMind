"""Chat router for LLM Q&A."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from db.sqlite_client import get_latest
from schemas.models import ChatRequest, ChatResponse
from services.llm_service import call_llm

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest) -> ChatResponse:
    """Handle natural language chat requests with optional sensor context."""
    try:
        system_prompt = (
            "You are IndustrialMind AI, an expert industrial IoT assistant. "
            "Be concise, safety-focused, and explain sensor behavior clearly."
        )

        if payload.include_sensor_context:
            latest = get_latest()
            if latest:
                sensor_lines = []
                for sensor_name, reading in latest.items():
                    sensor_lines.append(
                        f"- {sensor_name}: {reading.get('value')} {reading.get('unit')} "
                        f"(severity: {reading.get('severity')})"
                    )
                system_prompt += (
                    "\n\nLive sensor context (latest readings):\n"
                    + "\n".join(sensor_lines)
                )
            else:
                system_prompt += "\n\nNo live sensor context is currently available."

        history = [item.model_dump() for item in payload.conversation_history]
        result = await call_llm(
            system_prompt=system_prompt,
            user_message=payload.message,
            history=history,
        )
        return ChatResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat failed: {exc}") from exc

