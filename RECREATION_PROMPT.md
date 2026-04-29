# Knowledge Companion — Master Recreation Prompt

Use this prompt to recreate the entire Knowledge Companion app from scratch with Claude Code.

---

## THE PROMPT

Build a full-stack AI-powered interview platform called **Knowledge Companion**. It acts as a Digital Twin Expert — an AI agent that conducts structured knowledge assessment interviews on behalf of human experts, so humans don't have to be present.

---

## Tech Stack

- **Next.js 16** (App Router, TypeScript, TailwindCSS)
- **Anthropic Claude API** (`claude-sonnet-4-6`) — 4 AI agents
- **SQLite** via `better-sqlite3` v12+ (required for Node v24)
- **JWT** via `jsonwebtoken` for auth
- **Nodemailer** for email (Gmail SMTP)
- **PDFKit** for PDF report generation
- **bcryptjs** (installed but auth uses plaintext env var comparison)

---

## Core Features

### 1. Admin Portal (`/admin`)
- No login page — dashboard is accessed directly at `/admin`
- Admin cookie (`admin_token` JWT, 24h) set via POST `/api/admin/login`
- Cookie settings: `httpOnly: true`, `sameSite: 'none'`, `secure: true` when APP_URL starts with `https`
- All admin fetch calls must include `credentials: 'include'`
- Dashboard shows: Total / Pending / Active / Completed session counts
- Tabs: Sessions list, Register Person form, Knowledge Graph viewer
- Reports page at `/admin/reports`

### 2. Interviewee Registration
- Admin fills: name, email, topic, depth (`beginner`/`intermediate`/`advanced`/`expert`), duration (minutes)
- System creates a session row in DB with a random UUID `token`
- Signs a **separate JWT** `{ sessionId, email }` (7d expiry) — this is what goes in the email link
- Sends email with link: `{APP_URL}/interview/{JWT}`
- These two tokens are completely different — the UUID is internal, the JWT is what the interviewee uses

### 3. Interview Session (`/interview/[token]`)
- `GET /api/interview/start?token=JWT` — verifies JWT, activates session, calls Question Bank Agent to pre-generate questions
- Confirmation screen before interview starts (shows name, topic, depth, duration)
- Chat interface with countdown timer (updates every 10 seconds)
- AI Companion streams responses via SSE
- `useRef` guard (`isSendingRef`) prevents concurrent sends while streaming
- Auto-completes when time expires

### 4. Chat API (`POST /api/interview/chat`)
- Verifies JWT token on every request
- Persists user message, then streams Companion Agent response via SSE
- SSE format: `data: {"text":"..."}\n\n`, ends with `data: [DONE]\n\n`
- Session complete signal: `data: {"sessionComplete":true}\n\n` before `[DONE]`
- After stream closes: fire-and-forget async IIFE runs Knowledge Graph update
- Every 5 user messages: also runs Question Bank gap-fill

### 5. Knowledge Graph
- Updated after EVERY exchange (except the first greeting)
- Always re-fetches graph from DB before updating (never uses stale snapshots)
- Passes `{ question: fullResponse, answer: userMessage }` from current request scope directly
- One graph per topic shared across all sessions
- Stored as JSON blob in SQLite (`knowledge_graphs.graph_data`)
- Markup stored as accumulated Markdown string (`knowledge_graphs.markup`)

### 6. Reports (`/admin/reports`)
- Three report types: Assessment, Knowledge, Gap Analysis
- Generated as Markdown by Claude, converted to styled PDF by PDFKit
- PDF uses branded cover page (blue header) and page footers
- `Buffer` from PDFKit must be wrapped as `new Uint8Array(buffer)` for Next.js 16 `Response`

---

## The 4 AI Agents

All agents use lazy client instantiation: `const getClient = () => new Anthropic({ apiKey: getEnv('ANTHROPIC_API_KEY') })`

### Companion Agent (`lib/agents/companionAgent.ts`)
- Async generator yielding text chunks for SSE streaming
- System prompt includes: name, topic, depth, time remaining, questions asked, knowledge summary, next suggested question from queue
- Adapts tone by depth level (beginner → expert)
- Warns candidate at ≤5 min and ≤2 min remaining
- `buildKnowledgeSummary(graph)` converts graph nodes to a readable summary

### Question Bank Agent (`lib/agents/questionBankAgent.ts`)
- `generateInitialQuestions(topic, depth, durationMinutes)` — generates `Math.min(Math.max(Math.floor(duration/3), 5), 20)` questions
- `generateGapQuestions(topic, depth, graph, markup, existingQuestions)` — generates 5 targeted gap-filling questions
- Returns JSON: `{ questions: [{ question, priority, rationale }] }`
- Priority 1–10 (10 = must-ask foundational)

