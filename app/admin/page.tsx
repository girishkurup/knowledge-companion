'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Session {
  id: number
  email: string
  name: string
  topic: string
  depth: string
  duration_minutes: number
  status: string
  created_at: string
  started_at: string | null
  completed_at: string | null
}

interface TopicSummary {
  topic: string
  nodeCount: number
  edgeCount: number
  gapCount: number
  topConcepts: string[]
}

const DEPTH_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-purple-100 text-purple-700',
  expert: 'bg-red-100 text-red-700',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  expired: 'bg-slate-100 text-slate-600',
}

export default function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<'sessions' | 'graph' | 'register'>('sessions')
  const [sessions, setSessions] = useState<Session[]>([])
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [graphData, setGraphData] = useState<{ nodes: Array<{ concept: string; confidence: number; category: string; frequency: number }>; gaps: Array<{ topic: string; description: string; importance: string }> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Register form state
  const [form, setForm] = useState({
    name: '', email: '', topic: '', depth: 'intermediate', durationMinutes: 30
  })
  const [registering, setRegistering] = useState(false)
  const [registerResult, setRegisterResult] = useState<{ link?: string; emailSent?: boolean; error?: string } | null>(null)

  const fetchSessions = useCallback(async () => {
    const res = await fetch('/api/admin/sessions')
    if (res.status === 401) { router.push('/'); return }
    const data = await res.json()
    setSessions(data.sessions ?? [])
    setLoading(false)
  }, [router])

  const fetchTopics = useCallback(async () => {
    const res = await fetch('/api/knowledge/graph')
    if (res.ok) {
      const data = await res.json()
      setTopics(data.topics ?? [])
    }
  }, [])

  useEffect(() => {
    fetchSessions()
    fetchTopics()
  }, [fetchSessions, fetchTopics])

  async function fetchGraphForTopic(topic: string) {
    setSelectedTopic(topic)
    const res = await fetch(`/api/knowledge/graph?topic=${encodeURIComponent(topic)}`)
    if (res.ok) {
      const data = await res.json()
      setGraphData(data.graph)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegistering(true)
    setRegisterResult(null)

    const res = await fetch('/api/admin/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, durationMinutes: Number(form.durationMinutes) }),
    })
    const data = await res.json()

    if (res.ok) {
      setRegisterResult({ link: data.interviewLink, emailSent: data.emailSent })
      setForm({ name: '', email: '', topic: '', depth: 'intermediate', durationMinutes: 30 })
      fetchSessions()
      fetchTopics()
    } else {
      setRegisterResult({ error: data.error })
    }
    setRegistering(false)
  }

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/')
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link)
    setCopiedLink(link)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const stats = {
    total: sessions.length,
    pending: sessions.filter((s) => s.status === 'pending').length,
    active: sessions.filter((s) => s.status === 'active').length,
    completed: sessions.filter((s) => s.status === 'completed').length,
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <h1 className="text-lg font-bold text-slate-900">Knowledge Companion</h1>
            <span className="text-slate-400">·</span>
            <span className="text-sm text-slate-500">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin/reports" className="text-sm text-brand-600 hover:text-brand-700 font-medium">Reports</a>
            <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-700">Sign out</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Sessions', value: stats.total, color: 'text-slate-900' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
            { label: 'Active', value: stats.active, color: 'text-blue-600' },
            { label: 'Completed', value: stats.completed, color: 'text-green-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
          {(['sessions', 'register', 'graph'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all capitalize ${
                tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'graph' ? 'Knowledge Graph' : t === 'register' ? 'Register Person' : 'Sessions'}
            </button>
          ))}
        </div>

        {/* Sessions Tab */}
        {tab === 'sessions' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Interview Sessions</h2>
            </div>
            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                No sessions yet. Register someone to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Name', 'Email', 'Topic', 'Depth', 'Duration', 'Status', 'Created', 'Link'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{s.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{s.email}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 max-w-[180px] truncate">{s.topic}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${DEPTH_COLORS[s.depth] ?? ''}`}>
                            {s.depth}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{s.duration_minutes}m</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[s.status] ?? ''}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {s.status === 'pending' && (
                            <button
                              onClick={() => copyLink(`${window.location.origin}/interview/${s.id}`)}
                              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                            >
                              {copiedLink ? '✓ Copied' : 'Copy link'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Register Tab */}
        {tab === 'register' && (
          <div className="max-w-xl">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-semibold text-slate-900 mb-5">Register New Interviewee</h2>

              {registerResult?.link && (
                <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium text-sm mb-2">
                    ✓ Registered successfully! {registerResult.emailSent ? 'Email sent.' : 'Email failed — use link below.'}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={registerResult.link}
                      className="flex-1 text-xs border border-green-200 rounded px-3 py-1.5 bg-white font-mono text-slate-600"
                    />
                    <button
                      onClick={() => copyLink(registerResult.link!)}
                      className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      {copiedLink === registerResult.link ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {registerResult?.error && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {registerResult.error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Topic / Subject Area</label>
                  <input
                    type="text"
                    required
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                    placeholder="e.g. React.js, Machine Learning, AWS Architecture"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Depth Level</label>
                    <select
                      value={form.depth}
                      onChange={(e) => setForm({ ...form, depth: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 bg-white"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration (minutes)</label>
                    <input
                      type="number"
                      required
                      min={5}
                      max={120}
                      value={form.durationMinutes}
                      onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={registering}
                  className="w-full py-3 bg-gradient-to-r from-brand-700 to-brand-500 text-white font-semibold rounded-lg hover:from-brand-900 hover:to-brand-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                >
                  {registering ? 'Registering & sending email...' : 'Register & Send Invitation'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Knowledge Graph Tab */}
        {tab === 'graph' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {topics.length === 0 ? (
                <div className="col-span-3 bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                  No interview data yet. Complete some sessions to see the knowledge graph.
                </div>
              ) : (
                topics.map((t) => (
                  <button
                    key={t.topic}
                    onClick={() => fetchGraphForTopic(t.topic)}
                    className={`text-left bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all ${
                      selectedTopic === t.topic ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200'
                    }`}
                  >
                    <h3 className="font-semibold text-slate-900 mb-3 truncate">{t.topic}</h3>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Concepts mapped</span>
                        <span className="font-medium text-slate-900">{t.nodeCount}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Relationships</span>
                        <span className="font-medium text-slate-900">{t.edgeCount}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Gaps identified</span>
                        <span className={`font-medium ${t.gapCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {t.gapCount}
                        </span>
                      </div>
                    </div>
                    {t.topConcepts.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {t.topConcepts.map((c) => (
                          <span key={c} className="text-xs px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {graphData && selectedTopic && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">Knowledge Graph: {selectedTopic}</h2>
                  <span className="text-sm text-slate-500">{graphData.nodes?.length ?? 0} concepts</span>
                </div>
                <div className="p-6">
                  {graphData.nodes && graphData.nodes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-6">
                      {/* Concept cards */}
                      <div>
                        <h3 className="text-sm font-medium text-slate-700 mb-3">Concepts by Confidence</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {[...graphData.nodes]
                            .sort((a, b) => b.confidence - a.confidence)
                            .map((node, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-brand-700">
                                    {Math.round(node.confidence * 100)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-slate-900 truncate">{node.concept}</div>
                                  <div className="text-xs text-slate-500">{node.category} · {node.frequency}× mentioned</div>
                                </div>
                                <div className="w-16 bg-slate-200 rounded-full h-1.5 flex-shrink-0">
                                  <div
                                    className="bg-brand-500 h-1.5 rounded-full"
                                    style={{ width: `${node.confidence * 100}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Gaps */}
                      <div>
                        <h3 className="text-sm font-medium text-slate-700 mb-3">Knowledge Gaps</h3>
                        {graphData.gaps && graphData.gaps.length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {graphData.gaps.map((gap, i) => (
                              <div key={i} className="p-3 border border-slate-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    gap.importance === 'high' ? 'bg-red-100 text-red-700' :
                                    gap.importance === 'medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {gap.importance}
                                  </span>
                                  <span className="text-sm font-medium text-slate-900">{gap.topic}</span>
                                </div>
                                <p className="text-xs text-slate-500">{gap.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg">
                            No gaps identified yet
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-slate-400">
                      No knowledge graph data yet for this topic.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
