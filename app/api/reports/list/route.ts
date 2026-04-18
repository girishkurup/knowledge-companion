import { NextResponse } from 'next/server'
import { getAllReports, getReportById } from '@/lib/db'
import { verifyAdminToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { generatePDF } from '@/lib/agents/reportAgent'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const downloadId = searchParams.get('download')

  if (downloadId) {
    const report = getReportById(Number(downloadId))
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const pdfBuffer = await generatePDF({
      title: report.title,
      markdown: report.content,
      generatedAt: report.created_at,
    })

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${report.id}.pdf"`,
      },
    })
  }

  const reports = getAllReports()
  return NextResponse.json({ reports })
}
