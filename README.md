# 🔍 Verified RAG Agent

> **A Retrieval-Augmented Generation pipeline with a built-in verification layer — every answer is checked against source documents before you see it.**

---

## ✨ What It Does

Most RAG systems retrieve documents, generate an answer, and leave you to trust that the LLM didn't "hallucinate" details. This project adds a **Verifier Agent** that:

1. Takes the user's question
2. **Retrieves** the top-k most relevant chunks using **hybrid search** (vector + BM25, fused with RRF)
3. **Drafts** an answer using **only** the retrieved chunks — no outside knowledge
4. **Verifies** every claim in the draft against the original source text
5. **Flags or removes** unsupported claims before showing you the final answer

You get a **full trace log**: what was retrieved, what was drafted, and what passed/failed verification — all visible in the UI.

**No paid API keys required by default** — it runs fully offline with [Ollama](https://ollama.com) + ChromaDB. OpenAI and OpenRouter are supported as drop-in providers, switchable at runtime.

---

## 🧠 Architecture (3 Agents)

```
User Query
    │
    ▼
┌──────────────────────────┐
│   1. Retriever Agent     │  Hybrid search: BM25 + embedding vectors
│                          │  (fused via Reciprocal Rank Fusion),
│                          │  top-k chunks from ChromaDB
└──────────┬───────────────┘
           │  retrieved chunks
           ▼
┌──────────────────────────┐
│   2. Draft Agent         │  Generates answer using ONLY the chunks
│                          │  as context. Prompt-engineered to refuse
│                          │  outside knowledge.
└──────────┬───────────────┘
           │  draft answer
           ▼
┌──────────────────────────┐
│   3. Verifier Agent      │  Checks each claim: supported by source?
│                          │  Outputs JSON: { claim, supported, source_chunk }
└──────────┬───────────────┘
           │  verdict per claim + verified answer
           ▼
    ┌──────────────┐
    │  UI          │  Glassmorphism frontend shows the full trace
    └──────────────┘
```

### ⏭ Smart LLM bypass

If the top retrieved chunk's similarity score falls below a `confidence_threshold`, the pipeline **skips the LLM entirely** and returns *"No relevant context found"* — no wasted calls, no hallucinated answers.

---

## 🛠️ Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Vector DB** | [ChromaDB](https://www.trychroma.com/) | Persistent, local-first, no Docker needed |
| **LLM providers** | **Ollama** (default, offline) · OpenAI · OpenRouter | Free local default; cloud options on demand |
| **Embeddings** | `nomic-embed-text` (Ollama, 768-d) · `text-embedding-3-small` (OpenAI) | Local & cloud options |
| **Search** | Hybrid: BM25 (keyword) + vector (semantic), fused with RRF | Catches both exact terms and fuzzy meaning |
| **Backend** | FastAPI + Uvicorn | Lightweight, async, auto-docs |
| **Frontend** | React 18 + Vite + Tailwind CSS + Framer Motion | Glassmorphism design system |
| **Chunking** | Fixed window + optional **semantic** (embedding-distance) splitter | Coherent chunks, PDF & plain-text support |

**Default setup is 100% free and offline** — Ollama + ChromaDB, no API keys, no Docker.

---

## 🚀 Quick Start

### 1. Prerequisites

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com/) installed, running, with models pulled:

```bash
ollama pull nomic-embed-text
ollama pull llama3.2:1b        # or :3b / :7b for better quality
```

