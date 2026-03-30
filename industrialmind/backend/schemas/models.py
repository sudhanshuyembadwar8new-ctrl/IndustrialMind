"""Application-wide request and response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ConversationMessage(BaseModel):
    """Single chat message entry."""

    role: Literal["system", "user", "assistant"] = Field(default="user")
    content: str = Field(..., min_length=1)


class SensorReading(BaseModel):
    """Sensor reading payload."""

    sensor_name: str
    value: float
    unit: str
    severity: Literal["normal", "warning", "critical"]
    timestamp: datetime | str
    normal_range: tuple[float, float] | None = None
    warning_range: tuple[float, float] | None = None
    critical_range: tuple[float, float] | None = None
    failure_risk_percent: int | None = None
    failure_message: str | None = None


class ChatRequest(BaseModel):
    """Chat request schema."""

    message: str = Field(..., min_length=1)
    conversation_history: list[ConversationMessage] = Field(default_factory=list)
    include_sensor_context: bool = False


class ChatResponse(BaseModel):
    """Chat response schema."""

    response: str
    provider: Literal["groq", "ollama"]
    latency_ms: int


class RAGQuery(BaseModel):
    """RAG query request schema."""

    question: str = Field(..., min_length=1)


class RAGUploadResponse(BaseModel):
    """RAG upload response schema."""

    status: str
    chunks_ingested: int
    pages_processed: int


class RAGQueryResponse(BaseModel):
    """RAG query response schema."""

    answer: str
    provider: Literal["groq", "ollama"]
    latency_ms: int
    retrieved_context: str


class AnomalyAlert(BaseModel):
    """Real-time anomaly alert schema."""

    sensor_name: str
    current_value: float
    threshold: str
    severity: Literal["normal", "warning", "critical"]
    ai_explanation: str
    timestamp: datetime | str


class HealthStatus(BaseModel):
    """Composite system health response schema."""

    overall_status: Literal["ok", "degraded", "down"]
    timestamp: datetime
    components: dict[str, dict[str, Any]]


class LLMMetricsResponse(BaseModel):
    """Observability metrics response schema."""

    latencies_ms: list[int]
    last_latency_ms: int | None
    active_provider: str | None
    total_requests_today: int
    last_updated: datetime | None

