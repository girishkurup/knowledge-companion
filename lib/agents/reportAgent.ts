import Anthropic from '@anthropic-ai/sdk'
import type { KnowledgeGraph, Session, Message } from '@/lib/db'
import PDFDocument from 'pdfkit'
import { getEnv } from '@/lib/config'

const getClient = () => new Anthropic({ apiKey: getEnv('ANTHROPIC_API_KEY') })

export type ReportType = 'assessment' | 'knowledge' | 'gap_analysis'

export interface ReportData {
  title: string
  markdown: string
  generatedAt: string
}

export async function generateReportMarkdown(
  type: ReportType,
  topic: string,
  sessions: Session[],
  graph: KnowledgeGraph,
  markup: string,
  allMessages: Array<{ session: Session; messages: Message[] }>
): Promise<ReportData> {
  const completedSessions = sessions.filter((s) => s.status === 'completed')
  const topConcepts = graph.nodes
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 15)
    .map((n) => `- **${n.concept}** (confidence: ${Math.round(n.confidence * 100)}%, mentioned ${n.frequency}x) — ${n.description}`)
    .join('\n')

  const gapList = graph.gaps
    .sort((a, b) => (a.importance === 'high' ? -1 : 1))
    .map((g) => `- [${g.importance.toUpperCase()}] **${g.topic}**: ${g.description}`)
    .join('\n')

  const sessionSummaries = completedSessions
    .map((s) => {
      const msgs = allMessages.find((m) => m.session.id === s.id)?.messages ?? []
      const userAnswers = msgs.filter((m) => m.role === 'user').map((m) => m.content).join('\n---\n')
      return `### ${s.name} (${s.email})\n- Depth: ${s.depth}\n- Duration: ${s.duration_minutes} min\n- Date: ${s.completed_at ?? s.created_at}\n\n**Answers excerpt:**\n${userAnswers.slice(0, 500)}...`
    })
    .join('\n\n')

  const typeInstructions: Record<ReportType, string> = {
    assessment: `Generate a comprehensive ASSESSMENT REPORT that:
1. Evaluates each interviewee's knowledge level (score 1-10 per concept area)
2. Compares knowledge across interviewees
3. Identifies top performers and areas needing improvement
4. Provides individual recommendations for each interviewee
5. Includes an overall team/group knowledge score`,

    knowledge: `Generate a comprehensive KNOWLEDGE REPORT that:
1. Documents the collective knowledge captured about the topic
2. Organizes findings by concept category
3. Highlights consensus knowledge vs. unique insights
4. Maps the knowledge graph insights into readable prose
5. Provides a knowledge baseline document for the topic`,

    gap_analysis: `Generate a comprehensive GAP ANALYSIS REPORT that:
1. Identifies critical knowledge gaps across all interviewees
2. Prioritizes gaps by business/learning impact
3. Suggests specific training or learning resources for each gap
4. Provides a learning roadmap to address the gaps
5. Estimates effort to close each gap`,
  }

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: `You are an expert Report Generation Agent. Create professional, insightful reports
from structured interview knowledge data. Use clear Markdown formatting with headers,
bullet points, and tables where appropriate.`,
    messages: [
      {
        role: 'user',
        content: `${typeInstructions[type]}

TOPIC: "${topic}"
SESSIONS COMPLETED: ${completedSessions.length} of ${sessions.length}
REPORT DATE: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

TOP CONCEPTS (from knowledge graph):
${topConcepts || 'No concepts captured yet.'}

KNOWLEDGE GAPS IDENTIFIED:
${gapList || 'No gaps identified.'}

KNOWLEDGE MARKUP:
${markup.slice(0, 2000)}

SESSION SUMMARIES:
${sessionSummaries.slice(0, 3000)}

Write the complete report in professional Markdown. Start with an Executive Summary.`,
      },
    ],
  })

  const markdown = response.content[0].type === 'text' ? response.content[0].text : '# Report\n\nNo data available.'
  const typeLabels: Record<ReportType, string> = {
    assessment: 'Assessment Report',
    knowledge: 'Knowledge Report',
    gap_analysis: 'Gap Analysis Report',
  }

  return {
    title: `${typeLabels[type]}: ${topic}`,
    markdown,
    generatedAt: new Date().toISOString(),
  }
}

export async function generatePDF(report: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Cover page
    doc.rect(0, 0, doc.page.width, 180).fill('#0369a1')
    doc.fill('#ffffff').fontSize(28).font('Helvetica-Bold').text('Knowledge Companion', 50, 60)
    doc.fontSize(18).font('Helvetica').text(report.title, 50, 100)
    doc.fontSize(11).text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, 50, 135)
    doc.fill('#000000').moveDown(6)

    // Convert markdown to styled PDF content
    const lines = report.markdown.split('\n')
    doc.fontSize(11).font('Helvetica')

    for (const line of lines) {
      if (line.startsWith('# ')) {
        doc.moveDown(0.5)
        doc.fontSize(20).font('Helvetica-Bold').fill('#0369a1').text(line.slice(2))
        doc.fontSize(11).font('Helvetica').fill('#000000')
      } else if (line.startsWith('## ')) {
        doc.moveDown(0.3)
        doc.fontSize(15).font('Helvetica-Bold').fill('#0284c7').text(line.slice(3))
        doc.fontSize(11).font('Helvetica').fill('#000000')
      } else if (line.startsWith('### ')) {
        doc.moveDown(0.2)
        doc.fontSize(12).font('Helvetica-Bold').fill('#0369a1').text(line.slice(4))
        doc.fontSize(11).font('Helvetica').fill('#000000')
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')
        doc.text(`  • ${content}`, { indent: 10 })
      } else if (line.match(/^\d+\. /)) {
        const content = line.replace(/^\d+\. /, '').replace(/\*\*(.*?)\*\*/g, '$1')
        doc.text(`  ${line.match(/^\d+/)?.[0]}. ${content}`, { indent: 10 })
      } else if (line.trim() === '') {
        doc.moveDown(0.3)
      } else if (line.trim() === '---') {
        doc.moveDown(0.5)
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#e2e8f0')
        doc.moveDown(0.5)
      } else {
        const content = line.replace(/\*\*(.*?)\*\*/g, '$1')
        doc.text(content)
      }
    }

    // Footer on each page
    const pageCount = (doc.bufferedPageRange().count || 1)
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      doc
        .fontSize(9)
        .fill('#94a3b8')
        .text(
          `Knowledge Companion · ${report.title} · Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 40,
          { align: 'center' }
        )
    }

    doc.end()
  })
}
