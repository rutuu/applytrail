'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Mail, ShieldCheck, BarChart3, Download } from 'lucide-react'

export default function LandingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-lg">ApplyTrail</span>
        </div>
        <a
          href="https://github.com/rutuu/applytrail"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          View on GitHub
        </a>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="inline-block bg-brand-50 text-brand-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          Free & open source
        </span>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Your job search,<br />
          <span className="text-brand-600">finally organized.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 leading-relaxed">
          ApplyTrail connects to your Gmail and automatically finds every job application,
          interview invite, and rejection — so you always know where you stand.
        </p>
        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="inline-flex items-center gap-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-brand-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" opacity=".8"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".8"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity=".8"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity=".8"/>
          </svg>
          Connect Gmail — it&apos;s free
        </button>
        <p className="text-sm text-gray-400 mt-4">
          Read-only access. Your emails never leave your device.
        </p>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6 text-brand-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">1. Connect securely</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Sign in with Google. ApplyTrail only asks for permission to <strong>read</strong> emails —
              it can never send, delete, or change anything.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">2. We scan &amp; sort</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              ApplyTrail scans your inbox for job-related emails and automatically
              sorts them into Applied, Interview, Offer, and Rejected.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">3. See the full picture</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Your dashboard shows every application at a glance. Export to CSV
              anytime to use in a spreadsheet.
            </p>
          </div>
        </div>
      </section>

      {/* Security callout */}
      <section className="bg-gray-50 border-t border-gray-100 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <ShieldCheck className="w-10 h-10 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your data stays private</h2>
          <p className="text-gray-500 leading-relaxed max-w-xl mx-auto">
            ApplyTrail stores your job data in a local database on your own computer — not on any cloud server.
            We never read the content of your emails, only the subject lines and sender names.
            You can delete everything and revoke access at any time.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>ApplyTrail is open source. Built for job seekers, by job seekers.</p>
      </footer>
    </main>
  )
}
