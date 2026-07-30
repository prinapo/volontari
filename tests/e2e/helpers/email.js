import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '..', '..', '.env') })

const SUBJECT_KEYWORDS = ['reset password', 'password reset', 'reimposta password']
const BREVO_URL_PATTERN = /https?:\/\/r\.sender\.sostienilsostegno\.com\/tr\/cl\/[^\s"'>]+/

function getConfig() {
  return {
    host: process.env.TEST_EMAIL_IMAP_HOST,
    port: Number(process.env.TEST_EMAIL_IMAP_PORT),
    secure: true,
    auth: {
      user: process.env.TEST_EMAIL,
      pass: process.env.TEST_EMAIL_PASSWORD
    }
  }
}

async function followRedirect(url) {
  try {
    const resp = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000)
    })
    if (resp.status === 301 || resp.status === 302 || resp.status === 303 || resp.status === 307 || resp.status === 308) {
      const location = resp.headers.get('location')
      if (location && location.includes('reset-password?token=')) {
        return location
      }
    }
    return null
  } catch {
    return null
  }
}

async function fetchRecentMessages(client, count = 5) {
  const status = await client.status('INBOX', { messages: true })
  const total = status.messages
  if (!total) return []

  const lock = await client.getMailboxLock('INBOX')
  try {
    const start = Math.max(1, total - count + 1)
    const range = `${start}:${total}`
    const messages = []

    for await (const msg of client.fetch(range, { envelope: true, source: true })) {
      if (!msg.source) continue
      const parsed = await simpleParser(msg.source.toString())
      messages.push({
        uid: msg.uid,
        subject: parsed.subject || '',
        html: parsed.html || '',
        text: parsed.text || '',
        date: parsed.date || new Date(0)
      })
    }

    messages.sort((a, b) => b.date - a.date)
    return messages
  } finally {
    lock.release()
  }
}

async function extractResetLink(messages, since = new Date(0)) {
  for (const msg of messages) {
    if (msg.date < since) continue
    const subjectLower = msg.subject.toLowerCase()
    const isResetEmail = SUBJECT_KEYWORDS.some(kw => subjectLower.includes(kw))
    if (!isResetEmail) continue

    const htmlMatch = msg.html.match(BREVO_URL_PATTERN)
    const textMatch = msg.text?.match(BREVO_URL_PATTERN)
    const brevoUrl = htmlMatch?.[0] || textMatch?.[0] || null
    if (!brevoUrl) continue

    const finalUrl = await followRedirect(brevoUrl)
    if (finalUrl) return finalUrl
  }
  return null
}

export async function waitForResetLink(timeoutMs = 120000, since = new Date(0)) {
  const config = getConfig()
  const client = new ImapFlow(config)
  await client.connect()

  await new Promise(r => setTimeout(r, 35000))

  const deadline = Date.now() + timeoutMs
  try {
    while (Date.now() < deadline) {
      const messages = await fetchRecentMessages(client, 10)
      const link = await extractResetLink(messages, since)
      if (link) return link
      await new Promise(r => setTimeout(r, 15000))
    }
    throw new Error(`Password reset email not found within ${timeoutMs}ms`)
  } finally {
    await client.logout()
  }
}