### Knowledge Graph Agent (`lib/agents/knowledgeGraphAgent.ts`)
- `updateKnowledgeGraph(currentGraph, currentMarkup, exchange, topic, sessionId)`
- Claude returns pure JSON (strips markdown fences before parsing):
```json
{
  "newNodes": [{ "concept": "", "description": "", "confidence": 0.8, "category": "", "frequency": 1 }],
  "newEdges": [{ "fromConcept": "", "toConcept": "", "relationship": "", "strength": 0.7 }],
  "gaps": [{ "topic": "", "description": "", "importance": "high|medium|low" }],
  "markupAddition": "1-2 sentence markdown summary"
}
```
- Merge logic: existing nodes have confidence averaged upward + frequency incremented; gaps with confidence > 0.6 are removed
- `appendMarkup` adds timestamped entry per exchange

### Report Agent (`lib/agents/reportAgent.ts`)
- `generateReportMarkdown(type, topic, sessions, graph, markup, allMessages)` — calls Claude with structured data
- `generatePDF(report)` — PDFKit Promise wrapper, returns Buffer
- Three report types: `assessment`, `knowledge`, `gap_analysis`

---

## Database Schema (SQLite via better-sqlite3)

```sql
interview_sessions (id, email, name, topic, depth, duration_minutes, token, status, started_at, completed_at, created_at)
messages (id, session_id, role, content, created_at)
knowledge_graphs (id, topic UNIQUE, graph_data, markup, last_updated)
question_cache (id, session_id, question, asked, priority, created_at)
reports (id, title, type, topic, session_id, content, created_at)
```

- `depth` CHECK: `beginner|intermediate|advanced|expert`
- `status` CHECK: `pending|active|completed|expired`
- `role` CHECK: `assistant|user`
- `journal_mode = WAL`, `foreign_keys = ON`
- DB auto-created at `data/knowledge.db` on first call to `getDb()`

---

## Critical Implementation Details

### Environment Variable Fix (`lib/config.ts`)
Next.js/Turbopack inlines `process.env` at compile time, making runtime env vars empty. Fix by reading `.env.local` directly from disk:

```typescript
import fs from 'fs'
import path from 'path'

function loadEnvLocal(): Record<string, string> {
  try {
    const content = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const result: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx < 1) continue
      result[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
    }
    return result
  } catch { return {} }
}

const _envLocal = loadEnvLocal()

export function getEnv(key: string): string {
  return process.env[key] || _envLocal[key] || ''
}
```

Every agent and auth module must use `getEnv('KEY')` — never `process.env.KEY`.

### next.config.ts
```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdfkit', 'nodemailer'],
  allowedDevOrigins: ['your-tunnel-hostname.trycloudflare.com'],
}
```
`serverExternalPackages` is critical — never remove it.

### SSE Headers
```typescript
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  },
})
```

### Background Knowledge Graph Update Pattern
```typescript
// After stream closes — fire-and-forget, never awaited
void (async () => {
  try {
    const latestGraph = getKnowledgeGraph(session.topic)  // always re-fetch
    const latestMarkup = getKnowledgeMarkup(session.topic)
    const { graph, markup } = await updateKnowledgeGraph(
      latestGraph, latestMarkup,
      { question: fullResponse, answer: userMessage },  // use current scope vars directly
      session.topic, session.id
    )
    upsertKnowledgeGraph(session.topic, graph, markup)
  } catch (err) {
    console.error('Background graph update failed:', err)
  }
})()
```

### React Race Condition Guard
```typescript
const isSendingRef = useRef(false)

async function sendMessage() {
  if (isSendingRef.current) return  // synchronous guard
  isSendingRef.current = true
  try {
    // ... fetch and stream
  } finally {
    isSendingRef.current = false
  }
}
```

### Hydration Warning Fix
Add `suppressHydrationWarning` to `<body>` in `app/layout.tsx` to silence browser extension hydration errors.

---

## UI Structure

- **Login page** (`app/page.tsx`) — only if admin is not authenticated; redirects to `/admin`
- **Admin dashboard** (`app/admin/page.tsx`) — sessions list, register form, knowledge graph viewer
- **Reports page** (`app/admin/reports/page.tsx`) — generate and download PDF reports
- **Interview page** (`app/interview/[token]/page.tsx`) — full chat UI with SSE streaming and countdown timer
- Color scheme: Brand blue gradient (`from-brand-900 via-brand-700 to-brand-500`)
- TailwindCSS with custom brand colors in `tailwind.config.ts`

---

## Deployment

### Development
```bash
npm run dev   # Turbopack dev server
```

### Production (much faster)
```bash
npm run build && npm start
```

### Internet Exposure
```bash
# Cloudflare (preferred — works through corporate firewalls)
cloudflared tunnel --url http://localhost:3000

# ngrok
ngrok http 3000
```

After starting tunnel: update `APP_URL` in `.env.local`, add hostname to `allowedDevOrigins` in `next.config.ts`, restart server.

---

## Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=yourpassword
JWT_SECRET=base64-random-32-bytes
APP_URL=https://your-tunnel-url.trycloudflare.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=apppasswordnospaces
EMAIL_FROM=Knowledge Companion
```

For Gmail: use App Password (16 chars, no spaces). Generate JWT_SECRET with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Verify Setup
Visit `/api/test-env` — should return `{"configKey":"SET (sk-ant-...)"}`. If `MISSING`, the `lib/config.ts` fallback isn't working.
