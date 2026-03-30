"""RAG router for manual upload and querying."""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from schemas.models import RAGQuery, RAGQueryResponse, RAGUploadResponse
from services.llm_service import call_llm
from services.rag_service import ingest_pdf, query_rag

router = APIRouter(tags=["rag"])


@router.post("/rag/upload", response_model=RAGUploadResponse)
async def upload_manual(file: UploadFile = File(...)) -> RAGUploadResponse:
    """Accept a PDF manual and index it into ChromaDB."""
    try:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        result = await ingest_pdf(file_bytes)
        return RAGUploadResponse(
            status="indexed",
            chunks_ingested=result["chunks_ingested"],
            pages_processed=result["pages_processed"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF ingest failed: {exc}") from exc


@router.post("/rag/query", response_model=RAGQueryResponse)
async def rag_query(payload: RAGQuery) -> RAGQueryResponse:
    """Retrieve relevant manual chunks and answer with the LLM."""
    try:
        context = await query_rag(payload.question)
        system_prompt = (
            "You are IndustrialMind manual assistant. "
            "Use only relevant context from uploaded manuals when possible. "
            "If context is insufficient, say so explicitly.\n\n"
            f"Manual context:\n{context}"
        )
        llm_result = await call_llm(
            system_prompt=system_prompt,
            user_message=payload.question,
            history=[],
        )
        return RAGQueryResponse(
            answer=llm_result["response"],
            provider=llm_result["provider"],
            latency_ms=llm_result["latency_ms"],
            retrieved_context=context,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAG query failed: {exc}") from exc

