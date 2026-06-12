# AgentMind — Agentic Multi-Modal AI Assistant

An autonomous AI agent that accepts **Text, Images, PDFs, and Audio** simultaneously, extracts content from all inputs in parallel, understands the user's goal, plans the minimum viable tool sequence, and executes it autonomously — powered by **Groq** (llama-3.3-70b-versatile).

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Available-brightgreen)](https://agentmind.replit.app)

---

## Features

| Capability | Description |
|---|---|
| **Multi-modal input** | Text + Images + PDFs + Audio in a single request |
| **OCR** | Image → text via Groq vision (llama-4-scout) |
| **PDF parsing** | pdf-parse + OCR fallback for scanned docs |
| **Audio transcription** | MP3/WAV/M4A → text via Groq Whisper |
| **Summarization** | 1-line + 3 bullets + 5-sentence summary |
| **Sentiment analysis** | Label + confidence + justification |
| **Code explanation** | Language detection + bug detection + time complexity |
| **YouTube transcripts** | Auto-detects YouTube URLs → fetches transcript → summarizes |
| **Cross-input reasoning** | Compare content across multiple files/inputs |
| **Clarification** | Asks a follow-up question if intent is ambiguous |
| **Plan trace** | Every tool step shown in the UI |
| **Cost estimator** | Token count + USD estimate per request |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      React Frontend                      │
│  Chat UI · File Upload · Plan Trace · Extracted Content  │
└────────────────────────┬────────────────────────────────┘
                         │ POST /api/agent/chat (multipart)
┌────────────────────────▼────────────────────────────────┐
│                    Express API Server                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Extraction Pipeline                 │   │
│  │  Image → Groq Vision OCR                         │   │
│  │  PDF   → pdf-parse                               │   │
│  │  Audio → Groq Whisper                            │   │
│  │  (all files extracted in parallel)               │   │
│  └────────────────────┬────────────────────────────┘   │
│                       │                                 │
│  ┌────────────────────▼────────────────────────────┐   │
│  │              Agent Orchestrator                   │   │
│  │  llama-3.3-70b-versatile + Tool Calling           │   │
│  │  Determines intent → plans tool sequence          │   │
│  └────────────────────┬────────────────────────────┘   │
│                       │                                 │
│  ┌────────────────────▼────────────────────────────┐   │
│  │                 Tool Registry                     │   │
│  │  summarize · sentiment · explain_code             │   │
│  │  fetch_youtube_transcript · answer_question       │   │
│  │  compare_documents · ask_clarification            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

- **Runtime:** Node.js 24, TypeScript 5.9, pnpm workspaces
- **API:** Express 5 + Multer (file uploads up to 50MB)
- **Frontend:** React + Vite + TailwindCSS + Shadcn UI
- **AI Models (Groq):**
  - `llama-3.3-70b-versatile` — agent reasoning + tool calling
  - `meta-llama/llama-4-scout-17b-16e-instruct` — image OCR
  - `whisper-large-v3` — audio transcription
- **PDF:** pdf-parse
- **YouTube:** youtube-transcript

---

## Quick Start

### Prerequisites
- Node.js 24+
- pnpm
- A [Groq API key](https://console.groq.com)

### Setup

```bash
# Clone
git clone https://github.com/mohawwwk/agentmind.git
cd agentmind

# Install dependencies
pnpm install

# Set environment variable
export GROQ_API_KEY=your_groq_api_key_here

# Start API server (port 8080)
pnpm --filter @workspace/api-server run dev

# In another terminal — start frontend (port 21419)
pnpm --filter @workspace/agent-ui run dev
```

Open `http://localhost:21419`

---

## API

### `POST /api/agent/chat`

**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | The user's text query |
| `files` | File[] | Images, PDFs, or audio files (optional) |

**Response:**
```json
{
  "conversationId": "uuid",
  "extracted": [
    { "filename": "doc.pdf", "fileType": "pdf", "text": "...", "confidence": 0.99 }
  ],
  "plan": [
    { "step": 1, "tool": "intent_detection", "status": "done", "description": "..." }
  ],
  "answer": "**Summary**\n\nOne-line: ...",
  "needsClarification": false,
  "followUpQuestion": null,
  "tokenCount": 1420,
  "estimatedCostUsd": 0.00099
}
```

---

## Sample Test Cases

### Test 1 — Audio Transcription + Summary
```
Files: lecture.mp3
Query: "Summarize this"
Expected: Transcription + 1-line + 3 bullets + 5-sentence summary + duration
```

### Test 2 — PDF + Natural Language Query
```
Files: meeting_notes.pdf
Query: "What are the action items?"
Expected: Extracted PDF text → filtered action items
```

### Test 3 — Image with Code
```
Files: code_screenshot.png
Query: "Explain"
Expected: OCR → language detected → explanation + bugs + time complexity
```

### Test 4 — YouTube URL Chain (Multi-step)
```
Files: document_with_yt_url.pdf
Query: "Hit the YouTube URL in this PDF and give me a summary"
Expected: PDF parse → detect URL → fetch transcript → summarize (no prompting between steps)
```

### Test 5 — Cross-Input Comparison
```
Files: lecture.mp3 + notes.pdf
Query: "Do the audio and document discuss the same topic?"
Expected: Transcribe audio + parse PDF → comparative analysis
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Your Groq API key from [console.groq.com](https://console.groq.com) |

---

## Project Structure

```
.
├── artifacts/
│   ├── api-server/          # Express backend
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── groq-client.ts    # Groq SDK + model constants
│   │       │   ├── extractor.ts      # File extraction (OCR/PDF/audio)
│   │       │   ├── tools.ts          # Tool implementations
│   │       │   └── agent.ts          # Agent orchestration
│   │       └── routes/
│   │           └── agent.ts          # POST /api/agent/chat
│   └── agent-ui/            # React frontend
│       └── src/
│           ├── pages/ChatPage.tsx
│           └── components/
├── lib/
│   ├── api-spec/            # OpenAPI contract (source of truth)
│   ├── api-zod/             # Generated Zod schemas
│   └── api-client-react/    # Generated React Query hooks
└── README.md
```

---

## License

MIT