> **No Ollama?** Set `provider` to `openai` or `openrouter` in the ⚙ settings panel (or `provider_settings.json`) and add your API key. See [LLM Providers](#llm-providers).

### 2. Install & Run the Backend

```bash
# Create a virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Ingest the sample document
python -m backend.ingestion data/sample.txt

# Start the API server
python -m uvicorn backend.main:app --reload --port 8000
```

The API is now running at **http://localhost:8000** — visit `/docs` for the auto-generated Swagger UI.

### 3. Install & Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### 4. Ask a Question

Type a question about your ingested documents and watch the pipeline execute in real-time:

- **Retrieval Card** slides in with source chunks and relevance scores
- **Draft Card** slides in with the generated answer
- **Verification Card** slides in with per-claim pass/fail verdicts
- **Trace Log** shows the raw JSON for debugging
- **⚙ Settings panel** — switch LLM providers / models live, without a restart

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/pipeline` | Run the full RAG pipeline (retrieve → draft → verify) |
| `GET` | `/health` | Backend status: ChromaDB + LLM provider reachability, doc count |
| `POST` | `/upload` | Upload a document (`.txt`, `.md`, `.pdf`, `.csv`, `.json`, ≤512 KB) for **async** ingestion |
| `GET` | `/upload/{task_id}` | Poll upload progress |
| `GET` | `/documents` | List ingested documents with chunk counts |
| `DELETE` | `/documents/{filename}` | Delete a document and all its chunks |
| `GET` | `/settings` | Current provider settings (API keys masked) |
| `PUT` | `/settings` | Update provider/model settings at runtime (persisted to `provider_settings.json`) |

### `POST /pipeline`

```json
{
  "query": "What is the largest planet in the Solar System?",
  "top_k": 5,
  "filter_source": "sample.txt"
}
```

Response includes `retrieval` (chunks + scores + hybrid flag), `draft` (the answer), `verification` (per-claim verdicts), `pipeline_latency_ms`, and `skipped_llm` (true when the confidence threshold was hit).

---

## ⚙ LLM Providers

Three providers, configured via env vars, `provider_settings.json`, or the UI settings panel (highest precedence last):

| Provider | Notes | Env var(s) |
|----------|-------|-----------|
| **ollama** | Local, free, offline (default) | `OLLAMA_BASE_URL`, `OLLAMA_EMBED_MODEL`, `OLLAMA_DRAFT_MODEL`, `OLLAMA_VERIFIER_MODEL` |
| **openai** | Cloud, needs API key | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_EMBED_MODEL` |
| **openrouter** | One key, many models | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |

Provider resolution: **`provider_settings.json`** (saved from the UI) → `LLM_PROVIDER` env var → auto-detect from API keys → **ollama** default.

Changes made in the ⚙ panel apply **immediately** to the next request and persist across restarts.

---

## 🧪 Ingesting Your Own Documents

**Via the CLI:**

```bash
# Text / Markdown / PDF
python -m backend.ingestion path/to/doc.txt path/to/doc.md path/to/document.pdf

# Recreate the collection from scratch
python -m backend.ingestion --recreate path/to/docs/*.txt

# Tune chunking
python -m backend.ingestion --chunk-size 1000 --chunk-overlap 200 path/to/doc.txt
```

**Via the UI / API:** `POST /upload` accepts `.txt`, `.md`, `.pdf`, `.csv`, `.json` files (max 512 KB) and ingests them in the background — poll `/upload/{task_id}` for progress. Use `/documents` to list and delete.

---

## 📁 Project Structure

```
verified-rag-agent/
├── README.md
├── requirements.txt
├── provider_settings.json   # Persisted provider config (written by ⚙ panel)
│
├── backend/
│   ├── main.py              # FastAPI app (pipeline, upload, docs, settings)
│   ├── config.py            # Settings, provider resolution & persistence
│   ├── ingestion.py         # CLI: chunk + embed + upsert documents
│   │
│   ├── agents/
│   │   ├── retriever.py     # Retriever Agent (hybrid search)
│   │   ├── drafter.py       # Draft Agent (answer from context only)
│   │   └── verifier.py      # Verifier Agent (claim-level grounding)
│   │
│   ├── services/
│   │   ├── llm_client.py        # Unified provider client (ollama/openai/openrouter)
│   │   ├── bm25_retriever.py    # Keyword search (BM25) for hybrid retrieval
│   │   ├── local_embedder.py    # Local (Ollama) embedding helper
│   │   ├── ollama_client.py     # Direct Ollama HTTP client
│   │   └── semantic_chunker.py  # Embedding-distance chunk splitter
│   │
│   └── models/
│       └── schemas.py       # Pydantic models for all data shapes
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js           # Backend API client
│       ├── index.css        # Global styles + glassmorphism tokens
│       └── components/
│           ├── QueryInput.jsx
│           ├── PipelineView.jsx
│           ├── RetrievalCard.jsx
│           ├── DraftCard.jsx
│           ├── VerificationCard.jsx
│           ├── TraceLog.jsx
│           └── SettingsPanel.jsx   # ⚙ provider/model switcher
│
└── data/
    └── sample.txt           # Sample document for ingestion
```

---

## ⚙ Tuning

Key knobs in `backend/config.py` (or env vars):

| Setting | Default | What it does |
|---------|---------|--------------|
| `ENABLE_HYBRID_SEARCH` | `true` | Fuse BM25 + vector results with RRF |
| `ENABLE_SEMANTIC_CHUNKING` | `false` | Use embedding-distance chunking instead of fixed windows |
| `CONFIDENCE_THRESHOLD` | `0.35` | Skip the LLM when the top chunk scores below this |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `800` / `150` | Fixed-window chunking params |
| `RATE_LIMIT_SLEEP` | `0.3` | Small delay between LLM calls to avoid hammering |

---

## 🎨 Design & UX

- **Glassmorphism UI**: translucent frosted-glass panels with `backdrop-filter: blur`, subtle borders, and soft shadows on a dark gradient background
- **Pipeline-as-animation**: each stage slides in sequentially — retrieval → draft → verification — so you can watch the pipeline execute
- **Per-claim verdicts**: each claim shows a subtle check or cross marker with expandable source evidence; no harsh red/green blocks
- **Clean typography**: clear hierarchy, generous whitespace
- **No chat bubbles**: the interface is a pipeline trace, not a chatbot

---

## 🔮 Future Ideas

- **Multi-hop retrieval**: chain multiple retrieve → draft → verify cycles for complex questions
- **Source citations**: highlight inline citations in the verified answer
- **Evaluation harness**: benchmark precision/recall of the verification layer on labeled datasets
- **More local models**: add embedding/reranker support for larger local models

---

## 📄 License

MIT — free for any use, including commercial and portfolio/hackathon projects.

---

*Built with ❤️ for hackathons, portfolios, and anyone who wants grounded AI answers.*
