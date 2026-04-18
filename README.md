# Knowledge Companion

An AI-powered interview platform that conducts structured knowledge assessments, builds a dynamic knowledge graph from responses, and generates professional reports.

## Features

- **Admin Portal** — Register interviewees, set topic, depth level, and duration
- **Email Invitations** — JWT-signed links sent automatically via SMTP
- **AI Companion Agent** — Conducts timed interviews with progressive questions using Claude
- **Knowledge Graph** — Automatically extracts concepts, relationships, and gaps from each exchange
- **Question Bank Agent** — Generates targeted questions based on identified knowledge gaps
- **Report Generation** — Produces Assessment, Knowledge, and Gap Analysis reports as PDF

## Tech Stack

- **Frontend/Backend**: Next.js 16 (App Router) + TypeScript + TailwindCSS
- **AI**: Anthropic Claude (claude-sonnet-4-6) — 4 specialized agents
- **Database**: SQLite via better-sqlite3
- **Auth**: JWT tokens (interview links) + httpOnly cookie (admin)
- **Email**: Nodemailer + Gmail SMTP
- **PDF**: PDFKit

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |
| `JWT_SECRET` | Random secret for signing tokens |
| `APP_URL` | Public URL of the app (e.g. ngrok URL) |
| `SMTP_HOST` | SMTP server (e.g. smtp.gmail.com) |
| `SMTP_PORT` | SMTP port (587) |
| `SMTP_USER` | SMTP username / Gmail address |
| `SMTP_PASS` | SMTP app password (no spaces) |
| `EMAIL_FROM` | Sender display name |

### 3. Run the dev server

```bash
npm run dev
```

App runs at `http://localhost:3000`.

### 4. Expose to the internet (optional)

```bash
ngrok http 3000
```

Update `APP_URL` in `.env.local` to the ngrok URL, then restart the server.

## Architecture

```
Admin registers interviewee
        ↓
Question Bank Agent generates initial questions
        ↓
Email sent with JWT-signed interview link
        ↓
Interviewee clicks link → AI Companion conducts interview (SSE streaming)
        ↓
Knowledge Graph Agent extracts concepts after each exchange (background)
        ↓
Admin views Knowledge Graph + generates PDF reports
```

### AI Agents

| Agent | Purpose |
|-------|---------|
| Companion | Conducts the interview, streams responses |
| Question Bank | Generates initial and gap-filling questions |
| Knowledge Graph | Extracts concepts/relationships from each Q&A exchange |
| Report | Generates Assessment, Knowledge, and Gap Analysis reports |

## Notes

- The SQLite database is created automatically at `data/knowledge.db` on first run
- `.env.local` and `data/` are excluded from git — never commit secrets
- For Gmail SMTP, use an [App Password](https://support.google.com/accounts/answer/185833) (not your account password)
- `better-sqlite3` requires Node.js v18+
