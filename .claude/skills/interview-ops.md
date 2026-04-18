# interview-ops skill

## When to use
Invoke this skill when the user asks to:
- Inspect sessions, knowledge graphs, or reports in the DB
- Check app health or debug interview session state
- Seed test data or reset the database
- Understand what data exists for a given topic
- Generate a quick summary of all active interviews

## How to execute

### Inspect the SQLite database directly
```bash
# List all sessions
node -e "
const DB = require('better-sqlite3');
const db = new DB('./data/knowledge.db');
const sessions = db.prepare('SELECT id, name, email, topic, depth, status, duration_minutes, created_at FROM interview_sessions ORDER BY created_at DESC').all();
console.table(sessions);
db.close();
"

# Show knowledge graph for a specific topic (replace TOPIC)
node -e "
const DB = require('better-sqlite3');
const db = new DB('./data/knowledge.db');
const row = db.prepare('SELECT graph_data FROM knowledge_graphs WHERE topic = ?').get('TOPIC');
if (row) {
  const g = JSON.parse(row.graph_data);
  console.log('Nodes:', g.nodes.length, '| Edges:', g.edges.length, '| Gaps:', g.gaps.length);
  g.nodes.sort((a,b)=>b.confidence-a.confidence).slice(0,10).forEach(n=>
    console.log(' -', n.concept, Math.round(n.confidence*100)+'%', n.category)
  );
} else { console.log('No graph for this topic yet'); }
db.close();
"

# Show all messages for a session (replace SESSION_ID)
node -e "
const DB = require('better-sqlite3');
const db = new DB('./data/knowledge.db');
const msgs = db.prepare('SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY id').all(SESSION_ID);
msgs.forEach(m => console.log('['+m.role+']', m.content.slice(0,120)));
db.close();
"

# Reset a stuck session back to pending (replace SESSION_ID)
node -e "
const DB = require('better-sqlite3');
const db = new DB('./data/knowledge.db');
db.prepare('UPDATE interview_sessions SET status=?, started_at=NULL WHERE id=?').run('pending', SESSION_ID);
console.log('Reset session', SESSION_ID);
db.close();
"

# Delete all data and start fresh (DESTRUCTIVE)
node -e "
const fs = require('fs');
if (fs.existsSync('./data/knowledge.db')) {
  fs.unlinkSync('./data/knowledge.db');
  console.log('Database deleted — will be recreated on next request');
}
"
```

### Test that the dev server is responding
```bash
# Check admin login (should return 401 without credentials)
curl -s http://localhost:3000/api/admin/sessions | head -c 100

# Check a specific interview token is valid
curl -s "http://localhost:3000/api/interview/start?token=TOKEN" | head -c 200
```

### Seed a test session without sending email
```bash
node -e "
const DB = require('better-sqlite3');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const db = new DB('./data/knowledge.db');

const token = randomUUID();
const result = db.prepare(
  'INSERT INTO interview_sessions (email, name, topic, depth, duration_minutes, token) VALUES (?,?,?,?,?,?)'
).run('test@example.com', 'Test User', 'JavaScript Fundamentals', 'intermediate', 20, token);

const sessionId = result.lastInsertRowid;
const jwtToken = jwt.sign({ sessionId, email: 'test@example.com' }, process.env.JWT_SECRET || 'dev-secret-change-in-production', { expiresIn: '7d' });

console.log('Session ID:', sessionId);
console.log('Interview URL:', (process.env.APP_URL || 'http://localhost:3000') + '/interview/' + jwtToken);
db.close();
"
```

## Key things to know when debugging

- The DB file lives at `data/knowledge.db` relative to project root — created automatically on first request
- Session `token` (UUID in DB) ≠ the JWT in the email link. The JWT contains `sessionId` which maps to `interview_sessions.id`
- Knowledge graph updates run in `setImmediate` after the SSE stream closes — check server console for `Background graph update failed` errors
- If `better-sqlite3` throws on startup, verify Node version is v24+ and `better-sqlite3` is v12+: `node -e "require('better-sqlite3')" && echo OK`
- PDF generation uses PDFKit synchronously via a Promise/event wrapper — if it hangs, check `pdfkit` is listed in `serverExternalPackages` in `next.config.ts`
