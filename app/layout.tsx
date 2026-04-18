import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Knowledge Companion',
  description: 'AI-powered knowledge interview and assessment platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50" suppressHydrationWarning>{children}</body>
    </html>
  )
}
