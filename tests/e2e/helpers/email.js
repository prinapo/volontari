import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '..', '..', '.env') })

const SUBJECT_KEYWORDS = ['reset password', 'password reset', 'reimposta password']

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

function extractResetLink(messages, since = new Date(0)) {
  for (const msg of messages) {
    if (msg.date < since) continue
    const subjectLower = msg.subject.toLowerCase()
    const isResetEmail = SUBJECT_KEYWORDS.some(kw => subjectLower.includes(kw))
    if (!isResetEmail) continue

    const pattern = /https?:\/\/[^"'\s]+\/(?:admin\/)?(?:#\/)?reset-password\?token=[^"'\s&]+/
    const htmlMatch = msg.html.match(pattern)
    if (htmlMatch) return htmlMatch[0]
    const textMatch = msg.text?.match(pattern)
    if (textMatch) return textMatch[0]
  }
  return null
}

export async function waitForResetLink(timeoutMs = 20000, since = new Date(0)) {
  const config = getConfig()
  const client = new ImapFlow(config)
  await client.connect()

  const deadline = Date.now() + timeoutMs
  try {
    while (Date.now() < deadline) {
      const messages = await fetchRecentMessages(client, 10)
      const link = extractResetLink(messages, since)
      if (link) return link
      await new Promise(r => setTimeout(r, 2000))
    }
    throw new Error(`Password reset email not found within ${timeoutMs}ms`)
  } finally {
    await client.logout()
  }
}
