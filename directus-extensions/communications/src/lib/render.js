/**
 * Rendering del messaggio: sostituzione dei segnaposto e conversione del testo
 * in HTML minimale. Il corpo è testo semplice (nessun editor HTML), quindi non
 * serve sanitizzazione: sfuggiamo i caratteri speciali prima di generare l'HTML.
 */

const PLACEHOLDER = /\{(\w+)\}/g

export function renderTemplate(template, vars = {}) {
  if (template == null) return ''
  return String(template).replace(PLACEHOLDER, (match, key) => {
    const value = vars[key]
    return value == null ? '' : String(value)
  })
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function textToHtml(text) {
  return escapeHtml(text).replace(/\n/g, '<br/>')
}

export function buildHtmlBody({ body, link }) {
  const parts = [textToHtml(body)]
  if (link) {
    const safeLink = escapeHtml(link)
    parts.push(`<p><a href="${safeLink}">${safeLink}</a></p>`)
  }
  return parts.join('\n')
}
