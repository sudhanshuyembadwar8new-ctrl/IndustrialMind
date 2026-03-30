"""ChromaDB initialization and collection access."""

from __future__ import annotations

import os
from pathlib import Path

import chromadb
from dotenv import load_dotenv

load_dotenv()

_CHROMA_CLIENT = None
_MANUALS_COLLECTION = None


def init_chroma():
    """Initialize Chroma persistent client and manuals collection."""
    global _CHROMA_CLIENT, _MANUALS_COLLECTION
    try:
        if _CHROMA_CLIENT is not None and _MANUALS_COLLECTION is not None:
            return _CHROMA_CLIENT, _MANUALS_COLLECTION

        persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
        persist_path = Path(persist_dir)
        if not persist_path.is_absolute():
            persist_path = Path(__file__).resolve().parents[1] / persist_path
        persist_path.mkdir(parents=True, exist_ok=True)

        _CHROMA_CLIENT = chromadb.PersistentClient(path=str(persist_path))
        _MANUALS_COLLECTION = _CHROMA_CLIENT.get_or_create_collection(
            name="manuals",
            metadata={"hnsw:space": "cosine"},
        )
        return _CHROMA_CLIENT, _MANUALS_COLLECTION
    except Exception as exc:
        raise RuntimeError(f"Chroma initialization failed: {exc}") from exc


def get_client():
    """Return initialized Chroma client."""
    client, _ = init_chroma()
    return client


def get_collection():
    """Return the manuals collection."""
    _, collection = init_chroma()
    return collection

