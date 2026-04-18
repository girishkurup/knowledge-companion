import fs from 'fs'
import path from 'path'

function loadEnvLocal(): Record<string, string> {
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    const content = fs.readFileSync(envPath, 'utf8')
    const result: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx < 1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      result[key] = val
    }
    return result
  } catch {
    return {}
  }
}

const _envLocal = loadEnvLocal()

export function getEnv(key: string): string {
  // process.env first (may be inlined empty by Turbopack), fallback to file
  const fromProcess = process.env[key]
  if (fromProcess) return fromProcess
  return _envLocal[key] ?? ''
}

export const ANTHROPIC_API_KEY = getEnv('ANTHROPIC_API_KEY')
