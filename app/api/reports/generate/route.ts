import { NextResponse } from 'next/server'
import {
  getAllSessions,
  getMessages,
  getKnowledgeGraph,
  getKnowledgeMarkup,
  saveReport,
  type Session,
} from '@/lib/db'
import { verifyAdminToken } from '@/lib/auth'
import { generateReportMarkdown, generatePDF, type ReportType } from '@/lib/agents/reportAgent'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { topic, type, format } = await request.json() as {
      topic: string
      type: ReportType
      format: 'pdf' | 'markdown'
    }

    if (!topic || !type) {
      return NextResponse.json({ error: 'Topic and type are required' }, { status: 400 })
    }

    const allSessions = getAllSessions().filter((s) => s.topic === topic)
    if (allSessions.length === 0) {
      return NextResponse.json({ error: 'No sessions found for this topic' }, { status: 404 })
    }

    const graph = getKnowledgeGraph(topic)
    const markup = getKnowledgeMarkup(topic)

    const allMessages = allSessions.map((s: Session) => ({
      session: s,
      messages: getMessages(s.id),
    }))

    const reportData = await generateReportMarkdown(type, topic, allSessions, graph, markup, allMessages)

    // Save to DB
    const reportId = saveReport({
      title: reportData.title,
      type,
      topic,
      content: reportData.markdown,
    })

    if (format === 'pdf') {
      const pdfBuffer = await generatePDF(reportData)
      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${type}-${topic.replace(/\s+/g, '-')}-${Date.now()}.pdf"`,
          'X-Report-Id': String(reportId),
        },
      })
    }

    return NextResponse.json({ success: true, reportId, content: reportData.markdown, title: reportData.title })
  } catch (err) {
    console.error('Report generation error:', err)
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 })
  }
}
