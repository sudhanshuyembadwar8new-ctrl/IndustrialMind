# ⚡ IndustrialMind

> **AI-powered Industrial IoT platform** that lets you talk to your factory in natural language.
> Monitor live sensors, predict failures before they happen, and ask questions about your machines — all from one dashboard.

🌐 **Live Demo:** https://industrialmind-antigravity.netlify.app
📦 **GitHub:** https://github.com/sudhanshuyembadwar8-ctrl/IndustrialMind
🛠 **Built by:** Sudhanshu Yembadwar — First year B.Tech IIoT, SVPCET Nagpur

---

## 🧠 What Is IndustrialMind?

IndustrialMind is an open-source, production-grade AI platform that connects industrial sensor systems to a large language model brain. Instead of staring at raw numbers on a screen, you can literally *ask your factory* what's wrong.

**Example:**
> 💬 "Which machine is closest to failure right now?"
> 🤖 "Motor 2 on Machine A has a bearing temperature rising 14°C over 6 hours. Failure probability: 78%. Estimated time to failure: 18 hours. Recommend immediate lubrication or replacement."

This is not a toy project. This is a real system built with production-grade engineering practices — RAG pipelines, WebSocket streaming, LLM observability, anomaly detection, and full CI/CD.

---    

## ✨ Features

| Feature | Description |
|---|---|
| 📡 **Live Sensor Dashboard** | Real-time streaming charts for 6 sensors across 3 machines (A, B, C) |
| 🤖 **AI Chat Interface** | Ask natural language questions about your machines with Groq LLM |
| 📄 **RAG Manual Intelligence** | Upload industrial PDF/TXT manuals, ask questions, get cited answers |
| 🚨 **Smart Anomaly Alerts** | Auto-detects critical sensor spikes with severity levels and glowing alerts |
| 🔮 **Failure Prediction** | Linear regression trend analysis with time-to-failure estimates |
| 🔄 **Groq → Ollama Fallback** | Never goes down — cloud LLM with local AI backup |
| 📊 **Observability Dashboard** | Track LLM latency, provider status, request volume |
| 🌙 **Dark Industrial UI** | Glassmorphism cards, glow effects, industrial orange/cyan theme |

---

## 🏗 Architecture

```
                        ┌─────────────────────────────────────┐
                        │         INDUSTRIALMIND               │
                        └─────────────────────────────────────┘

 ┌──────────────────┐     WebSocket      ┌──────────────────────┐
 │  React Frontend  │◄──────────────────►│   FastAPI Backend     │
 │  (Vercel/Netlify)│     REST API       │   (Railway)           │
 │                  │◄──────────────────►│                      │
 │ • Dashboard      │                    │ • /chat              │
 │ • Chat           │                    │ • /ws/sensors        │
 │ • RAG Upload     │                    │ • /rag/upload        │
 │ • Observability  │                    │ • /rag/query         │
 └──────────────────┘                    │ • /health            │
                                         └──────────┬───────────┘
                                                    │
                    ┌───────────────────────────────┼────────────────────┐
                    │                               │                    │
          ┌─────────▼──────┐             ┌─────────▼──────┐   ┌────────▼───────┐
          │   LLM Service  │             │  Sensor Sim    │   │  RAG Service   │
          │                │             │                │   │                │
          │ 1. Try Groq    │             │ 6 sensors      │   │ PyMuPDF        │
          │    (cloud fast)│             │ 3 machines     │   │ nomic-embed    │
          │ 2. Retry 3x    │             │ Anomaly inject │   │ ChromaDB       │
          │ 3. Fallback →  │             │ SQLite logs    │   │ Hybrid search  │
          │    Ollama local│             └────────────────┘   └────────────────┘
          └────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
┌────────▼───────┐   ┌─────────▼──────┐
│  Groq API      │   │  Ollama Local  │
│  llama3-70b    │   │  qwen3:8b      │
│  (Primary)     │   │  (Fallback)    │
└────────────────┘   └────────────────┘
```

---

## 🛠 Tech Stack

