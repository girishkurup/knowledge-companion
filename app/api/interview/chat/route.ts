import {
  getSessionById,
  getMessages,
  addMessage,
  updateSessionStatus,
  getNextQuestion,
  countAskedQuestions,
  getKnowledgeGraph,
  getKnowledgeMarkup,
  upsertKnowledgeGraph,
  saveQuestions,
} from '@/lib/db'
import { streamCompanionResponse, buildKnowledgeSummary, type CompanionContext } from '@/lib/agents/companionAgent'
import { updateKnowledgeGraph } from '@/lib/agents/knowledgeGraphAgent'
import { generateGapQuestions } from '@/lib/agents/questionBankAgent'

export async function POST(request: Request) {
  try {
    const { sessionId, userMessage } = await request.json() as { sessionId: number; userMessage: string }

    if (!sessionId || !userMessage?.trim()) {
      return new Response(JSON.stringify({ error: 'sessionId and message required' }), { status: 400 })
    }

    const session = getSessionById(Number(sessionId))
    if (!session || session.status === 'completed' || session.status === 'expired') {
      return new Response(JSON.stringify({ error: 'Session unavailable' }), { status: 410 })
    }

    // Calculate time remaining
    const startedAt = session.started_at ? new Date(session.started_at) : new Date()
    const elapsedMinutes = (Date.now() - startedAt.getTime()) / 60000
    const timeRemainingMinutes = Math.max(0, session.duration_minutes - elapsedMinutes)

    // Auto-complete if time is up
    if (timeRemainingMinutes <= 0) {
      updateSessionStatus(session.id, 'completed', { completed_at: new Date().toISOString() })
      return new Response(JSON.stringify({ error: 'Time expired', status: 'completed' }), { status: 410 })
    }

    // Persist user message
    addMessage(session.id, 'user', userMessage)

    const messages = getMessages(session.id)
    const questionsAsked = countAskedQuestions(session.id)
    const graph = getKnowledgeGraph(session.topic)
    const markup = getKnowledgeMarkup(session.topic)
    const nextQuestion = getNextQuestion(session.id)

    const ctx: CompanionContext = {
      name: session.name,
      topic: session.topic,
      depth: session.depth,
      durationMinutes: session.duration_minutes,
      timeRemainingMinutes: Math.round(timeRemainingMinutes),
      questionsAsked,
      knowledgeSummary: buildKnowledgeSummary(graph),
      nextSuggestedQuestion: nextQuestion,
      isFirstMessage: messages.filter((m) => m.role === 'user').length === 1,
    }

    // Collect full response while streaming
    let fullResponse = ''

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          const conversationMessages = messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

          for await (const chunk of streamCompanionResponse(conversationMessages, ctx)) {
            fullResponse += chunk
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
          }

          // Persist assistant response
          addMessage(session.id, 'assistant', fullResponse)

          // Check if session should be completed
          if (timeRemainingMinutes <= 1) {
            updateSessionStatus(session.id, 'completed', { completed_at: new Date().toISOString() })
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionComplete: true })}\n\n`))
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

          // Background: update knowledge graph using the CURRENT exchange (userMessage + fullResponse)
          // Skip the very first greeting (isFirstMessage) since it's just a hello, not knowledge
          const userMessageCount = messages.filter((m) => m.role === 'user').length
          if (!ctx.isFirstMessage && fullResponse && userMessage) {
            void (async () => {
              try {
                const latestGraph = getKnowledgeGraph(session.topic)
                const latestMarkup = getKnowledgeMarkup(session.topic)
                const { graph: updatedGraph, markup: updatedMarkup } = await updateKnowledgeGraph(
                  latestGraph,
                  latestMarkup,
                  { question: fullResponse, answer: userMessage },
                  session.topic,
                  session.id
                )
                upsertKnowledgeGraph(session.topic, updatedGraph, updatedMarkup)
                console.log(`[KG] Updated graph for "${session.topic}": ${updatedGraph.nodes.length} nodes, ${updatedGraph.gaps.length} gaps`)

                // Refresh question queue every 5 messages
                if (userMessageCount % 5 === 0) {
                  const existingQs = messages.filter((m) => m.role === 'assistant').map((m) => m.content)
                  const newQs = await generateGapQuestions(
                    session.topic,
                    session.depth,
                    updatedGraph,
                    updatedMarkup,
                    existingQs
                  )
                  if (newQs.length > 0) {
                    saveQuestions(session.id, newQs)
                    console.log(`[QB] Added ${newQs.length} gap questions for "${session.topic}"`)
                  }
                }
              } catch (err) {
                console.error('Background graph update failed:', err)
              }
            })()
          }
        } catch (err) {
          console.error('Stream error:', err)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('Chat route error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
