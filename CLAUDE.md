# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (also runs TypeScript type check)
npm start        # Run the production build
```

There are no test scripts. Use `npm run build` to verify TypeScript correctness — it will catch type errors before runtime.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in all values before running. The app will start without them but all AI calls and email sends will fail silently or throw at runtime.

Required variables: `ANTHROPIC_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, `APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

## Architecture

### Request flow for an interview session

1. Admin POSTs to `/api/admin/register` → creates a row in `interview_sessions` with a random UUID `token`, signs a **separate JWT** containing `{ sessionId, email }`, emails the JWT as the link URL parameter.
2. Interviewee visits `/interview/[token]` → calls `GET /api/interview/start?token=...` which verifies the JWT, activates the session, and calls `generateInitialQuestions` (Question Bank Agent) to pre-populate `question_cache`.
3. Each chat turn: `POST /api/interview/chat` → verifies JWT, streams Companion Agent response via SSE, then uses `setImmediate` to run Knowledge Graph Agent and optionally Question Bank Agent **after the stream closes** (fire-and-forget, not awaited by the client).

### Two-token distinction

`interview_sessions.token` is a random UUID stored in the DB (used for internal reference only). The URL token is a JWT signed with `JWT_SECRET` that contains `sessionId` — these are different. `verifyInterviewToken` decodes the JWT to get `sessionId`, which is then used to look up the session row.

### The 4 AI agents

All agents call `claude-sonnet-4-6` directly via `@anthropic-ai/sdk`. Each is stateless — context is rebuilt from DB on every invocation.

| Agent | File | Invocation pattern |
|-------|------|--------------------|
| Companion | `lib/agents/companionAgent.ts` | Streaming generator; called on every chat POST |
| Question Bank | `lib/agents/questionBankAgent.ts` | Non-streaming; called at session start and every 5 questions asked |
| Knowledge Graph | `lib/agents/knowledgeGraphAgent.ts` | Non-streaming; called via `setImmediate` every 3 user messages |
| Report | `lib/agents/reportAgent.ts` | Non-streaming; called on demand from admin reports page |

### Database

SQLite file at `data/knowledge.db` (auto-created). `lib/db.ts` exports a synchronous singleton using `better-sqlite3`. The DB is initialized lazily on first call to `getDb()`. All functions in `lib/db.ts` are synchronous.

The knowledge graph is stored as a JSON blob in `knowledge_graphs.graph_data` (not as relational rows). `upsertKnowledgeGraph` replaces the entire blob atomically. Knowledge markup is a Markdown string accumulated per topic in `knowledge_graphs.markup`.

### Admin authentication

Cookie `admin_token` holds a JWT verified by `verifyAdminToken`. All `/api/admin/*` and `/api/knowledge/*` and `/api/reports/*` routes check this cookie. There is no registration flow — credentials come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars compared in plaintext by `verifyAdminCredentials`.

### Streaming (SSE)

`/api/interview/chat` returns `Content-Type: text/event-stream`. Each chunk is `data: {"text":"..."}\n\n`. End-of-stream is `data: [DONE]\n\n`. Session completion sends `data: {"sessionComplete":true}\n\n` before `[DONE]`. The client in `app/interview/[token]/page.tsx` reads the stream with `ReadableStream.getReader()` and accumulates text into the last message in state.

### Native modules

`next.config.ts` declares `serverExternalPackages: ['better-sqlite3', 'pdfkit', 'nodemailer']` so Next.js does not bundle these — they are required at runtime from `node_modules`. **Do not remove this.** `better-sqlite3` requires v12+ for Node v24 compatibility.

### PDF generation

`generatePDF` in `lib/agents/reportAgent.ts` returns a `Buffer`. When passing it to the Web `Response` constructor, wrap it as `new Uint8Array(buffer)` — `Buffer` is not accepted directly as `BodyInit` in Next.js 16.

### Knowledge graph update cadence

- Graph is updated every 3 user messages (`userMessageCount % 3 === 0 || userMessageCount === 1`)
- Question queue is refreshed every 5 questions asked (`questionsAsked % 5 === 0`)
- Both run in `setImmediate` callbacks after the SSE stream closes — errors are caught and logged but do not affect the response