### Backend
| Tool | Purpose | Cost |
|---|---|---|
| FastAPI + Uvicorn | API server + WebSockets | Free |
| Groq API (llama3-70b) | Primary LLM inference | Free tier |
| Ollama + qwen3:8b | Local LLM fallback | Free forever |
| ChromaDB | Vector store for RAG | Free |
| nomic-embed-text | Local embeddings via Ollama | Free |
| PyMuPDF | PDF text extraction | Free |
| SQLite | Sensor history logs | Free |
| Langfuse | LLM observability tracing | Free (self-hosted) |
| Pydantic | Schema validation | Free |

### Frontend
| Tool | Purpose | Cost |
|---|---|---|
| React 18 + Vite | UI framework + bundler | Free |
| Material UI | Component library | Free |
| Recharts | Real-time animated charts | Free |
| React Router | Page navigation | Free |
| WebSocket API | Live sensor streaming | Free |

### DevOps
| Tool | Purpose | Cost |
|---|---|---|
| Netlify | Frontend hosting | Free |
| Railway | Backend hosting | Free tier |
| GitHub Actions | CI/CD pipeline | Free |

**Total monthly cost: ₹0**

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.ai) installed locally
- Free [Groq API key](https://console.groq.com/keys)

### 1. Clone the repo
```bash
git clone https://github.com/sudhanshuyembadwar8-ctrl/IndustrialMind.git
cd IndustrialMind
```

### 2. Setup Backend
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Pull Ollama models
ollama pull qwen3:8b
ollama pull nomic-embed-text

# Start backend
uvicorn main:app --port 8000
```

### 3. Setup Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 4. Open in browser
```
http://localhost:5173
```

---

## 🔑 Environment Variables

Create `backend/.env` with:

```env
# Required
GROQ_API_KEY=your_groq_key_here

# Optional (defaults shown)
OLLAMA_BASE_URL=http://localhost:11434
CHROMA_PERSIST_DIR=./chroma_db

# Optional — Langfuse observability
LANGFUSE_SECRET_KEY=your_key
LANGFUSE_PUBLIC_KEY=your_key
LANGFUSE_HOST=http://localhost:3000
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | System health check |
| `GET` | `/sensors/latest` | Latest reading all sensors |
| `GET` | `/sensors/history` | Sensor history from SQLite |
| `WS` | `/ws/sensors` | Live WebSocket stream |
| `POST` | `/chat` | AI chat with sensor context |
| `POST` | `/rag/upload` | Upload PDF/TXT manual |
| `POST` | `/rag/query` | Query uploaded manuals |
| `GET` | `/metrics` | LLM latency metrics |

---

## 🔄 How Groq → Ollama Fallback Works

```
User sends message
       ↓
Try Groq API (llama3-70b-8192)
       ↓
Success? → Return response (fast, ~200ms)
       ↓
Fail? Retry up to 3 times
       ↓
Still failing? → Fallback to Ollama (qwen3:8b)
       ↓
Local inference (slower ~2-5s but always works)
       ↓
Response includes which provider answered
```

This means **IndustrialMind never goes fully offline.** Even if Groq quota exhausts, the system keeps working using your local GPU.

---

## 🚨 Anomaly Detection

Each sensor has three thresholds:

| Severity | Color | Action |
|---|---|---|
| `normal` | Cyan | No action |
| `warning` | Orange glow | Alert generated |
| `critical` | Red pulse | Immediate alert + AI explanation |
| `emergency` | Red flash | Critical alert + time-to-failure |

Failure probability is calculated using **linear regression** on the last 30 sensor readings. If the trend shows a sensor heading toward critical range, it predicts how many hours until failure.

---

## 📄 How RAG Works

1. You upload a PDF/TXT industrial manual
2. PyMuPDF extracts the text
3. Text is split into 600-token chunks with 100-token overlap
4. Each chunk is embedded using `nomic-embed-text` via Ollama (runs locally)
5. Embeddings stored in ChromaDB
6. When you ask a question, it's embedded and compared to all chunks
7. Top 5 most relevant chunks retrieved
8. Chunks + question sent to LLM
9. LLM answers with citations showing which part of the manual it used

---

## 🏆 Challenges We Faced & How We Fixed Them

### Challenge 1 — Codex File Sync Issue
**Problem:** Files generated by Codex were not appearing in Antigravity editor even though they existed on disk.
**Fix:** Discovered files were saved to a hidden `.codex/worktrees/` directory. Used `Ctrl+Shift+P → Open Folder` with the exact path to load them.

### Challenge 2 — PostCSS Config Crash
**Problem:** Build kept failing with `SyntaxError: Unexpected token` in PostCSS config even though we didn't create one.
**Fix:** A corrupted `postcss.config.js` was being auto-generated. Deleted it completely — Vite doesn't need it by default.

### Challenge 3 — Blank Page After Netlify Deploy
**Problem:** Site deployed successfully (200 OK) but showed completely blank white page.
**Fix 1:** Added `_redirects` file with `/* /index.html 200` for React Router to work on Netlify.
**Fix 2:** Set `base: '/'` in `vite.config.js` so asset paths used `/assets/` instead of `./assets/`.

### Challenge 4 — Groq API Quota Exhaustion
**Problem:** Previous projects exhausted Gemini and other free API quotas mid-development.
**Fix:** Built a dual-provider architecture — Groq as primary (500k tokens/day free) with Ollama local model as automatic fallback. The app never dies.

### Challenge 5 — Windows PowerShell `&&` Not Working
**Problem:** Commands like `npm install && npm run build` failed because PowerShell doesn't support `&&`.
**Fix:** Ran commands separately one at a time.

### Challenge 6 — WebSocket on Windows with --reload
**Problem:** FastAPI with `--reload` flag threw `PermissionError [WinError 5]` on Windows repeatedly.
**Fix:** Removed `--reload` flag. Ran `uvicorn main:app --port 8000` without reload for stable operation.

---

## 📁 Project Structure

```
industrialmind/
├── backend/
│   ├── main.py                  # FastAPI app + startup
│   ├── routers/
│   │   ├── chat.py              # AI chat endpoint
│   │   ├── sensors.py           # WebSocket + REST
│   │   ├── rag.py               # PDF upload + query
│   │   └── health.py            # System health
│   ├── services/
│   │   ├── llm_service.py       # Groq → Ollama fallback
│   │   ├── rag_service.py       # PDF + ChromaDB pipeline
│   │   ├── sensor_simulator.py  # 6 sensors, 3 machines
│   │   └── anomaly_detector.py  # Failure prediction
│   ├── db/
│   │   ├── sqlite_client.py     # Sensor history
│   │   └── chroma_client.py     # Vector store
│   ├── schemas/models.py        # Pydantic schemas
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/       # Live sensor charts
│   │   │   ├── ChatPanel/       # AI chat interface
│   │   │   ├── AlertsPanel/     # Anomaly alerts
│   │   │   ├── RAGUploader/     # Manual upload + query
│   │   │   └── ObservabilityBar/# System status strip
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js  # Live data hook
│   │   │   └── useSensorStream.js
│   │   ├── theme/
│   │   │   └── darkIndustrial.js# MUI dark theme
│   │   └── App.jsx
│   └── package.json
│
├── .github/workflows/deploy.yml # CI/CD pipeline
└── README.md
```

---

## 👨‍💻 About The Builder

**Sudhanshu Yembadwar** — First year B.Tech Industrial IoT student at SVPCET Nagpur, India.

Built this project without formal software engineering training using AI-assisted development (Claude + Codex). This project was designed to demonstrate that a first-year student can ship production-grade software that rivals what senior engineers build.

Other projects:
- [iiot-sentinel](https://iiot-sentinel-production.up.railway.app) — Real-time IIoT sensor dashboard
- [aria-diagnostics](https://aria-diagnostics-production.up.railway.app) — AI fault diagnostics
- [MindMap AI](https://mindmap-ai-iota.vercel.app) — AI mind map generator
- [MoodFM](https://moodfm.vercel.app) — AI mood-based music recommender
- [COSMOS](https://cosmo-steel.vercel.app) — 3D universe portfolio

---


## 📄 License

MIT License — free to use, modify, and distribute.

---

<div align="center">

**Built with ₹0 budget. Powered by open source.**

⭐ Star this repo if you found it useful

</div>
