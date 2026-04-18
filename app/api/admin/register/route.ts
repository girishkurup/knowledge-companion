import { NextResponse } from 'next/server'
import { createSession } from '@/lib/db'
import { signInterviewToken, verifyAdminToken } from '@/lib/auth'
import { sendInterviewInvitation } from '@/lib/email'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { email, name, topic, depth, durationMinutes } = body as {
      email: string
      name: string
      topic: string
      depth: string
      durationMinutes: number
    }

    if (!email || !name || !topic || !depth || !durationMinutes) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (!['beginner', 'intermediate', 'advanced', 'expert'].includes(depth)) {
      return NextResponse.json({ error: 'Invalid depth level' }, { status: 400 })
    }

    if (durationMinutes < 5 || durationMinutes > 120) {
      return NextResponse.json({ error: 'Duration must be between 5 and 120 minutes' }, { status: 400 })
    }

    // Create session with a unique random token (not the JWT — the JWT is signed separately)
    const sessionToken = randomUUID()
    const session = createSession({ email, name, topic, depth, duration_minutes: durationMinutes, token: sessionToken })

    // Sign a JWT that references this session
    const jwtToken = signInterviewToken({ sessionId: session.id, email })

    // Send email invitation
    let emailSent = false
    try {
      await sendInterviewInvitation({
        to: email,
        name,
        topic,
        depth,
        durationMinutes,
        token: jwtToken,
      })
      emailSent = true
    } catch (emailErr) {
      console.error('Email send failed:', emailErr)
    }

    return NextResponse.json({
      success: true,
      session,
      emailSent,
      interviewLink: `${process.env.APP_URL ?? 'http://localhost:3000'}/interview/${jwtToken}`,
    })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
