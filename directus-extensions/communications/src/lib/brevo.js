/**
 * Invio email singola tramite la API transazionale di Brevo.
 * Una chiamata per destinatario: permette personalizzazione e log puntuale.
 */
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

export function brevoSender(env = {}) {
  return {
    email: env.BREVO_SENDER_EMAIL,
    name: env.BREVO_SENDER_NAME || undefined
  }
}

export async function sendViaBrevo({ apiKey, sender, to, subject, htmlContent, textContent }) {
  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to.email, name: to.name || undefined }],
      subject,
      htmlContent,
      textContent,
      tags: ['comunicazioni']
    })
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data?.message || `Brevo HTTP ${response.status}`)
    error.status = response.status
    throw error
  }

  return data
}
