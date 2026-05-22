'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Download, Plus, Mail, LogOut, AlertCircle, CheckCircle } from 'lucide-react'
import { StatsBar } from '@/components/StatsBar'
import { JobBoard, type JobBoardHandle } from '@/components/JobBoard'
import { AddJobModal } from '@/components/AddJobModal'
import type { Job, JobStatus } from '@/types'

type SyncState = 'idle' | 'syncing' | 'done' | 'error'

interface SyncResult {
  emailsFound?: number
  jobsAdded?: number
  jobsUpdated?: number
  error?: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [jobs, setJobs]             = useState<Job[]>([])
  const [loading, setLoading]       = useState(true)
  const [syncState, setSyncState]   = useState<SyncState>('idle')
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [showAdd, setShowAdd]       = useState(false)
  const jobBoardRef                 = useRef<JobBoardHandle>(null)
  const hasSilentSynced             = useRef(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  useEffect(() => {
    if (session) {
      loadJobs().then(() => {
        // Silently sync in the background when the dashboard first opens
        if (!hasSilentSynced.current) {
          hasSilentSynced.current = true
          fetch('/api/sync', { method: 'POST' })
            .then(res => { if (res.ok) refreshJobs() })
            .catch(() => {})
        }
      })
    }
  }, [session])

  async function loadJobs() {
    setLoading(true)
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      setJobs(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  // Quietly refreshes job list without showing the loading spinner
  async function refreshJobs() {
    try {
      const res = await fetch('/api/jobs')
      const data = await res.json()
      setJobs(Array.isArray(data) ? data : [])
    } catch {
      // fail silently
    }
  }

  async function handleSync() {
    setSyncState('syncing')
    setSyncResult(null)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setSyncState('error')
        setSyncResult({ error: data.error })
        return
      }

      setSyncState('done')
      setSyncResult(data)
      await loadJobs()

      // Reset status message after 5s
      setTimeout(() => setSyncState('idle'), 5000)
    } catch {
      setSyncState('error')
      setSyncResult({ error: 'Could not connect. Please try again.' })
    }
  }

  async function handleStatusChange(id: string, status: JobStatus) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j))
    await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this application from your tracker?')) return
    setJobs(prev => prev.filter(j => j.id !== id))
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
  }

  async function handleNotesChange(id: string, notes: string) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, notes } : j))
    await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
  }

  async function handleFollowUpSent(id: string) {
    const now = new Date().toISOString()
    setJobs(prev => prev.map(j => j.id === id ? { ...j, followUpSentAt: now } : j))
    await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followUpSentAt: now }),
    })
  }

  async function handleFollowUpCleared(id: string) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, followUpSentAt: null } : j))
    await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followUpSentAt: null }),
    })
  }

  function handleExport() {
    window.open('/api/export', '_blank')
  }

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your applications…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Mail className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">ApplyTrail</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync status feedback */}
            {syncState === 'done' && syncResult && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                {syncResult.jobsAdded
                  ? `+${syncResult.jobsAdded} new, ${syncResult.jobsUpdated} updated`
                  : 'Already up to date'}
              </span>
            )}
            {syncState === 'error' && (
              <span className="flex items-center gap-1.5 text-sm text-red-500">
                <AlertCircle className="w-4 h-4" />
                {syncResult?.error ?? 'Sync failed'}
              </span>
            )}

            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-sm border border-gray-300 hover:border-gray-400 text-gray-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-sm border border-gray-300 hover:border-gray-400 text-gray-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>

            <div className="flex flex-col items-end">
              <button
                onClick={handleSync}
                disabled={syncState === 'syncing'}
                className="flex items-center gap-1.5 text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
                {syncState === 'syncing' ? 'Scanning…' : 'Sync Gmail'}
              </button>
              <span className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">
                Uses minimal Claude credits if AI key is set
              </span>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              title="Sign out"
              className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome + first-run hint */}
        {jobs.length === 0 && !loading && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-6 text-center">
            <Mail className="w-10 h-10 text-brand-400 mx-auto mb-3" />
            <h2 className="font-semibold text-brand-900 text-lg mb-1">
              Welcome, {session?.user?.name?.split(' ')[0]}!
            </h2>
            <p className="text-brand-700 text-sm mb-4">
              Click <strong>Sync Gmail</strong> to scan your inbox and automatically find your job applications.
            </p>
            <button
              onClick={handleSync}
              disabled={syncState === 'syncing'}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
              {syncState === 'syncing' ? 'Scanning your inbox…' : 'Sync Gmail now'}
            </button>
          </div>
        )}

        {/* Stats */}
        {jobs.length > 0 && (
          <StatsBar
            jobs={jobs}
            onFollowUpTabClick={() => jobBoardRef.current?.openFollowUpTab()}
          />
        )}

        {/* Board */}
        <JobBoard
          ref={jobBoardRef}
          jobs={jobs}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onNotesChange={handleNotesChange}
          onFollowUpSent={handleFollowUpSent}
          onFollowUpCleared={handleFollowUpCleared}
        />
      </main>

      {/* Add job modal */}
      {showAdd && (
        <AddJobModal
          onClose={() => setShowAdd(false)}
          onAdd={job => setJobs(prev => [job, ...prev])}
        />
      )}
    </div>
  )
}
