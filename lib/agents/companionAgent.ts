import Anthropic from '@anthropic-ai/sdk'
import type { KnowledgeGraph } from '@/lib/db'
import { getEnv } from '@/lib/config'

const getClient = () => new Anthropic({ apiKey: getEnv('ANTHROPIC_API_KEY') })

export interface CompanionContext {
  name: string
  topic: string
  depth: string
  durationMinutes: number
  timeRemainingMinutes: number
  questionsAsked: number
  knowledgeSummary: string
  nextSuggestedQuestion: string | null
  isFirstMessage: boolean
}

function buildSystemPrompt(ctx: CompanionContext): string {
  const depthGuide: Record<string, string> = {
    beginner: 'Use simple language. Focus on foundational concepts and definitions.',
    intermediate: 'Assume working knowledge. Explore practical applications and patterns.',
    advanced: 'Probe deep understanding, edge cases, trade-offs, and design decisions.',
    expert: 'Expect mastery. Discuss architecture, novel approaches, and cutting-edge nuances.',
  }

  const timeWarning =
    ctx.timeRemainingMinutes <= 2
      ? '\n⚠️ TIME CRITICAL: You MUST wrap up NOW. Ask one final closing question then sincerely thank the interviewee and end the session with a warm farewell.'
      : ctx.timeRemainingMinutes <= 5
        ? '\n⚠️ TIME LOW: Only a few minutes left. Begin steering toward a graceful conclusion.'
        : ''

  return `You are a warm, intelligent Knowledge Companion AI conducting a structured interview.

Interviewee: ${ctx.name}
Topic: "${ctx.topic}"
Depth Level: ${ctx.depth} — ${depthGuide[ctx.depth] ?? ''}
Total Duration: ${ctx.durationMinutes} minutes
Time Remaining: ${ctx.timeRemainingMinutes} minutes
Questions Asked So Far: ${ctx.questionsAsked}
${timeWarning}

INTERVIEW GUIDELINES:
- Ask ONE clear, focused question at a time — never multiple questions
- Build on previous answers naturally; show you are listening
- Vary question types: conceptual, applied, scenario-based, comparative
- Progress from foundational → applied → nuanced based on conversation flow
- If the interviewee is uncertain, offer gentle encouragement before moving on
- Keep responses concise — 1-3 sentences of acknowledgment then the next question
- Never repeat a question already asked
- Be encouraging and professional throughout

KNOWLEDGE COVERED SO FAR:
${ctx.knowledgeSummary || 'Nothing yet — this is the start of the interview.'}

${ctx.nextSuggestedQuestion ? `SUGGESTED NEXT QUESTION (you may rephrase as needed): "${ctx.nextSuggestedQuestion}"` : ''}

${ctx.isFirstMessage ? `START: Greet ${ctx.name} warmly, briefly explain the session (topic, time, format), confirm they are ready, and then ask your first question.` : ''}`
}

export async function* streamCompanionResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ctx: CompanionContext
): AsyncGenerator<string> {
  const systemPrompt = buildSystemPrompt(ctx)

  const stream = await getClient().messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: systemPrompt,
    messages,
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}

export function buildKnowledgeSummary(graph: KnowledgeGraph): string {
  if (graph.nodes.length === 0) return ''
  const topNodes = graph.nodes
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)
    .map((n) => `${n.concept} (${Math.round(n.confidence * 100)}% confident)`)
  return `Key concepts explored: ${topNodes.join(', ')}`
}
