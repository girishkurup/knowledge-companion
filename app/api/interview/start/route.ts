import { NextResponse } from 'next/server'
import {
  getSessionById,
  getMessages,
  updateSessionStatus,
  saveQuestions,
  getKnowledgeGraph,
} from '@/lib/db'
import { verifyInterviewToken } from '@/lib/auth'
import { generateInitialQuestions } from '@/lib/agents/questionBankAgent'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const payload = verifyInterviewToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })

  const session = getSessionById(payload.sessionId)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  if (session.status === 'completed') {
    return NextResponse.json({ error: 'This interview has already been completed.', status: 'completed' }, { status: 410 })
  }

  if (session.status === 'expired') {
    return NextResponse.json({ error: 'This interview link has expired.', status: 'expired' }, { status: 410 })
  }

  // Activate session if pending
  if (session.status === 'pending') {
    updateSessionStatus(session.id, 'active', { started_at: new Date().toISOString() })
  }

  // Generate initial questions if this is a fresh session
  const messages = getMessages(session.id)
  const isNewSession = messages.length === 0

  if (isNewSession) {
    try {
      const questions = await generateInitialQuestions(session.topic, session.depth, session.duration_minutes)
      saveQuestions(session.id, questions)
    } catch (err) {
      console.error('Failed to generate initial questions:', err)
    }
  }

  const graph = getKnowledgeGraph(session.topic)

  return NextResponse.json({
    session: {
      id: session.id,
      name: session.name,
      topic: session.topic,
      depth: session.depth,
      durationMinutes: session.duration_minutes,
      startedAt: session.started_at,
      status: session.status === 'pending' ? 'active' : session.status,
    },
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    graphNodeCount: graph.nodes.length,
    isNewSession,
  })
}
