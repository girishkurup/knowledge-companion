import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdfkit', 'nodemailer'],
  allowedDevOrigins: ['debrief-broadness-energetic.ngrok-free.dev'],
}

export default nextConfig
