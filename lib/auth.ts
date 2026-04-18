import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

export interface InterviewTokenPayload {
  sessionId: number
  email: string
}

export function signInterviewToken(payload: InterviewTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyInterviewToken(token: string): InterviewTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as InterviewTokenPayload
  } catch {
    return null
  }
}

export function signAdminToken(email: string): string {
  return jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyAdminToken(token: string): { email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { email: string; role: string }
  } catch {
    return null
  }
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  return (
    email === (process.env.ADMIN_EMAIL ?? 'admin@example.com') &&
    password === (process.env.ADMIN_PASSWORD ?? 'admin123')
  )
}
