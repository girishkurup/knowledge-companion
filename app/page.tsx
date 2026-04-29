'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DEPTH_OPTIONS = [
  { value: 'beginner', label: 'Beginner', desc: 'Core concepts and definitions' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Practical usage and patterns' },
  { value: 'advanced', label: 'Advanced', desc: 'Design trade-offs and architecture' },
  { value: 'expert', label: 'Expert', desc: 'System thinking and research frontiers' },
]

const DURATION_OPTIONS = [15, 30, 45, 60]

export default function HomePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    topic: '',
    depth: 'intermediate',
    durationMinutes: 30,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.topic.trim()) {
      setError('Please fill in your name and interview topic.')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    if (res.ok && data.sessionId) {
      router.push(`/interview/${data.sessionId}`)
    } else {
      setError(data.error ?? 'Failed to start session. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur mb-4">
            <span className="text-3xl">🧠</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Knowledge Companion</h1>
          <p className="text-brand-100 mt-2">Your AI-powered knowledge interview</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Set up your interview</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleStart} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Girish Kurup"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                required
              />
            </div>

            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Interview Topic</label>
              <input
                type="text"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g. Machine Learning, Cloud Architecture, React"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                required
              />
            </div>

            {/* Depth */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Depth Level</label>
              <div className="grid grid-cols-2 gap-2">
                {DEPTH_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setForm({ ...form, depth: d.value })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      form.depth === d.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium text-sm text-slate-900">{d.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Duration</label>
              <div className="grid grid-cols-4 gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm({ ...form, durationMinutes: d })}
                    className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                      form.durationMinutes === d
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-brand-700 to-brand-500 text-white font-bold text-base rounded-xl hover:from-brand-900 hover:to-brand-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Preparing your interview...
                </span>
              ) : (
                '🚀  Start Interview'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-brand-200 text-sm mt-6">
          The AI will conduct a structured interview and build a knowledge map from your responses.
        </p>
      </div>
    </div>
  )
}
