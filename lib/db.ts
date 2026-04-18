import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = path.join(DATA_DIR, 'knowledge.db')

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    initSchema(_db)
  }
  return _db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS interview_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      topic TEXT NOT NULL,
      depth TEXT NOT NULL CHECK(depth IN ('beginner','intermediate','advanced','expert')),
      duration_minutes INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','active','completed','expired')),
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('assistant','user')),
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS knowledge_graphs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL UNIQUE,
      graph_data TEXT NOT NULL DEFAULT '{"nodes":[],"edges":[],"gaps":[]}',
      markup TEXT NOT NULL DEFAULT '',
      last_updated TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS question_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      asked INTEGER DEFAULT 0,
      priority INTEGER DEFAULT 5,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('assessment','knowledge','gap_analysis')),
      topic TEXT,
      session_id INTEGER,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)
}

// --- Session queries ---

export interface Session {
  id: number
  email: string
  name: string
  topic: string
  depth: string
  duration_minutes: number
  token: string
  status: string
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export function createSession(data: {
  email: string
  name: string
  topic: string
  depth: string
  duration_minutes: number
  token: string
}): Session {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO interview_sessions (email, name, topic, depth, duration_minutes, token)
    VALUES (@email, @name, @topic, @depth, @duration_minutes, @token)
  `)
  const result = stmt.run(data)
  return getSessionById(result.lastInsertRowid as number)!
}

export function getSessionById(id: number): Session | null {
  return getDb().prepare('SELECT * FROM interview_sessions WHERE id = ?').get(id) as Session | null
}

export function getSessionByToken(token: string): Session | null {
  return getDb().prepare('SELECT * FROM interview_sessions WHERE token = ?').get(token) as Session | null
}

export function getAllSessions(): Session[] {
  return getDb().prepare('SELECT * FROM interview_sessions ORDER BY created_at DESC').all() as Session[]
}

export function updateSessionStatus(
  id: number,
  status: string,
  extra?: { started_at?: string; completed_at?: string }
) {
  const db = getDb()
  if (extra?.started_at) {
    db.prepare('UPDATE interview_sessions SET status = ?, started_at = ? WHERE id = ?')
      .run(status, extra.started_at, id)
  } else if (extra?.completed_at) {
    db.prepare('UPDATE interview_sessions SET status = ?, completed_at = ? WHERE id = ?')
      .run(status, extra.completed_at, id)
  } else {
    db.prepare('UPDATE interview_sessions SET status = ? WHERE id = ?').run(status, id)
  }
}

// --- Message queries ---

export interface Message {
  id: number
  session_id: number
  role: 'assistant' | 'user'
  content: string
  created_at: string
}

export function addMessage(sessionId: number, role: 'assistant' | 'user', content: string): void {
  getDb().prepare('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)').run(sessionId, role, content)
}

export function getMessages(sessionId: number): Message[] {
  return getDb().prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC').all(sessionId) as Message[]
}

// --- Knowledge graph queries ---

export interface KnowledgeNode {
  id: string
  concept: string
  description: string
  confidence: number
  frequency: number
  category: string
  sessionIds: number[]
}

export interface KnowledgeEdge {
  id: string
  fromId: string
  toId: string
  relationship: string
  strength: number
}

export interface KnowledgeGap {
  topic: string
  description: string
  importance: 'high' | 'medium' | 'low'
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  gaps: KnowledgeGap[]
}

export function getKnowledgeGraph(topic: string): KnowledgeGraph {
  const row = getDb()
    .prepare('SELECT graph_data FROM knowledge_graphs WHERE topic = ?')
    .get(topic) as { graph_data: string } | undefined

  if (!row) return { nodes: [], edges: [], gaps: [] }
  return JSON.parse(row.graph_data) as KnowledgeGraph
}

export function getKnowledgeMarkup(topic: string): string {
  const row = getDb()
    .prepare('SELECT markup FROM knowledge_graphs WHERE topic = ?')
    .get(topic) as { markup: string } | undefined
  return row?.markup ?? ''
}

export function upsertKnowledgeGraph(topic: string, graph: KnowledgeGraph, markup: string): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO knowledge_graphs (topic, graph_data, markup, last_updated)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(topic) DO UPDATE SET
      graph_data = excluded.graph_data,
      markup = excluded.markup,
      last_updated = excluded.last_updated
  `).run(topic, JSON.stringify(graph), markup)
}

export function getAllTopics(): string[] {
  const rows = getDb().prepare('SELECT DISTINCT topic FROM interview_sessions').all() as { topic: string }[]
  return rows.map((r) => r.topic)
}

// --- Question cache queries ---

export function saveQuestions(sessionId: number, questions: { question: string; priority: number }[]): void {
  const stmt = getDb().prepare('INSERT INTO question_cache (session_id, question, priority) VALUES (?, ?, ?)')
  for (const q of questions) stmt.run(sessionId, q.question, q.priority)
}

export function getNextQuestion(sessionId: number): string | null {
  const row = getDb()
    .prepare('SELECT id, question FROM question_cache WHERE session_id = ? AND asked = 0 ORDER BY priority DESC LIMIT 1')
    .get(sessionId) as { id: number; question: string } | undefined
  if (!row) return null
  getDb().prepare('UPDATE question_cache SET asked = 1 WHERE id = ?').run(row.id)
  return row.question
}

export function countAskedQuestions(sessionId: number): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) as cnt FROM question_cache WHERE session_id = ? AND asked = 1')
    .get(sessionId) as { cnt: number }
  return row.cnt
}

// --- Report queries ---

export interface Report {
  id: number
  title: string
  type: string
  topic: string | null
  session_id: number | null
  content: string
  created_at: string
}

export function saveReport(data: {
  title: string
  type: string
  topic?: string
  session_id?: number
  content: string
}): number {
  const result = getDb()
    .prepare('INSERT INTO reports (title, type, topic, session_id, content) VALUES (?, ?, ?, ?, ?)')
    .run(data.title, data.type, data.topic ?? null, data.session_id ?? null, data.content)
  return result.lastInsertRowid as number
}

export function getAllReports(): Report[] {
  return getDb().prepare('SELECT * FROM reports ORDER BY created_at DESC').all() as Report[]
}

export function getReportById(id: number): Report | null {
  return getDb().prepare('SELECT * FROM reports WHERE id = ?').get(id) as Report | null
}
