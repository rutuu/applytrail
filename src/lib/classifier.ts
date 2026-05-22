/**
 * ApplyTrail — Email Classifier
 *
 * Classifies job-related emails into statuses using rule-based pattern matching.
 * Optionally falls back to AI for ambiguous cases if an API key is configured.
 */

import type { ClassificationResult, JobStatus, Confidence } from '@/types'

// ─── Keyword patterns ────────────────────────────────────────────────────────

const PATTERNS: Record<JobStatus, RegExp[]> = {
  offer: [
    /we('d| would) like to offer/i,
    /pleased to (offer|extend an offer)/i,
    /job offer/i,
    /offer of employment/i,
    /congratulations.*offer/i,
    /offer letter/i,
    /compensation package/i,
    /we are (happy|excited|delighted) to offer/i,
  ],
  interview: [
    /interview/i,
    /schedule (a |an )?(call|meeting|chat|conversation)/i,
    /we('d| would) (like|love) to (speak|talk|meet|chat)/i,
    /next (step|round|stage)/i,
    /phone (screen|call|interview)/i,
    /video (call|interview|chat)/i,
    /virtual interview/i,
    /meet with (our|the) team/i,
    /hiring manager/i,
    /technical (screen|interview|assessment)/i,
    /moving (you )?forward/i,
    /proceed(ing)? (to|with) (the )?next/i,
    /recruiter/i,
    /you('ve| have) been selected (for|to)/i,
  ],
  rejected: [
    /unfortunately/i,
    /not (moving|advancing|proceeding) forward/i,
    /decided to (pursue|move forward with) (other|another)/i,
    /not selected/i,
    /not (a )?(good )?fit/i,
    /position has been filled/i,
    /other candidates (whose|who)/i,
    /will not be (moving|proceeding)/i,
    /after careful (consideration|review)/i,
    /we('ve| have) decided (not to|to go with)/i,
    /not (be )?able to (offer|move)/i,
    /no longer (considering|moving)/i,
    /thank you for your (interest|time).*however/is,
    /we regret/i,
    /not (be )?moving forward with your application/i,
    /decided to go in a different direction/i,
  ],
  applied: [
    /application (received|submitted|confirmed)/i,
    /thank you for (applying|your application)/i,
    /we('ve| have) received your application/i,
    /your application (for|to)/i,
    /successfully (applied|submitted)/i,
    /application (is being|has been) (reviewed|received)/i,
    /confirming (that we|your application)/i,
  ],
  unknown: [],
}

// ─── Known recruiting domains (helps with company extraction) ────────────────

const ATS_DOMAINS: Record<string, string> = {
  'greenhouse.io':    '',
  'lever.co':         '',
  'workday.com':      '',
  'myworkdayjobs.com':'',
  'icims.com':        '',
  'smartrecruiters.com': '',
  'jobvite.com':      '',
  'ashbyhq.com':      '',
  'dover.com':        '',
  'bamboohr.com':     '',
  'taleo.net':        '',
}

// ─── Company extraction ───────────────────────────────────────────────────────

/**
 * Extract company name from email sender or subject line.
 * Priority: explicit "at [Company]" in subject > "from [Company]" > email domain
 */
function extractCompany(from: string, subject: string): string {
  // Try "at [Company]" or "from [Company]" in subject
  const subjectPatterns = [
    /(?:at|@)\s+([A-Z][A-Za-z0-9\s&.,'-]{1,40}?)(?:\s*[!,.]|$)/,
    /your application (?:to|for .+ at)\s+([A-Z][A-Za-z0-9\s&.,'-]{1,40}?)(?:\s*[!,.]|$)/i,
    /from\s+([A-Z][A-Za-z0-9\s&.,'-]{1,40?}?)(?:\s+team|\s*[!,.]|$)/,
  ]

  for (const pattern of subjectPatterns) {
    const m = subject.match(pattern)
    if (m?.[1]) return m[1].trim()
  }

  // Fall back to sender name
  const namePart = from.match(/^([^<@]+)/)?.[1]?.trim()
  if (namePart && namePart.length > 1 && !namePart.toLowerCase().includes('noreply')) {
    // Strip common suffixes like "Recruiting", "Careers", "Talent"
    return namePart
      .replace(/\b(recruiting|careers|talent|hr|jobs|team)\b/gi, '')
      .trim()
  }

  // Last resort: parse domain
  const domainMatch = from.match(/@([^.>]+)/)
  if (domainMatch) {
    const domain = domainMatch[1]
    // Skip generic ATS domain labels
    if (!Object.keys(ATS_DOMAINS).some(d => from.includes(d))) {
      return domain.charAt(0).toUpperCase() + domain.slice(1)
    }
  }

  return 'Unknown Company'
}

// ─── Role extraction ──────────────────────────────────────────────────────────

function extractRole(subject: string): string {
  const patterns = [
    /(?:application for|applying for|position of|role of|opening for)\s+(.+?)(?:\s+at\s+|\s*[,!.]|$)/i,
    /(?:your application|re:|fw:)\s*[:\-–]?\s*(.+?)(?:\s+at\s+|\s*[,!.]|$)/i,
    /interview (?:for|regarding)\s+(.+?)(?:\s+at\s+|\s*[,!.]|$)/i,
  ]

  for (const pattern of patterns) {
    const m = subject.match(pattern)
    if (m?.[1]) {
      const role = m[1].trim()
      if (role.length > 2 && role.length < 80) return role
    }
  }

  return 'Unknown Role'
}

// ─── Status classification ────────────────────────────────────────────────────

function classifyStatus(subject: string, snippet: string): { status: JobStatus; confidence: Confidence } {
  const text = `${subject} ${snippet}`

  // Check in priority order: offer > interview > rejected > applied
  const priority: JobStatus[] = ['offer', 'interview', 'rejected', 'applied']

  for (const status of priority) {
    const matched = PATTERNS[status].filter(p => p.test(text))
    if (matched.length >= 2) return { status, confidence: 'high' }
    if (matched.length === 1) return { status, confidence: 'medium' }
  }

  return { status: 'unknown', confidence: 'low' }
}

// ─── AI fallback (optional — requires ANTHROPIC_API_KEY in .env.local) ────────

/**
 * Uses Claude to classify an ambiguous email.
 * Only called when rule-based confidence is "low" (unknown status).
 * Each user provides their own API key — ApplyTrail never stores or proxies keys.
 */
async function classifyWithClaude(params: {
  from: string
  subject: string
  snippet: string
}): Promise<{ status: JobStatus; confidence: Confidence } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const prompt = `You are classifying a job application email. Based only on the information below, categorize this email into exactly one of these statuses:
- "applied" — confirmation that an application was received
- "interview" — invitation to interview or schedule a call
- "offer" — a job offer is being extended
- "rejected" — application was declined or not moving forward
- "unknown" — cannot determine from this information

From: ${params.from}
Subject: ${params.subject}
Snippet: ${params.snippet}

Respond with ONLY a JSON object like: {"status": "applied", "company": "Acme Corp", "role": "Product Designer"}
No explanation, no markdown, just the JSON.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // Fast and cheap for classification
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    const text = data?.content?.[0]?.text ?? ''
    const parsed = JSON.parse(text.trim())

    const validStatuses: JobStatus[] = ['applied', 'interview', 'offer', 'rejected', 'unknown']
    const status = validStatuses.includes(parsed.status) ? parsed.status : 'unknown'

    return { status, confidence: 'medium' }
  } catch {
    // Fail silently — fall back to rule-based result
    return null
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function classifyEmail(params: {
  from: string
  subject: string
  snippet: string
}): ClassificationResult {
  const { from, subject, snippet } = params
  const { status, confidence } = classifyStatus(subject, snippet)
  const company = extractCompany(from, subject)
  const role = extractRole(subject)

  return { status, confidence, company, role }
}

/**
 * Async version with Claude fallback for low-confidence classifications.
 * Use this in the sync route for best results.
 */
export async function classifyEmailWithAI(params: {
  from: string
  subject: string
  snippet: string
}): Promise<ClassificationResult> {
  const { from, subject, snippet } = params
  const ruleResult = classifyStatus(subject, snippet)
  const company = extractCompany(from, subject)
  const role = extractRole(subject)

  // Only call Claude when we're uncertain — saves API costs
  if (ruleResult.status === 'unknown' && process.env.ANTHROPIC_API_KEY) {
    const aiResult = await classifyWithClaude({ from, subject, snippet })
    if (aiResult) {
      return { status: aiResult.status, confidence: aiResult.confidence, company, role }
    }
  }

  return { status: ruleResult.status, confidence: ruleResult.confidence, company, role }
}

/**
 * Quick filter: is this email likely job-related at all?
 *
 * Gmail's Updates tab mixes job application emails with vendor updates,
 * shipping notifications, SaaS changelogs, order confirmations, etc.
 * This filter catches the obvious non-job emails before we waste time classifying them.
 */
export function isJobEmail(from: string, subject: string, snippet: string): boolean {
  const text    = `${from} ${subject} ${snippet}`.toLowerCase()
  const subj    = subject.toLowerCase()
  const fromStr = from.toLowerCase()

  // ── Hard disqualifiers — common Updates tab noise ────────────────────────
  const vendorNoise = [
    // Job alert digests (not actual applications)
    'job alert', 'new jobs matching', 'jobs you may like',
    'recommended jobs', 'unsubscribe from job alerts',
    // Salary/market data emails
    'salary report', 'compensation report', 'market insights',
    // LinkedIn activity that isn't a real application
    'linkedin jobs', 'people are looking at your profile',
    'someone viewed your profile', 'connection request',
    'new connection', 'congratulate', 'work anniversary',
    // Vendor/SaaS update emails
    'product update', 'release notes', 'what\'s new in',
    'new feature', 'changelog', 'version ', 'v2.', 'v3.',
    // E-commerce / shipping
    'your order', 'order confirmed', 'order shipped',
    'tracking number', 'delivery update', 'out for delivery',
    'your package', 'shipped your',
    // Billing / account
    'invoice', 'receipt', 'payment received', 'subscription renewed',
    'trial expires', 'upgrade your plan',
    // Newsletter / marketing
    'unsubscribe', 'view in browser', 'weekly digest',
    'monthly newsletter', 'this week in',
  ]

  if (vendorNoise.some(s => text.includes(s))) return false

  // ── Hard disqualifiers by sender domain ──────────────────────────────────
  const vendorDomains = [
    'shopify', 'stripe', 'paypal', 'amazon', 'ups.com', 'fedex',
    'usps.com', 'dhl', 'twilio', 'sendgrid', 'mailchimp', 'hubspot',
    'salesforce', 'atlassian', 'jira', 'confluence', 'notion.so',
    'figma.com', 'slack.com', 'zoom.us', 'google.com', 'apple.com',
  ]

  if (vendorDomains.some(d => fromStr.includes(d))) return false

  // ── Must have at least one strong job signal ──────────────────────────────
  // Strong signals — these are very specific to job applications
  const strongSignals = [
    'your application', 'application received', 'application for',
    'thank you for applying', 'applied for', 'application submitted',
    'interview', 'phone screen', 'we\'d like to', 'next steps',
    'offer of employment', 'offer letter', 'job offer',
    'unfortunately', 'not moving forward', 'other candidates',
    'not selected', 'not be moving', 'decided to go',
    'hiring manager', 'recruiter', 'talent acquisition',
    'background check', 'start date', 'onboarding',
  ]

  if (strongSignals.some(s => text.includes(s))) return true

  // Weaker signals — only count if they appear in the subject line
  // (reduces false positives from unrelated emails that mention "role" or "position")
  const weakSubjectSignals = [
    'application', 'position', 'candidate', 'resume', 'cv',
    'recruiting', 'careers', 'hiring',
  ]

  if (weakSubjectSignals.some(s => subj.includes(s))) return true

  return false
}
