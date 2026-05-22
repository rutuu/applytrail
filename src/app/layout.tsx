import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'ApplyTrail — Your Job Search, Organized',
  description: 'Automatically tracks your job applications from Gmail. See what you\'ve applied to, what\'s moved to interview, and what came back as a rejection — all in one place.',
  keywords: ['job search', 'job tracker', 'gmail', 'job applications', 'career'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
