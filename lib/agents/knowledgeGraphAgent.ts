import Anthropic from '@anthropic-ai/sdk'
import type { KnowledgeGraph, KnowledgeNode, KnowledgeEdge, KnowledgeGap } from '@/lib/db'
import { randomUUID } from 'crypto'
import { getEnv } from '@/lib/config'

const getClient = () => new Anthropic({ apiKey: getEnv('ANTHROPIC_API_KEY') })

export async function updateKnowledgeGraph(
  currentGraph: KnowledgeGraph,
  currentMarkup: string,
  exchange: { question: string; answer: string },
  topic: string,
  sessionId: number
): Promise<{ graph: KnowledgeGraph; markup: string }> {
  const graphSummary =
    currentGraph.nodes.length > 0
      ? JSON.stringify({ nodes: currentGraph.nodes.slice(0, 20), gaps: currentGraph.gaps })
      : 'empty'

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: `You are a Knowledge Graph Agent. Analyze a Q&A exchange and extract structured knowledge.
Return ONLY valid JSON — no markdown, no explanation.`,
    messages: [
      {
        role: 'user',
        content: `Topic: "${topic}"
Session ID: ${sessionId}

LATEST EXCHANGE:
Q: ${exchange.question}
A: ${exchange.answer}

CURRENT GRAPH (summary):
${graphSummary}

Extract knowledge and return JSON in this exact shape:
{
  "newNodes": [
    {
      "concept": "concept name (concise)",
      "description": "what was revealed about this concept",
      "confidence": 0.8,
      "category": "category label",
      "frequency": 1
    }
  ],
  "newEdges": [
    {
      "fromConcept": "concept A",
      "toConcept": "concept B",
      "relationship": "relationship label",
      "strength": 0.7
    }
  ],
  "gaps": [
    {
      "topic": "gap name",
      "description": "what is not known or unclear",
      "importance": "high|medium|low"
    }
  ],
  "markupAddition": "A 1-2 sentence markdown summary of what was learned in this exchange."
}

RULES:
- confidence 0-1: how clearly the interviewee understands this concept
- If a concept from existing graph is reinforced, include it in newNodes with updated confidence
- Only add gaps that are genuinely missing from the answer (not already in the graph)
- Keep concept names short (2-4 words max)`,
      },
    ],
  })

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

    // Strip potential markdown code fences
    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    const data = JSON.parse(cleaned) as {
      newNodes: Array<{
        concept: string
        description: string
        confidence: number
        category: string
        frequency: number
      }>
      newEdges: Array<{
        fromConcept: string
        toConcept: string
        relationship: string
        strength: number
      }>
      gaps: KnowledgeGap[]
      markupAddition: string
    }

    const updatedGraph = mergeIntoGraph(currentGraph, data, sessionId)
    const updatedMarkup = appendMarkup(currentMarkup, data.markupAddition, exchange.question, sessionId)

    return { graph: updatedGraph, markup: updatedMarkup }
  } catch {
    return { graph: currentGraph, markup: currentMarkup }
  }
}

function mergeIntoGraph(
  graph: KnowledgeGraph,
  data: {
    newNodes: Array<{ concept: string; description: string; confidence: number; category: string; frequency: number }>
    newEdges: Array<{ fromConcept: string; toConcept: string; relationship: string; strength: number }>
    gaps: KnowledgeGap[]
  },
  sessionId: number
): KnowledgeGraph {
  const nodes = [...graph.nodes]
  const edges = [...graph.edges]

  // Upsert nodes
  for (const n of data.newNodes) {
    const existing = nodes.find((x) => x.concept.toLowerCase() === n.concept.toLowerCase())
    if (existing) {
      existing.confidence = Math.min(1, (existing.confidence + n.confidence) / 2 + 0.05)
      existing.frequency += 1
      if (!existing.sessionIds.includes(sessionId)) existing.sessionIds.push(sessionId)
    } else {
      const node: KnowledgeNode = {
        id: randomUUID(),
        concept: n.concept,
        description: n.description,
        confidence: n.confidence,
        frequency: n.frequency,
        category: n.category,
        sessionIds: [sessionId],
      }
      nodes.push(node)
    }
  }

  // Add new edges (avoid duplicates)
  for (const e of data.newEdges) {
    const fromNode = nodes.find((n) => n.concept.toLowerCase() === e.fromConcept.toLowerCase())
    const toNode = nodes.find((n) => n.concept.toLowerCase() === e.toConcept.toLowerCase())
    if (!fromNode || !toNode) continue

    const existing = edges.find(
      (x) => x.fromId === fromNode.id && x.toId === toNode.id && x.relationship === e.relationship
    )
    if (!existing) {
      edges.push({
        id: randomUUID(),
        fromId: fromNode.id,
        toId: toNode.id,
        relationship: e.relationship,
        strength: e.strength,
      })
    }
  }

  // Merge gaps (remove resolved, add new)
  const resolvedConcepts = new Set(nodes.filter((n) => n.confidence > 0.6).map((n) => n.concept.toLowerCase()))
  const filteredGaps = graph.gaps.filter((g) => !resolvedConcepts.has(g.topic.toLowerCase()))
  const newGaps = data.gaps.filter(
    (g) =>
      !filteredGaps.some((existing) => existing.topic.toLowerCase() === g.topic.toLowerCase()) &&
      !resolvedConcepts.has(g.topic.toLowerCase())
  )

  return { nodes, edges, gaps: [...filteredGaps, ...newGaps] }
}

function appendMarkup(current: string, addition: string, question: string, sessionId: number): string {
  if (!addition) return current
  const timestamp = new Date().toISOString().split('T')[0]
  const entry = `\n### Session ${sessionId} · ${timestamp}\n**Q:** ${question}\n${addition}\n`
  return current + entry
}

export async function generateTopicMarkup(
  topic: string,
  graph: KnowledgeGraph,
  rawMarkup: string
): Promise<string> {
  if (graph.nodes.length === 0) return rawMarkup

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: `You are a Knowledge Documentation Agent. Synthesize interview knowledge into clean Markdown documentation.`,
    messages: [
      {
        role: 'user',
        content: `Topic: "${topic}"
Nodes in graph: ${graph.nodes.length}
Session entries: ${rawMarkup.slice(0, 3000)}

Write a comprehensive Markdown summary document covering:
1. Key concepts and their definitions (from the graph)
2. Common themes across sessions
3. Knowledge gaps identified
4. Confidence levels per concept area

Format as clean, readable Markdown with headers.`,
      },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : rawMarkup
}
