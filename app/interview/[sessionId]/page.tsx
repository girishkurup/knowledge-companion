'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface SessionInfo {
  id: number
  name: string
  topic: string
  depth: string
  durationMinutes: number
  startedAt: string | null
  status: string
}

type AppState = 'loading' | 'confirming' | 'chatting' | 'completed' | 'error'

export default function InterviewPage() {
  const params = useParams()
  const sessionId = params.sessionId as string

  const [appState, setAppState] = useState<AppState>('loading')
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [sessionComplete, setSessionComplete] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<Date | null>(null)
  const isSendingRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Load session
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/interview/start?sessionId=${sessionId}`)
        const data = await res.json()

        if (!res.ok) {
          setAppState(data.status === 'completed' ? 'completed' : 'error')
          setErrorMsg(data.error ?? 'Unable to load interview session.')
          return
        }

        setSession(data.session)

        if (data.messages?.length > 0) {
          setMessages(
            data.messages.map((m: { role: string; content: string }, i: number) => ({
              id: String(i),
              role: m.role,
              content: m.content,
            }))
          )
          setAppState('chatting')
          if (data.session.startedAt) {
            startedAtRef.current = new Date(data.session.startedAt)
          }
        } else {
          setAppState('confirming')
        }
      } catch {
        setAppState('error')
        setErrorMsg('Failed to connect. Please check your internet and try again.')
      }
    }

    if (sessionId) loadSession()
  }, [sessionId])

  // Timer
  useEffect(() => {
    if (appState !== 'chatting' || !session || !startedAtRef.current) return

    function tick() {
      if (!session || !startedAtRef.current) return
      const elapsed = (Date.now() - startedAtRef.current.getTime()) / 60000
      const remaining = Math.max(0, session.durationMinutes - elapsed)
      setTimeRemaining(remaining)
      if (remaining <= 0 && !sessionComplete) {
        setSessionComplete(true)
        setAppState('completed')
      }
    }

    tick()
    timerRef.current = setInterval(tick, 10000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [appState, session, sessionComplete])

  async function startInterview() {
    if (!session) return
    setAppState('chatting')
    startedAtRef.current = new Date()
    await sendToCompanion('__START__')
  }

  async function sendToCompanion(userText: string) {
    if (isSendingRef.current) return
    isSendingRef.current = true

    const isStart = userText === '__START__'

    if (!isStart) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        content: userText,
      }])
    }

    setSending(true)
    setStreaming(true)

    const assistantId = (Date.now() + 1).toString()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: Number(sessionId),
          userMessage: isStart
            ? `Hello! I'm ready to begin the interview on "${session?.topic}".`
            : userText,
        }),
      })

      if (!res.ok || !res.body) {
        setMessages((prev) => prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
            : m
        ))
        setSending(false)
        setStreaming(false)
        isSendingRef.current = false
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + parsed.text } : m
              ))
            }
            if (parsed.sessionComplete) {
              setSessionComplete(true)
              setTimeout(() => setAppState('completed'), 3000)
            }
          } catch {
            // ignore partial chunks
          }
        }
      }
    } catch (err) {
      console.error('Stream error:', err)
      setMessages((prev) => prev.map((m) =>
        m.id === assistantId
          ? { ...m, content: 'Connection interrupted. Please refresh and try again.' }
          : m
      ))
    }

    setSending(false)
    setStreaming(false)
    isSendingRef.current = false
    inputRef.current?.focus()
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending || streaming) return
    setInput('')
    await sendToCompanion(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function formatTime(minutes: number): string {
    const m = Math.floor(minutes)
    const s = Math.floor((minutes - m) * 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (appState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Preparing your session...</p>
        </div>
      </div>
    )
  }

  if (appState === 'error' || appState === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-6 text-4xl">
            {appState === 'completed' ? '🎉' : '⚠️'}
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            {appState === 'completed' ? 'Interview Complete!' : 'Session Unavailable'}
          </h1>
          <p className="text-brand-100 text-lg mb-6">{errorMsg || 'Thank you for participating!'}</p>
          {appState === 'completed' && (
            <div className="p-5 bg-white/10 backdrop-blur rounded-xl text-brand-100 text-sm">
              <p>Your knowledge has been captured and mapped.</p>
              <p className="mt-2">You may close this window.</p>
            </div>
          )}
          {appState === 'error' && (
            <a href="/" className="inline-block mt-4 px-6 py-3 bg-white text-brand-700 font-semibold rounded-xl hover:bg-brand-50 transition-all">
              ← Start a new interview
            </a>
          )}
        </div>
      </div>
    )
  }

  if (appState === 'confirming' && session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500">
        <div className="w-full max-w-lg px-6">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-8 py-6 flex items-center gap-3">
              <span className="text-3xl">🧠</span>
              <div>
                <h1 className="text-xl font-bold text-white">Knowledge Companion</h1>
                <p className="text-brand-100 text-sm">AI Interview Session</p>
              </div>
            </div>

            <div className="px-8 py-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Hello, {session.name}!</h2>
              <p className="text-slate-600 mb-6">Your AI interviewer is ready. Here&apos;s your session:</p>

              <div className="space-y-3 mb-6">
                {[
                  { icon: '📖', label: 'Topic', value: session.topic },
                  { icon: '⏱️', label: 'Duration', value: `${session.durationMinutes} minutes` },
                  { icon: '🎯', label: 'Depth', value: session.depth.charAt(0).toUpperCase() + session.depth.slice(1) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center text-xl">{item.icon}</div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wide">{item.label}</div>
                      <div className="font-semibold text-slate-900">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 mb-6">
                <strong>Before you begin:</strong> Find a quiet space. The interview starts immediately when you click below.
              </div>

              <button
                onClick={startInterview}
                className="w-full py-4 bg-gradient-to-r from-brand-700 to-brand-500 text-white font-bold text-lg rounded-xl hover:from-brand-900 hover:to-brand-700 transition-all shadow-lg"
              >
                I&apos;m Ready — Start Interview
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main chat UI
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center text-white text-xs font-bold">
            KC
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Knowledge Companion</div>
            <div className="text-xs text-slate-500">{session?.topic}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {sessionComplete && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">Complete</span>
          )}
          {timeRemaining !== null && !sessionComplete && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-medium ${
              timeRemaining <= 3 ? 'bg-red-100 text-red-700' :
              timeRemaining <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
            }`}>
              <span>⏱</span>
              <span>{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl w-full mx-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
                KC
              </div>
            )}
            <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-brand-600 text-white rounded-br-md'
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm'
            }`}>
              {msg.content || (
                <span className="flex items-center gap-1">
                  <span className="typing-dot w-1.5 h-1.5 bg-slate-400 rounded-full inline-block" />
                  <span className="typing-dot w-1.5 h-1.5 bg-slate-400 rounded-full inline-block" />
                  <span className="typing-dot w-1.5 h-1.5 bg-slate-400 rounded-full inline-block" />
                </span>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold ml-2 flex-shrink-0 mt-1">
                {session?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
          </div>
        ))}

        {sessionComplete && (
          <div className="flex justify-center">
            <div className="px-6 py-3 bg-green-50 border border-green-200 rounded-full text-sm text-green-700 font-medium">
              ✓ Interview completed — thank you!
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-slate-200 px-4 py-4 sticky bottom-0">
        <div className="max-w-3xl mx-auto">
          {sessionComplete ? (
            <div className="text-center text-slate-500 text-sm py-2">
              Session ended. <a href="/" className="text-brand-600 hover:underline">Start a new interview →</a>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending || streaming}
                rows={1}
                placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
                className="flex-1 resize-none px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 text-sm placeholder-slate-400 disabled:bg-slate-50 max-h-32"
                style={{ minHeight: '48px' }}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement
                  el.style.height = 'auto'
                  el.style.height = `${Math.min(el.scrollHeight, 128)}px`
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending || streaming}
                className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {sending || streaming ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
