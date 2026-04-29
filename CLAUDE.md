# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Branch:** This is the `KG1` branch — a simplified version with no admin portal, no JWT auth, and no email invitations. Users start interviews directly from the landing page.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000 (Turbopack)
npm run build    # Production build + TypeScript type check
npm start        # Run the production build (significantly faster than dev)
```

No test scripts exist. Use `npm run build` to catch TypeScript errors before runtime.

## Exposing to the Internet

```bash
# Cloudflare tunnel (preferred — works through corporate firewalls)
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000

# ngrok (alternative)
ngrok http 3000
```

After starting a tunnel, update `APP_URL` in `.env.local` to the public URL and add the hostname to `allowedDevOrigins` in `next.config.ts`. Restart the server after `.env.local` changes.

## Environment Setup

Copy `.env.example` to `.env.local`. Only two variables are needed:

```env
ANTHROPIC_API_KEY=sk-ant-...
APP_URL=http://localhost:3000
```

No SMTP, JWT, or admin credentials required — email sending and admin auth have been removed.

**Critical:** Next.js/Turbopack inlines `process.env` at compile time. `lib/config.ts` works around this by reading `.env.local` directly from disk at runtime. All agents must use `getEnv('KEY')` from `lib/config.ts` — never `process.env.KEY` directly. Verify with `/api/test-env`.

## Architecture

### Request flow for an interview session

1. User fills the setup form at `/` (Name, Topic, Depth, Duration) → `POST /api/session/create` → returns `{ sessionId }` → browser redirects to `/interview/[sessionId]`.
2. Interview page calls `GET /api/interview/start?sessionId=X` → activates the session, calls Question Bank Agent to pre-populate `question_cache`, returns session metadata + message history.
3. Each chat turn: `POST /api/interview/chat` with `{ sessionId, userMessage }` → streams Companion Agent response via SSE, then runs Knowledge Graph Agent and optionally Question Bank Agent as a **fire-and-forget async IIFE** after the stream closes.

### No authentication

There is no login, no JWT verification, and no admin portal in this branch. Sessions are identified by their numeric DB row ID (`session.id`). Anyone with a `/interview/[sessionId]` URL can access that session — this is intentional for open demos.

### The 4 AI agents

All call `claude-sonnet-4-6` via `@anthropic-ai/sdk`. Each is stateless — context rebuilt from DB on every call. Client instantiation is lazy: `const getClient = () => new Anthropic({ apiKey: getEnv('ANTHROPIC_API_KEY') })`.

| Agent | File | Invocation |
|-------|------|-----------|
| Companion | `lib/agents/companionAgent.ts` | Streaming async generator; every chat POST |
| Question Bank | `lib/agents/questionBankAgent.ts` | Non-streaming; session start + every 5 user messages |
| Knowledge Graph | `lib/agents/knowledgeGraphAgent.ts` | Non-streaming; fire-and-forget after every non-first exchange |
| Report | `lib/agents/reportAgent.ts` | Non-streaming; on-demand via `/api/reports/generate` |

### Knowledge graph update logic

After each exchange (skipping the first greeting), the background task:
1. Re-fetches the latest graph from DB (`getKnowledgeGraph`) — never uses stale snapshots
2. Passes `{ question: fullResponse, answer: userMessage }` directly from the current request scope
3. Merges new nodes/edges/gaps and saves atomically via `upsertKnowledgeGraph`
4. Every 5 user messages, refreshes the question queue via `generateGapQuestions`

The graph is shared per topic across all sessions. One row per topic in `knowledge_graphs` — `graph_data` (JSON blob) + `markup` (accumulated Markdown).

### Database

SQLite at `data/knowledge.db` (auto-created). `lib/db.ts` exports a synchronous singleton via `better-sqlite3`. All DB functions are synchronous. Knowledge graph stored as a single JSON blob replaced atomically — not as relational rows.

### Streaming (SSE)

`/api/interview/chat` returns `Content-Type: text/event-stream`. Format:
- Chunk: `data: {"text":"..."}\n\n`
- End: `data: [DONE]\n\n`
- Session complete: `data: {"sessionComplete":true}\n\n` (sent before `[DONE]`)

The client uses a `useRef` guard (`isSendingRef`) to prevent concurrent sends while streaming.

### Native modules

`next.config.ts` declares `serverExternalPackages: ['better-sqlite3', 'pdfkit', 'nodemailer']`. **Do not remove.** `better-sqlite3` v12+ required for Node v24 compatibility.

### PDF generation

`generatePDF` returns a `Buffer`. Wrap as `new Uint8Array(buffer)` when passing to `Response` — `Buffer` is not accepted as `BodyInit` in Next.js 16.

### allowedDevOrigins

When using tunnels in dev mode, add the tunnel hostname to `allowedDevOrigins` in `next.config.ts` to prevent Next.js from blocking cross-origin requests to dev resources. Restart server after changes.

## Route Map

| Route | Purpose |
|-------|---------|
| `GET /` | Setup form — name, topic, depth, duration |
| `GET /interview/[sessionId]` | Chat UI with SSE streaming and countdown timer |
| `POST /api/session/create` | Create session, return sessionId (no auth) |
| `GET /api/interview/start` | Activate session, generate initial questions |
| `POST /api/interview/chat` | Stream Companion Agent response via SSE |
| `GET /api/knowledge/graph` | Read knowledge graph for a topic |
| `POST /api/reports/generate` | Generate PDF/Markdown report |
| `GET /api/reports/list` | List saved reports |
| `GET /api/test-env` | Verify ANTHROPIC_API_KEY is loaded |
