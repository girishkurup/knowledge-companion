# Knowledge Companion

> **Your Digital Twin Expert — conducting structured interviews so human experts don't have to.**

An AI-powered interview platform that deploys a domain-expert AI agent to conduct structured knowledge assessments via chat. The AI interviews people, extracts a dynamic knowledge graph from their responses, and generates professional PDF reports — all without a human interviewer in the room.

---

## The Problem It Solves

Every organisation relies on human experts to interview people — candidates, consultants, architects, project teams. These interviews are expensive, time-consuming, hard to schedule, and produce no structured output. A senior consultant's or CXO's time is finite. Knowledge shared in meetings evaporates.

**Knowledge Companion replaces the human interviewer with a domain-expert AI agent** that asks the right questions, adapts in real time, never forgets an answer, and delivers structured reports the moment the session ends.

---

## Use Cases

### Talent & HR
- **Candidate Screening** — Screen dozens of candidates in parallel before a human ever gets involved. The AI conducts a structured technical or behavioural interview and scores each candidate against the knowledge graph.
- **Exit Interviews** — Capture institutional knowledge from departing employees in a comfortable, bias-free setting before it walks out the door.
- **Onboarding Assessment** — Assess a new hire's actual knowledge baseline on day one and auto-generate a personalised learning gap report.
- **Performance Reviews** — Let employees self-assess their expertise via structured conversation; managers receive a gap analysis rather than a blank form.

### Consulting & Advisory
- **CXO / Executive Knowledge Capture** — A consultant deploying to a new client can send a Knowledge Companion link to the CXO before the first meeting. The AI captures the executive's strategic context, priorities, and pain points — the consultant arrives informed, not blank.
- **Stakeholder Discovery** — Replace long discovery workshops. Send each stakeholder a scoped interview link; consolidate findings into a single knowledge report automatically.
- **Architecture Assessment** — Send a scoped interview to enterprise architects or solution architects. The AI probes design decisions, trade-offs, and rationale. The output is a structured knowledge graph of the architecture landscape.
- **Vendor Assessment** — Assess vendor capabilities through a structured AI interview instead of lengthy RFP questionnaires. Compare vendors objectively using the same knowledge graph.

### Technical Teams
- **Developer Skills Assessment** — Assess individual or team knowledge of specific technologies, frameworks, or system design concepts at any depth level (beginner → expert).
- **Pre-Sprint Knowledge Audit** — Before a project kicks off, assess the team's knowledge of the domain. The gap analysis report directly informs training or staffing decisions.
- **Tech Debt Discovery** — Interview team members about legacy systems to map institutional knowledge before a migration project begins.
- **Security & Compliance Audits** — Structured AI interviews with team members to assess awareness of security practices, compliance requirements, and incident response knowledge.

### Project & Programme Delivery
- **Project Kickoff Assessment** — Before a programme begins, interview all stakeholders on objectives, constraints, and assumptions. The knowledge graph surfaces misalignments early.
- **Lessons Learned Capture** — At project close, interview team members individually. The AI synthesises a collective lessons-learned report without the awkwardness of group retrospectives.
- **Requirements Elicitation** — Replace initial requirements workshops with async AI interviews. Business analysts receive structured output ready for refinement.

### Knowledge Management
- **Expert Knowledge Capture** — Interview subject matter experts before they retire or move on. Build a persistent knowledge graph of their domain expertise that the organisation keeps forever.
- **Research Interviews** — Academics and researchers can run structured interviews at scale without interviewer bias. Each session contributes to a shared knowledge graph.
- **Training Needs Analysis** — Interview an entire department on a topic. The gap analysis report becomes the training curriculum.

---

## Why It Beats Traditional Interviews

| | Traditional Interview | Knowledge Companion |
|---|---|---|
| Scheduling | Requires matching calendars | Interviewee picks their own time |
| Scale | 1 interviewer × 1 person | 1 admin × unlimited concurrent sessions |
| Consistency | Varies by interviewer | Same rigorous questions every time |
| Output | Notes, if you're lucky | Structured knowledge graph + PDF report |
| Expert time cost | High | Zero — the AI is the expert |
| Interviewee comfort | Pressure of live observation | Relaxed async chat environment |
| Knowledge retention | Lost after the meeting | Persisted in graph, searchable forever |

---

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

### 3. Run

```bash
npm run dev        # development — http://localhost:3000
ngrok http 3000    # expose to internet
```

Update `APP_URL` in `.env.local` to the ngrok URL and restart the server.

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

- SQLite database auto-created at `data/knowledge.db` on first run
- `.env.local` and `data/` are excluded from git
- For Gmail SMTP, use an [App Password](https://support.google.com/accounts/answer/185833)
- Requires Node.js v18+
