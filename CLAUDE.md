# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

Copy `.env.example` to `.env.local`. The app starts without env vars but all AI calls and email sends will fail at runtime.

Required: `ANTHROPIC_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, `APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

**Critical:** Next.js/Turbopack inlines `process.env` at compile time. `lib/config.ts` works around this by reading `.env.local` directly from disk at runtime. All agents and auth must use `getEnv('KEY')` from `lib/config.ts` — never `process.env.KEY` directly. Verify with `/api/test-env`.

## Architecture

### Request flow for an interview session

1. Admin POSTs to `/api/admin/register` → creates a row in `interview_sessions`, signs a JWT `{ sessionId, email }`, emails it as the link URL parameter.
2. Interviewee visits `/interview/[token]` → `GET /api/interview/start?token=...` verifies the JWT, activates the session, calls `generateInitialQuestions` (Question Bank Agent) to pre-populate `question_cache`.
3. Each chat turn: `POST /api/interview/chat` → verifies JWT, streams Companion Agent response via SSE, then runs Knowledge Graph Agent and optionally Question Bank Agent as a **fire-and-forget async IIFE** after the stream closes.

### Two-token distinction

`interview_sessions.token` is a random UUID in the DB (internal reference only). The URL token is a JWT signed with `JWT_SECRET` containing `{ sessionId, email }`. `verifyInterviewToken` decodes the JWT to get `sessionId` for DB lookup. These are entirely separate.

### The 4 AI agents

All call `claude-sonnet-4-6` via `@anthropic-ai/sdk`. Each is stateless — context rebuilt from DB on every call. Client instantiation is lazy: `const getClient = () => new Anthropic({ apiKey: getEnv('ANTHROPIC_API_KEY') })`.

| Agent | File | Invocation |
|-------|------|-----------|
| Companion | `lib/agents/companionAgent.ts` | Streaming async generator; every chat POST |
| Question Bank | `lib/agents/questionBankAgent.ts` | Non-streaming; session start + every 5 user messages |
| Knowledge Graph | `lib/agents/knowledgeGraphAgent.ts` | Non-streaming; fire-and-forget after every non-first exchange |
| Report | `lib/agents/reportAgent.ts` | Non-streaming; on-demand from admin reports page |

### Knowledge graph update logic

After each exchange (skipping the first greeting), the background task:
1. Re-fetches the latest graph from DB (`getKnowledgeGraph`) — never uses stale snapshots
2. Passes `{ question: fullResponse, answer: userMessage }` directly from the current request scope
3. Merges new nodes/edges/gaps and saves atomically via `upsertKnowledgeGraph`
4. Every 5 user messages, refreshes the question queue via `generateGapQuestions`

The graph is shared per topic across all sessions. One row per topic in `knowledge_graphs` — `graph_data` (JSON blob) + `markup` (accumulated Markdown).

### Database

SQLite at `data/knowledge.db` (auto-created). `lib/db.ts` exports a synchronous singleton via `better-sqlite3`. All DB functions are synchronous. Knowledge graph stored as a single JSON blob replaced atomically — not as relational rows.

### Admin authentication

The admin portal has no login page — the dashboard is accessed directly at `/admin`. Cookie `admin_token` (JWT, 24h) is set on login with `sameSite: 'none'` and `secure` based on whether `APP_URL` starts with `https`. All `/api/admin/*`, `/api/knowledge/*`, and `/api/reports/*` routes verify this cookie.

All fetch calls from admin pages must include `credentials: 'include'` — required for cookie transmission over tunnel URLs (ngrok/Cloudflare).

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
