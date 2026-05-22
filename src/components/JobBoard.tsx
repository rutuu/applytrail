'use client'

import { useState, forwardRef, useImperativeHandle } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Trash2, Edit2, Check, X, ChevronDown, ChevronUp, Bell, BellOff, Clock } from 'lucide-react'
import type { Job, JobStatus } from '@/types'
import { STATUS_CONFIG, ALL_STATUSES, needsFollowUp, daysSinceApplied, FOLLOW_UP_DAYS } from '@/types'
import clsx from 'clsx'

interface JobBoardProps {
  jobs: Job[]
  onStatusChange: (id: string, status: JobStatus) => void
  onDelete: (id: string) => void
  onNotesChange: (id: string, notes: string) => void
  onFollowUpSent: (id: string) => void
  onFollowUpCleared: (id: string) => void
}

export interface JobBoardHandle {
  openFollowUpTab: () => void
}

type FilterTab = JobStatus | 'all' | 'followup'
type ViewMode = 'board' | 'table'

export const JobBoard = forwardRef<JobBoardHandle, JobBoardProps>(function JobBoard({
  jobs,
  onStatusChange,
  onDelete,
  onNotesChange,
  onFollowUpSent,
  onFollowUpCleared,
}, ref) {
  const [view, setView]             = useState<ViewMode>('table')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [filter, setFilter]         = useState<FilterTab>('all')

  // Expose openFollowUpTab so the StatsBar tile can trigger it
  useImperativeHandle(ref, () => ({
    openFollowUpTab: () => setFilter('followup'),
  }))

  const followUpJobs  = jobs.filter(needsFollowUp)
  const followUpCount = followUpJobs.length

  const filtered = (() => {
    if (filter === 'followup') return followUpJobs
    if (filter === 'all') return jobs
    return jobs.filter(j => j.status === filter)
  })()

  const sorted = [...filtered].sort((a, b) => {
    // In follow-up tab, sort by oldest first (most overdue at top)
    if (filter === 'followup') {
      const da = a.emailDate ?? a.createdAt
      const db = b.emailDate ?? b.createdAt
      return new Date(da).getTime() - new Date(db).getTime()
    }
    const da = a.emailDate ?? a.createdAt
    const db = b.emailDate ?? b.createdAt
    return new Date(db).getTime() - new Date(da).getTime()
  })

  function startEditNotes(job: Job) {
    setEditingNotes(job.id)
    setNotesValue(job.notes ?? '')
  }

  function saveNotes(id: string) {
    onNotesChange(id, notesValue)
    setEditingNotes(null)
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setFilter('all')}
            className={clsx(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              filter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            All ({jobs.length})
          </button>

          {/* Follow Up tab — shown prominently with count badge */}
          <button
            onClick={() => setFilter('followup')}
            className={clsx(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
              filter === 'followup'
                ? 'bg-white text-amber-700 shadow-sm'
                : followUpCount > 0
                  ? 'text-amber-600 hover:text-amber-700'
                  : 'text-gray-400'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            Follow Up
            {followUpCount > 0 && (
              <span className={clsx(
                'text-xs font-semibold px-1.5 py-0.5 rounded-full',
                filter === 'followup'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-amber-500 text-white'
              )}>
                {followUpCount}
              </span>
            )}
          </button>

          {ALL_STATUSES.filter(s => s !== 'unknown').map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                filter === s
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {STATUS_CONFIG[s].label} ({jobs.filter(j => j.status === s).length})
            </button>
          ))}
        </div>

        {/* View toggle — hide in follow-up tab */}
        {filter !== 'followup' && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['table', 'board'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                  view === v
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Follow Up view ─────────────────────────────────────────── */}
      {filter === 'followup' && (
        <div>
          {sorted.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
              <BellOff className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">You&apos;re all caught up</p>
              <p className="text-sm text-gray-400 mt-1">
                No applications have been waiting more than {FOLLOW_UP_DAYS} days without a response.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <strong>{sorted.length} application{sorted.length !== 1 ? 's' : ''}</strong> {sorted.length === 1 ? 'has' : 'have'} been waiting more than {FOLLOW_UP_DAYS} days with no response.
                A short, polite follow-up email can make a real difference.
              </p>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-amber-50">
                      <th className="text-left px-4 py-3 font-medium text-amber-800">Company</th>
                      <th className="text-left px-4 py-3 font-medium text-amber-800">Role</th>
                      <th className="text-left px-4 py-3 font-medium text-amber-800">Applied</th>
                      <th className="text-left px-4 py-3 font-medium text-amber-800">Waiting</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(job => {
                      const days = daysSinceApplied(job)
                      return (
                        <tr key={job.id} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{job.company}</td>
                          <td className="px-4 py-3 text-gray-600">{job.role}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {job.emailDate
                              ? format(new Date(job.emailDate), 'MMM d, yyyy')
                              : format(new Date(job.createdAt), 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx(
                              'text-xs font-semibold px-2 py-1 rounded-full',
                              days >= 30
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            )}>
                              {days}d
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => onFollowUpSent(job.id)}
                                className="flex items-center gap-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                                title="Mark as followed up"
                              >
                                <Bell className="w-3 h-3" />
                                I reached out
                              </button>
                              <button
                                onClick={() => onDelete(job.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                After marking &quot;I reached out&quot;, the application moves back to your main tracker. The clock resets.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Table View ─────────────────────────────────────────────── */}
      {filter !== 'followup' && view === 'table' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {sorted.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-lg font-medium">No applications yet</p>
              <p className="text-sm mt-1">Click &quot;Sync Gmail&quot; to scan your inbox</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sorted.map(job => {
                  const cfg = STATUS_CONFIG[job.status as JobStatus] ?? STATUS_CONFIG.unknown
                  const isExpanded = expandedId === job.id
                  const overdue = needsFollowUp(job)

                  return (
                    <>
                      <tr
                        key={job.id}
                        className={clsx(
                          'border-b border-gray-50 transition-colors cursor-pointer',
                          overdue ? 'hover:bg-amber-50/40 bg-amber-50/20' : 'hover:bg-gray-50'
                        )}
                        onClick={() => setExpandedId(isExpanded ? null : job.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{job.company}</span>
                            {overdue && (
                              <span title="Follow-up overdue" className="text-amber-500">
                                <Clock className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{job.role}</td>
                        <td className="px-4 py-3">
                          <select
                            value={job.status}
                            onClick={e => e.stopPropagation()}
                            onChange={e => onStatusChange(job.id, e.target.value as JobStatus)}
                            className={clsx(
                              'text-xs font-medium px-2 py-1 rounded-full border cursor-pointer',
                              cfg.color, cfg.bg, cfg.border
                            )}
                          >
                            {ALL_STATUSES.map(s => (
                              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {job.emailDate
                            ? format(new Date(job.emailDate), 'MMM d, yyyy')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-gray-400" />
                              : <ChevronDown className="w-4 h-4 text-gray-400" />
                            }
                            <button
                              onClick={e => { e.stopPropagation(); onDelete(job.id) }}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr key={`${job.id}-expanded`} className="bg-gray-50 border-b border-gray-100">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="space-y-3 text-xs">
                              {job.emailSubject && (
                                <div>
                                  <span className="font-medium text-gray-500 uppercase tracking-wide">Email: </span>
                                  <span className="text-gray-700">{job.emailSubject}</span>
                                </div>
                              )}
                              {job.snippet && (
                                <div>
                                  <span className="font-medium text-gray-500 uppercase tracking-wide">Preview: </span>
                                  <span className="text-gray-500 italic">{job.snippet}</span>
                                </div>
                              )}
                              {job.followUpSentAt && (
                                <div>
                                  <span className="font-medium text-gray-500 uppercase tracking-wide">Followed up: </span>
                                  <span className="text-gray-600">
                                    {formatDistanceToNow(new Date(job.followUpSentAt), { addSuffix: true })}
                                  </span>
                                  <button
                                    onClick={() => onFollowUpCleared(job.id)}
                                    className="ml-2 text-gray-400 hover:text-gray-600 underline"
                                  >
                                    clear
                                  </button>
                                </div>
                              )}
                              {overdue && !job.followUpSentAt && (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3 text-amber-500" />
                                  <span className="text-amber-600 font-medium">
                                    {daysSinceApplied(job)} days with no response — consider following up
                                  </span>
                                  <button
                                    onClick={() => onFollowUpSent(job.id)}
                                    className="text-amber-600 hover:text-amber-700 underline font-medium"
                                  >
                                    Mark as reached out
                                  </button>
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-gray-500 uppercase tracking-wide">Notes: </span>
                                {editingNotes === job.id ? (
                                  <span className="inline-flex items-center gap-2 ml-1">
                                    <input
                                      autoFocus
                                      value={notesValue}
                                      onChange={e => setNotesValue(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && saveNotes(job.id)}
                                      className="border border-gray-300 rounded px-2 py-1 text-xs w-64"
                                      placeholder="Add a note..."
                                    />
                                    <button onClick={() => saveNotes(job.id)}>
                                      <Check className="w-3 h-3 text-green-600" />
                                    </button>
                                    <button onClick={() => setEditingNotes(null)}>
                                      <X className="w-3 h-3 text-gray-400" />
                                    </button>
                                  </span>
                                ) : (
                                  <span
                                    className="text-gray-600 ml-1 cursor-pointer hover:text-gray-900 inline-flex items-center gap-1"
                                    onClick={() => startEditNotes(job)}
                                  >
                                    {job.notes ?? <span className="text-gray-400 italic">None — click to add</span>}
                                    <Edit2 className="w-3 h-3 text-gray-300 ml-1" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Board View ──────────────────────────────────────────────── */}
      {filter !== 'followup' && view === 'board' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ALL_STATUSES.filter(s => s !== 'unknown').map(status => {
            const cfg = STATUS_CONFIG[status]
            const colJobs = sorted.filter(j => j.status === status)

            return (
              <div key={status} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className={clsx('px-4 py-3 border-b', cfg.bg, cfg.border)}>
                  <span className={clsx('font-semibold text-sm', cfg.color)}>{cfg.label}</span>
                  <span className={clsx('ml-2 text-xs', cfg.color, 'opacity-70')}>{colJobs.length}</span>
                </div>
                <div className="p-3 space-y-2 min-h-[120px]">
                  {colJobs.length === 0 && (
                    <p className="text-xs text-gray-300 text-center pt-4">None yet</p>
                  )}
                  {colJobs.map(job => {
                    const overdue = needsFollowUp(job)
                    return (
                      <div
                        key={job.id}
                        className={clsx(
                          'rounded-lg p-3 border',
                          overdue
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-gray-50 border-gray-100'
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-medium text-gray-900 text-sm">{job.company}</p>
                          {overdue && <Clock className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{job.role}</p>
                        {job.emailDate && (
                          <p className="text-xs text-gray-400 mt-1">
                            {format(new Date(job.emailDate), 'MMM d')}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

