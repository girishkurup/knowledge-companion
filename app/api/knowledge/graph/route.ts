import { NextResponse } from 'next/server'
import { getKnowledgeGraph, getKnowledgeMarkup, getAllTopics } from '@/lib/db'

export async function GET(request: Request) {

  const { searchParams } = new URL(request.url)
  const topic = searchParams.get('topic')

  if (topic) {
    const graph = getKnowledgeGraph(topic)
    const markup = getKnowledgeMarkup(topic)
    return NextResponse.json({ topic, graph, markup })
  }

  // Return all topics with basic stats
  const topics = getAllTopics()
  const summary = topics.map((t) => {
    const g = getKnowledgeGraph(t)
    return {
      topic: t,
      nodeCount: g.nodes.length,
      edgeCount: g.edges.length,
      gapCount: g.gaps.length,
      topConcepts: g.nodes
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
        .map((n) => n.concept),
    }
  })

  return NextResponse.json({ topics: summary })
}
