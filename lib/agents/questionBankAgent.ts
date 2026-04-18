import Anthropic from '@anthropic-ai/sdk'
import type { KnowledgeGraph } from '@/lib/db'
import { getEnv } from '@/lib/config'

const getClient = () => new Anthropic({ apiKey: getEnv('ANTHROPIC_API_KEY') })

export interface GeneratedQuestion {
  question: string
  priority: number
  rationale: string
}

export async function generateInitialQuestions(
  topic: string,
  depth: string,
  durationMinutes: number
): Promise<GeneratedQuestion[]> {
  const questionCount = Math.min(Math.max(Math.floor(durationMinutes / 3), 5), 20)

  const depthDescription: Record<string, string> = {
    beginner: 'basic definitions, core concepts, and simple examples',
    intermediate: 'practical usage, patterns, common pitfalls, and real-world applications',
    advanced: 'design trade-offs, performance considerations, edge cases, and architecture decisions',
    expert: 'system-level thinking, novel approaches, research frontiers, and teaching others',
  }

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: `You are an expert Question Bank Agent. Generate a comprehensive set of interview questions
for a knowledge assessment. Questions must be varied, progressive, and designed to reveal
true depth of understanding — not just recall.

Return ONLY valid JSON. No markdown, no prose.`,
    messages: [
      {
        role: 'user',
        content: `Generate ${questionCount} interview questions for:
Topic: "${topic}"
Depth Level: ${depth} — focus on ${depthDescription[depth] ?? depth}
Duration hint: ${durationMinutes} minutes total

Return JSON in this exact shape:
{
  "questions": [
    {
      "question": "...",
      "priority": 10,
      "rationale": "why this question matters"
    }
  ]
}

Priority scale: 10 = must-ask foundational, 1 = optional deep dive.
Mix question types: conceptual, applied, scenario-based, comparative, troubleshooting.
Order from foundational (high priority) to advanced (lower priority).`,
      },
    ],
  })

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text) as { questions: GeneratedQuestion[] }
    return parsed.questions
  } catch {
    return [
      { question: `Can you give me an overview of your experience with ${topic}?`, priority: 10, rationale: 'opener' },
      { question: `What are the core principles you rely on when working with ${topic}?`, priority: 9, rationale: 'fundamentals' },
      { question: `Can you describe a challenging problem you solved using ${topic}?`, priority: 8, rationale: 'applied' },
    ]
  }
}

export async function generateGapQuestions(
  topic: string,
  depth: string,
  graph: KnowledgeGraph,
  markup: string,
  existingQuestions: string[]
): Promise<GeneratedQuestion[]> {
  const gapSummary =
    graph.gaps.length > 0
      ? graph.gaps.map((g) => `- [${g.importance}] ${g.topic}: ${g.description}`).join('\n')
      : 'No gaps identified yet.'

  const coveredConcepts =
    graph.nodes.length > 0
      ? graph.nodes.map((n) => `${n.concept} (confidence: ${Math.round(n.confidence * 100)}%)`).join(', ')
      : 'None yet.'

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: `You are a Question Bank Agent specializing in gap analysis.
Review a knowledge graph and identify the most critical missing knowledge areas.
Generate targeted questions to fill those gaps.
Return ONLY valid JSON. No markdown.`,
    messages: [
      {
        role: 'user',
        content: `Topic: "${topic}" | Depth: ${depth}

KNOWLEDGE GRAPH GAPS:
${gapSummary}

CONCEPTS ALREADY COVERED:
${coveredConcepts}

EXISTING QUESTIONS (do NOT duplicate):
${existingQuestions.slice(-10).map((q, i) => `${i + 1}. ${q}`).join('\n')}

KNOWLEDGE MARKUP SUMMARY:
${markup.slice(0, 1000)}

Generate 5 targeted gap-filling questions. Return:
{
  "questions": [
    { "question": "...", "priority": 8, "rationale": "addresses gap: ..." }
  ]
}`,
      },
    ],
  })

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text) as { questions: GeneratedQuestion[] }
    return parsed.questions
  } catch {
    return []
  }
}
