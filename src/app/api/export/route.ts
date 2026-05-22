/**
 * GET /api/export
 * Returns all jobs as a CSV download.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function escapeCSV(val: unknown): string {
  if (val == null) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const jobs = await prisma.job.findMany({
    where:   { userId: session.user.id },
    orderBy: { emailDate: 'desc' },
  })

  const headers = ['Company', 'Role', 'Status', 'Date Applied', 'Email Subject', 'Notes', 'Confidence']
  const rows = jobs.map(j => [
    escapeCSV(j.company),
    escapeCSV(j.role),
    escapeCSV(j.status),
    escapeCSV(j.emailDate ? new Date(j.emailDate).toLocaleDateString() : ''),
    escapeCSV(j.emailSubject),
    escapeCSV(j.notes),
    escapeCSV(j.confidence),
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="applytrail-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
