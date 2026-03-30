# IndustrialMind

IndustrialMind is a production-grade AI-powered Industrial IoT monitoring platform that streams live sensor telemetry, detects anomalies, predicts failures, and enables natural-language operations intelligence over both real-time data and uploaded PDF manuals.

## Architecture

```text
┌────────────────────────────── Frontend (React + Vite + MUI) ──────────────────────────────┐
│                                                                                              │
│  Dashboard (Recharts)   Chat Panel   Alerts Panel   RAG Uploader   Observability Bar        │
│           │                  │            │               │                    │              │
└───────────┼──────────────────┼────────────┼───────────────┼────────────────────┼──────────────┘
            │                  │            │               │                    │
            └──────────────────┴────────────┴───────────────┴────────────────────┘
                                       HTTP + WebSocket
                                              │
┌────────────────────────────── Backend (FastAPI + Uvicorn) ───────────────────────────────────┐
│                                                                                               │
│  /ws/sensors (live stream)      /chat (LLM)      /rag/* (PDF + retrieval)      /health       │
│        │                              │                    │                         │          │
│  Sensor Simulator ──> SQLite logs     │             PyMuPDF extraction             Checks      │
│        │                              │                    │                         │          │
│  Anomaly Detector + Failure Trend     └────> LLM Service (Groq primary, Ollama fallback)     │
│                                                   │                                             │
│                                          Langfuse tracing/latency                              │
│                                                   │                                             │
│                                  ChromaDB + nomic-embed-text embeddings                        │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Features

- ⚡ Live industrial telemetry streaming over WebSockets (1-second updates)
- 📈 Real-time animated charts for temperature, pressure, vibration, and motor RPM
- 🤖 Natural language chat with optional live sensor context injection
- 📄 PDF manual ingestion and RAG-powered question answering
- 🚨 Automatic anomaly severity classification (normal, warning, critical)
- 🔧 Failure risk prediction using trend analysis on recent sensor history
- 🔁 Resilient LLM routing: Groq first, Ollama fallback
- 🔍 Langfuse observability for model latency and provider tracking
- 🚀 CI/CD pipeline for Railway (backend) and Vercel (frontend)

## Tech Stack

| Layer | Technologies |
|---|---|
| Backend | FastAPI, Uvicorn, WebSockets, httpx, Pydantic, python-dotenv |
| AI/LLM | Groq (`llama3-70b-8192`), Ollama (`qwen3:8b`) fallback |
| RAG | ChromaDB, PyMuPDF, Ollama `nomic-embed-text` embeddings |
| Data | SQLite sensor history logs |
| Observability | Langfuse |
| Frontend | React, Vite, Material UI (dark theme), Recharts |
| DevOps | GitHub Actions, Railway, Vercel |

## Quick Start

### 1. Clone and enter project

```bash
git clone <your-repo-url>
cd industrialmind
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

### 4. Required local services

- Ollama server running at `http://localhost:11434`
- Pull models:
  - `ollama pull qwen3:8b`
  - `ollama pull nomic-embed-text`
- Optional: Langfuse instance at `http://localhost:3000`

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes (for Groq primary) | Groq API key |
| `OLLAMA_BASE_URL` | Yes | Ollama base URL (`http://localhost:11434`) |
| `CHROMA_PERSIST_DIR` | Yes | Chroma persistence directory |
| `LANGFUSE_SECRET_KEY` | No | Langfuse secret key |
| `LANGFUSE_PUBLIC_KEY` | No | Langfuse public key |
| `LANGFUSE_HOST` | No | Langfuse host URL |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Recommended | Backend HTTP URL |
| `VITE_WS_URL` | Recommended | Backend WebSocket URL |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service status |
| `POST` | `/chat` | LLM chat with optional live sensor context |
| `GET` | `/sensors/latest` | Latest reading for all sensors |
| `GET` | `/sensors/history?sensor=temperature&limit=100` | Historical sensor readings |
| `WS` | `/ws/sensors` | Real-time telemetry stream |
| `POST` | `/rag/upload` | Upload/index PDF manual |
| `POST` | `/rag/query` | Ask questions over indexed manuals |
| `GET` | `/health` | Component health and latency |
| `GET` | `/metrics` | Last 100 LLM latencies and provider metrics |

## Groq → Ollama Fallback Strategy

1. `call_llm()` sends each request to Groq (`llama3-70b-8192`) first.
2. If Groq returns an error, timeout, or `429`, the same request is retried on Ollama (`qwen3:8b`) automatically.
3. Response metadata includes `provider` and `latency_ms`.
4. Every request is traced through Langfuse with prompt, provider, latency, and output.

This keeps IndustrialMind operational during Groq outages or quota pressure while preserving observability.

## Screenshots

- Dashboard: _placeholder_
- Chat panel with provider badge: _placeholder_
- RAG upload/query flow: _placeholder_
- Alerts and observability bar: _placeholder_

## Deployment

- Backend: deploy `backend/` to Railway (Dockerfile included)
- Frontend: deploy `frontend/` to Vercel
- CI/CD: `.github/workflows/deploy.yml` builds and deploys on push to `main`

## License

MIT

