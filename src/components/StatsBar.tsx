'use client'

import { Clock } from 'lucide-react'
import type { Job } from '@/types'
import { STATUS_CONFIG, ALL_STATUSES, needsFollowUp } from '@/types'

interface StatsBarProps {
  jobs: Job[]
  onFollowUpTabClick?: () => void
}

export function StatsBar({ jobs, onFollowUpTabClick }: StatsBarProps) {
  const total        = jobs.length
  const followUpDue  = jobs.filter(needsFollowUp).length

  const counts = ALL_STATUSES.reduce((acc, status) => {
    acc[status] = jobs.filter(j => j.status === status).length
    return acc
  }, {} as Record<string, number>)

  const responseRate = total > 0
    ? Math.round(((counts.interview + counts.offer) / total) * 100)
    : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {/* Total */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-2xl font-bold text-gray-900">{total}</p>
        <p className="text-sm text-gray-500 mt-0.5">Total</p>
      </div>

      {/* Per-status counts */}
      {ALL_STATUSES.filter(s => s !== 'unknown').map(status => {
        const cfg = STATUS_CONFIG[status]
        return (
          <div key={status} className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
            <p className={`text-2xl font-bold ${cfg.color}`}>{counts[status] ?? 0}</p>
            <p className={`text-sm mt-0.5 ${cfg.color} opacity-80`}>{cfg.label}</p>
          </div>
        )
      })}

      {/* Follow-up due */}
      <button
        onClick={onFollowUpTabClick}
        className={`rounded-xl border p-4 text-left transition-colors ${
          followUpDue > 0
            ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 cursor-pointer'
            : 'bg-white border-gray-200 cursor-default'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <p className={`text-2xl font-bold ${followUpDue > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
            {followUpDue}
          </p>
          {followUpDue > 0 && <Clock className="w-4 h-4 text-amber-500" />}
        </div>
        <p className={`text-sm mt-0.5 ${followUpDue > 0 ? 'text-amber-700 opacity-80' : 'text-gray-400'}`}>
          Follow up
        </p>
      </button>

      {/* Response rate */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-2xl font-bold text-gray-900">{responseRate}%</p>
        <p className="text-sm text-gray-500 mt-0.5">Response rate</p>
      </div>
    </div>
  )
}
