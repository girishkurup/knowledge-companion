import { NextResponse } from 'next/server'
import { createSession } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  try {
    const { name, topic, depth, durationMinutes } = await request.json() as {
      name: string
      topic: string
      depth: string
      durationMinutes: number
    }

    if (!name?.trim() || !topic?.trim()) {
      return NextResponse.json({ error: 'Name and topic are required' }, { status: 400 })
    }

    const validDepths = ['beginner', 'intermediate', 'advanced', 'expert']
    if (!validDepths.includes(depth)) {
      return NextResponse.json({ error: 'Invalid depth level' }, { status: 400 })
    }

    const session = createSession({
      email: 'direct@knowledgecompanion.ai',
      name: name.trim(),
      topic: topic.trim(),
      depth,
      duration_minutes: Math.min(Math.max(Number(durationMinutes) || 30, 5), 120),
      token: randomUUID(),
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (err) {
    console.error('Session create error:', err)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
