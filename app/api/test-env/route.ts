import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/config'

export async function GET() {
  const key = getEnv('ANTHROPIC_API_KEY')
  return NextResponse.json({
    processEnv: process.env.ANTHROPIC_API_KEY ? 'SET' : 'EMPTY',
    configKey: key ? `SET (${key.slice(0, 20)}...)` : 'MISSING',
  })
}
