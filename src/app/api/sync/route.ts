/**
 * POST /api/sync
 * Scans the user's Gmail for job-related emails and upserts them into the database.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchJobEmails } from '@/lib/gmail'
import { classifyEmailWithAI, isJobEmail } from '@/lib/classifier'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const userId = session.user.id

  // Get the user's Google OAuth account (we need the access token)
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
  })

  if (!account?.access_token) {
    return NextResponse.json(
      { error: 'Google account not connected. Please sign in again.' },
      { status: 400 }
    )
  }

  let emailsFound = 0
  let jobsAdded   = 0
  let jobsUpdated = 0

  try {
    const emails = await fetchJobEmails(account)
    emailsFound = emails.length

    for (const email of emails) {
      // Skip emails that aren't clearly job-related
      if (!isJobEmail(email.from, email.subject, email.snippet)) continue

      const { status, confidence, company, role } = await classifyEmailWithAI({
        from: email.from,
        subject: email.subject,
        snippet: email.snippet,
      })

      // Upsert: if we've seen this email before, update status if it's a "better" one
      // Priority: offer > interview > rejected > applied > unknown
      const existing = await prisma.job.findUnique({
        where: { emailId: email.id },
      })

      if (existing) {
        const statusRank: Record<string, number> = {
          unknown: 0, applied: 1, rejected: 2, interview: 3, offer: 4,
        }
        // Only upgrade status, never downgrade
        if ((statusRank[status] ?? 0) > (statusRank[existing.status] ?? 0)) {
          await prisma.job.update({
            where: { id: existing.id },
            data: { status, confidence, updatedAt: new Date() },
          })
          jobsUpdated++
        }
      } else {
        await prisma.job.create({
          data: {
            userId,
            company,
            role,
            status,
            emailId:      email.id,
            emailDate:    email.date,
            emailFrom:    email.from,
            emailSubject: email.subject,
            snippet:      email.snippet.slice(0, 300),
            confidence,
          },
        })
        jobsAdded++
      }
    }

    // Record sync history
    await prisma.syncHistory.create({
      data: { userId, emailsFound, jobsAdded, jobsUpdated },
    })

    return NextResponse.json({ emailsFound, jobsAdded, jobsUpdated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during sync'
    console.error('[sync]', message)

    await prisma.syncHistory.create({
      data: { userId, emailsFound, jobsAdded, jobsUpdated, error: message },
    })

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
