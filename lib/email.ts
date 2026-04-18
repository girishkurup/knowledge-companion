import nodemailer from 'nodemailer'

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendInterviewInvitation(opts: {
  to: string
  name: string
  topic: string
  depth: string
  durationMinutes: number
  token: string
}): Promise<void> {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
  const link = `${appUrl}/interview/${opts.token}`

  const depthLabel: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    expert: 'Expert',
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0369a1, #0ea5e9); padding: 40px 32px; color: white; }
    .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 700; }
    .header p { margin: 0; opacity: 0.9; font-size: 14px; }
    .body { padding: 32px; }
    .body h2 { margin: 0 0 16px; font-size: 18px; color: #0f172a; }
    .body p { color: #475569; line-height: 1.6; font-size: 15px; }
    .detail-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .detail-row .label { color: #64748b; }
    .detail-row .value { color: #0f172a; font-weight: 600; }
    .cta { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #0369a1, #0ea5e9); color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px; }
    .footer { padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧠 Knowledge Companion</h1>
      <p>You have been invited for a knowledge interview session</p>
    </div>
    <div class="body">
      <h2>Hello, ${opts.name}!</h2>
      <p>You have been invited to participate in a structured knowledge interview.
      The session is powered by an AI companion that will ask you thoughtful questions
      and gather insights on the topic below.</p>

      <div class="detail-card">
        <div class="detail-row"><span class="label">Topic</span><span class="value">${opts.topic}</span></div>
        <div class="detail-row"><span class="label">Depth Level</span><span class="value">${depthLabel[opts.depth] ?? opts.depth}</span></div>
        <div class="detail-row"><span class="label">Duration</span><span class="value">${opts.durationMinutes} minutes</span></div>
      </div>

      <p>When you're ready, click the button below to begin. Make sure you have
      <strong>${opts.durationMinutes} minutes</strong> available in a quiet environment.</p>

      <div class="cta">
        <a href="${link}" class="btn">Start My Interview</a>
      </div>

      <p style="font-size:13px; color:#94a3b8;">
        Or copy this link: <a href="${link}" style="color:#0ea5e9;">${link}</a>
      </p>
      <p style="font-size:13px; color:#94a3b8;">This link is valid for 7 days.</p>
    </div>
    <div class="footer">
      Knowledge Companion · Powered by AI · This is an automated invitation
    </div>
  </div>
</body>
</html>
`

  const transporter = createTransport()
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? 'Knowledge Companion <noreply@example.com>',
    to: opts.to,
    subject: `You're invited: Knowledge Interview on "${opts.topic}"`,
    html,
  })
}
