/**
 * ApplyTrail — Gmail API Client
 *
 * Handles authenticated Gmail API calls using the user's OAuth token.
 * Only requests read-only access — we never modify, send, or delete emails.
 */

import { google } from 'googleapis'
import type { Account } from '@prisma/client'

// How far back to scan for job emails (in days)
const SCAN_DAYS = 180

// Gmail search query to find job-related emails
const JOB_SEARCH_QUERY = [
  // Application confirmations & rejections
  'subject:(application OR "thank you for applying" OR "your application" OR interview OR offer)',
  // Sent from known ATS/recruiting platforms
  'from:(greenhouse.io OR lever.co OR workday.com OR icims.com OR smartrecruiters.com OR ashbyhq.com OR jobvite.com OR bamboohr.com OR taleo.net OR dover.com)',
  // Common recruiting email patterns
  'from:(recruiting OR careers OR talent OR "no-reply" OR noreply)',
].join(' OR ')

export interface GmailMessage {
  id: string
  from: string
  subject: string
  snippet: string
  date: Date
}

function buildAuthClient(accessToken: string, refreshToken: string | null) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  )

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? undefined,
  })

  return auth
}

function extractHeader(headers: Array<{ name?: string | null; value?: string | null }>, name: string): string {
  return headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export async function fetchJobEmails(account: Account): Promise<GmailMessage[]> {
  if (!account.access_token) {
    throw new Error('No access token available. Please reconnect your Google account.')
  }

  const auth = buildAuthClient(account.access_token, account.refresh_token)
  const gmail = google.gmail({ version: 'v1', auth })

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - SCAN_DAYS)
  const afterDate = Math.floor(cutoff.getTime() / 1000)

  // Search Gmail for job-related emails
  const searchResponse = await gmail.users.messages.list({
    userId: 'me',
    q: `(${JOB_SEARCH_QUERY}) after:${afterDate}`,
    maxResults: 500,
  })

  const messageRefs = searchResponse.data.messages ?? []
  if (messageRefs.length === 0) return []

  // Fetch message details in parallel (batched to avoid rate limits)
  const BATCH_SIZE = 20
  const messages: GmailMessage[] = []

  for (let i = 0; i < messageRefs.length; i += BATCH_SIZE) {
    const batch = messageRefs.slice(i, i + BATCH_SIZE)

    const details = await Promise.allSettled(
      batch.map(ref =>
        gmail.users.messages.get({
          userId: 'me',
          id: ref.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        })
      )
    )

    for (const result of details) {
      if (result.status !== 'fulfilled') continue
      const msg = result.value.data
      if (!msg.id) continue

      const headers = msg.payload?.headers ?? []
      const from    = extractHeader(headers, 'from')
      const subject = extractHeader(headers, 'subject')
      const dateStr = extractHeader(headers, 'date')
      const snippet = msg.snippet ?? ''

      const date = dateStr ? new Date(dateStr) : new Date()

      messages.push({ id: msg.id, from, subject, snippet, date })
    }
  }

  return messages
}
