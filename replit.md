# AgentMind — Agentic Multi-Modal AI Assistant

An autonomous AI agent that accepts Text, Images, PDFs, and Audio simultaneously, extracts content, determines user intent, plans a minimal tool sequence, and executes it — powered by Groq (llama-3.3-70b-versatile).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/agent-ui run dev` — run the React frontend (port 21419)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `GROQ_API_KEY` — Groq API key (set in Replit Secrets)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + multer (file uploads)
- Frontend: React + Vite + TailwindCSS + Shadcn UI
- AI: Groq SDK — llama-3.3-70b-versatile (agent/reasoning), whisper-large-v3 (audio), meta-llama/llama-4-scout-17b-16e-instruct (vision/OCR)
- PDF parsing: pdf-parse
- YouTube transcripts: youtube-transcript
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-zod/` — generated Zod schemas (server validation)
- `lib/api-client-react/` — generated React Query hooks (frontend)
- `artifacts/api-server/src/lib/groq-client.ts` — Groq SDK client, model constants
- `artifacts/api-server/src/lib/extractor.ts` — file extraction (image OCR, PDF parse, audio transcription)
- `artifacts/api-server/src/lib/tools.ts` — agent tools (summarize, sentiment, code explain, YouTube, Q&A, compare)
- `artifacts/api-server/src/lib/agent.ts` — agent orchestration with tool-calling
- `artifacts/api-server/src/routes/agent.ts` — POST /api/agent/chat (multipart/form-data)
- `artifacts/agent-ui/src/` — React chat UI

## Architecture Decisions

- **Contract-first API**: OpenAPI spec gates codegen → Zod schemas (server) + React Query hooks (client)
- **Stateless agent**: No DB; each request is self-contained. Conversation history is local React state only.
- **Groq tool-calling**: llama-3.3-70b-versatile used with function calling to plan minimal tool sequences autonomously
- **Parallel extraction**: All uploaded files are extracted concurrently before the LLM sees them
- **Vision model separation**: Uses llama-4-scout for image OCR, llama-3.3-70b for reasoning, whisper for audio — best model per task

## Product

- Multi-modal chat: send text + images + PDFs + audio in one request
- Agent autonomously determines intent, plans tools, executes, returns answer
- If intent is unclear, asks a clarifying follow-up question before acting
- Supported tasks: summarize, sentiment analysis, code explanation, YouTube transcript fetch + summarize, cross-input comparison, general Q&A
- UI shows: chat history, extracted file content, plan trace (tool steps), cost estimator

## User Preferences

- Use Groq API (`GROQ_API_KEY`) with llama-3.3-70b-versatile as the primary model

## Gotchas

- File upload limit: 50MB per file
- The generated `useAgentChat` hook doesn't support multipart — the frontend uses a raw `useMutation` + `FormData` instead
- PDF parsing uses `pdf-parse/lib/pdf-parse.js` (dynamic import with direct path) to avoid ESM/CJS issues
- Always run codegen after changing `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
