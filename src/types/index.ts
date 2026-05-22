export type JobStatus = 'applied' | 'interview' | 'offer' | 'rejected' | 'unknown'
export type Confidence = 'high' | 'medium' | 'low'

export interface Job {
  id: string
  userId: string
  company: string
  role: string
  status: JobStatus
  emailId?: string | null
  emailDate?: Date | string | null
  emailFrom?: string | null
  emailSubject?: string | null
  snippet?: string | null
  confidence?: Confidence | null
  notes?: string | null
  followUpSentAt?: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

// How many days after applying before we nudge the user to follow up
export const FOLLOW_UP_DAYS = 14

/**
 * Returns true if this job is overdue for a follow-up:
 * - Still in "applied" status (no interview/offer/rejection yet)
 * - Applied more than FOLLOW_UP_DAYS ago
 * - User hasn't marked it as followed up yet
 */
export function needsFollowUp(job: Job): boolean {
  if (job.status !== 'applied') return false
  if (job.followUpSentAt) return false

  const referenceDate = job.emailDate ?? job.createdAt
  if (!referenceDate) return false

  const daysSince = (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince >= FOLLOW_UP_DAYS
}

/**
 * How many days since this job was applied to (for display).
 */
export function daysSinceApplied(job: Job): number {
  const referenceDate = job.emailDate ?? job.createdAt
  if (!referenceDate) return 0
  return Math.floor((Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24))
}

export interface SyncResult {
  emailsFound: number
  jobsAdded: number
  jobsUpdated: number
  error?: string
}

export interface ClassificationResult {
  status: JobStatus
  confidence: Confidence
  company: string
  role: string
}

export const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string; border: string }> = {
  applied:   { label: 'Applied',   color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  interview: { label: 'Interview', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  offer:     { label: 'Offer',     color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  rejected:  { label: 'Rejected',  color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  unknown:   { label: 'Unknown',   color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
}

export const ALL_STATUSES: JobStatus[] = ['applied', 'interview', 'offer', 'rejected', 'unknown']
