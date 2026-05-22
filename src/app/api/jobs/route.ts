/**
 * GET  /api/jobs  — list all jobs for the current user
 * POST /api/jobs  — manually add a job
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const jobs = await prisma.job.findMany({
    where:   { userId: session.user.id },
    orderBy: { emailDate: 'desc' },
  })

  return NextResponse.json(jobs)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { company, role, status, notes } = body

  if (!company || !role) {
    return NextResponse.json({ error: 'company and role are required' }, { status: 400 })
  }

  const job = await prisma.job.create({
    data: {
      userId: session.user.id,
      company,
      role,
      status:     status ?? 'applied',
      confidence: 'high',
      notes:      notes ?? null,
    },
  })

  return NextResponse.json(job, { status: 201 })
}
