import { NextResponse } from 'next/server'
import { getAllSessions } from '@/lib/db'
import { verifyAdminToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessions = getAllSessions()
  return NextResponse.json({ sessions })
}
