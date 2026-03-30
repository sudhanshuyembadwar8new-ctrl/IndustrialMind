"""RAG ingestion and querying service built on PyMuPDF + ChromaDB."""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any

import fitz
import httpx
from dotenv import load_dotenv

from db.chroma_client import get_collection

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
EMBED_MODEL = "nomic-embed-text"
COLLECTION_NAME = "manuals"


def _chunk_tokens(text: str, chunk_size: int = 600, overlap: int = 100) -> list[str]:
    """Chunk plain text into overlapping token windows based on whitespace splitting."""
    tokens = text.split()
    if not tokens:
        return []

    chunks: list[str] = []
    step = max(chunk_size - overlap, 1)
    for start in range(0, len(tokens), step):
        window = tokens[start : start + chunk_size]
        if not window:
            continue
        chunks.append(" ".join(window))
        if start + chunk_size >= len(tokens):
            break
    return chunks


async def _embed_text(text: str) -> list[float]:
    """Generate embeddings using Ollama nomic-embed-text."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
        )
        response.raise_for_status()
        payload = response.json()
        if "embedding" not in payload:
            raise RuntimeError("Embedding response missing 'embedding'")
        return payload["embedding"]


async def ingest_pdf(file_bytes: bytes) -> dict[str, int]:
    """Extract text from PDF, chunk it, embed chunks, and upsert into ChromaDB."""
    try:
        document = fitz.open(stream=file_bytes, filetype="pdf")
        page_texts: list[str] = []
        for page in document:
            page_texts.append(page.get_text("text"))
        document.close()

        full_text = "\n".join(page_texts).strip()
        chunks = _chunk_tokens(full_text, chunk_size=600, overlap=100)
        if not chunks:
            raise RuntimeError("No extractable text found in PDF")

        embeddings: list[list[float]] = []
        for chunk in chunks:
            embeddings.append(await _embed_text(chunk))

        collection = get_collection()
        chunk_ids = [str(uuid.uuid4()) for _ in chunks]
        metadata = [
            {
                "source": "pdf_manual",
                "collection": COLLECTION_NAME,
                "chunk_index": index,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            for index in range(len(chunks))
        ]

        collection.upsert(
            ids=chunk_ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadata,
        )
        return {"chunks_ingested": len(chunks), "pages_processed": len(page_texts)}
    except Exception as exc:
        raise RuntimeError(f"Failed to ingest PDF: {exc}") from exc


async def query_rag(question: str) -> str:
    """Retrieve top-5 relevant context chunks from ChromaDB for a question."""
    try:
        collection = get_collection()
        if collection.count() == 0:
            return "No manual context available. Upload a PDF manual first."

        question_embedding = await _embed_text(question)
        results = collection.query(
            query_embeddings=[question_embedding],
            n_results=5,
            include=["documents", "distances", "metadatas"],
        )

        docs = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]
        if not docs:
            return "No relevant context found for the query."

        formatted_chunks = []
        for index, doc in enumerate(docs, start=1):
            distance = distances[index - 1] if index - 1 < len(distances) else None
            score_text = f"{distance:.4f}" if isinstance(distance, (float, int)) else "n/a"
            formatted_chunks.append(f"[Chunk {index} | distance={score_text}]\n{doc.strip()}")
        return "\n\n".join(formatted_chunks)
    except Exception as exc:
        raise RuntimeError(f"RAG query failed: {exc}") from exc

