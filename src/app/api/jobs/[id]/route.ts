/**
 * PATCH  /api/jobs/[id] — update status or notes
 * DELETE /api/jobs/[id] — remove a job
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const job = await prisma.job.findUnique({ where: { id: params.id } })
  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { status, notes, company, role, followUpSentAt } = body

  const updated = await prisma.job.update({
    where: { id: params.id },
    data: {
      ...(status          !== undefined && { status }),
      ...(notes           !== undefined && { notes }),
      ...(company         !== undefined && { company }),
      ...(role            !== undefined && { role }),
      // followUpSentAt: pass new Date() to mark as followed up, null to clear
      ...(followUpSentAt  !== undefined && {
        followUpSentAt: followUpSentAt ? new Date(followUpSentAt) : null,
      }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const job = await prisma.job.findUnique({ where: { id: params.id } })
  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.job.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
