'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Report {
  id: number
  title: string
  type: string
  topic: string | null
  created_at: string
}

interface TopicSummary {
  topic: string
  nodeCount: number
}

const REPORT_TYPES = [
  {
    value: 'assessment',
    label: 'Assessment Report',
    description: 'Evaluates each interviewee\'s knowledge level with scores and individual recommendations.',
    icon: '📊',
  },
  {
    value: 'knowledge',
    label: 'Knowledge Report',
    description: 'Documents the collective knowledge captured, organized by concept category.',
    icon: '📚',
  },
  {
    value: 'gap_analysis',
    label: 'Gap Analysis Report',
    description: 'Identifies critical knowledge gaps and provides a learning roadmap to address them.',
    icon: '🔍',
  },
]

export default function ReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({ topic: '', type: 'assessment' })
  const [preview, setPreview] = useState<{ content: string; title: string } | null>(null)
  const [error, setError] = useState('')

  const fetchReports = useCallback(async () => {
    const res = await fetch('/api/reports/list')
    if (res.status === 401) { router.push('/'); return }
    const data = await res.json()
    setReports(data.reports ?? [])
  }, [router])

  const fetchTopics = useCallback(async () => {
    const res = await fetch('/api/knowledge/graph')
    if (res.ok) {
      const data = await res.json()
      setTopics(data.topics ?? [])
      if (data.topics?.length > 0 && !form.topic) {
        setForm((f) => ({ ...f, topic: data.topics[0].topic }))
      }
    }
  }, [form.topic])

  useEffect(() => {
    fetchReports()
    fetchTopics()
  }, [fetchReports, fetchTopics])

  async function handleGenerate(format: 'markdown' | 'pdf') {
    if (!form.topic) { setError('Please select a topic'); return }
    setGenerating(true)
    setError('')
    setPreview(null)

    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: form.topic, type: form.type, format }),
    })

    if (format === 'pdf') {
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${form.type}-${form.topic.replace(/\s+/g, '-')}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        fetchReports()
      } else {
        const data = await res.json()
        setError(data.error ?? 'PDF generation failed')
      }
    } else {
      const data = await res.json()
      if (res.ok) {
        setPreview({ content: data.content, title: data.title })
        fetchReports()
      } else {
        setError(data.error ?? 'Generation failed')
      }
    }

    setGenerating(false)
  }

  async function downloadReport(id: number) {
    const res = await fetch(`/api/reports/list?download=${id}`)
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  function renderMarkdown(md: string): string {
    return md
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^---$/gm, '<hr/>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h|l|hr])/gm, '')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => router.push('/admin')} className="text-slate-500 hover:text-slate-700">
            ← Back
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-2xl">📊</span>
          <h1 className="text-lg font-bold text-slate-900">Reports</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Generate panel */}
          <div className="col-span-1 space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-semibold text-slate-900 mb-5">Generate Report</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Topic</label>
                  {topics.length > 0 ? (
                    <select
                      value={form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 bg-white"
                    >
                      {topics.map((t) => (
                        <option key={t.topic} value={t.topic}>{t.topic}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
                      No topics with data yet
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Report Type</label>
                  <div className="space-y-2">
                    {REPORT_TYPES.map((rt) => (
                      <label
                        key={rt.value}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          form.type === rt.value
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value={rt.value}
                          checked={form.type === rt.value}
                          onChange={(e) => setForm({ ...form, type: e.target.value })}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {rt.icon} {rt.label}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{rt.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleGenerate('markdown')}
                    disabled={generating || topics.length === 0}
                    className="flex-1 py-2.5 border border-brand-500 text-brand-600 font-medium rounded-lg hover:bg-brand-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleGenerate('pdf')}
                    disabled={generating || topics.length === 0}
                    className="flex-1 py-2.5 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {generating ? 'Generating...' : 'Download PDF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Previous reports */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Previous Reports</h2>
              {reports.length === 0 ? (
                <p className="text-sm text-slate-400">No reports generated yet.</p>
              ) : (
                <div className="space-y-2">
                  {reports.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-slate-800 truncate max-w-[160px]">{r.title}</div>
                        <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                      <button
                        onClick={() => downloadReport(r.id)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        PDF ↓
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preview panel */}
          <div className="col-span-2">
            {preview ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">{preview.title}</h2>
                  <button
                    onClick={() => handleGenerate('pdf')}
                    className="text-sm px-4 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                  >
                    Download PDF
                  </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(100vh-220px)]">
                  <div
                    className="report-prose"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(preview.content) }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-64 flex flex-col items-center justify-center text-slate-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm">Select a topic and report type, then click Preview or Download PDF</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
