import { allowedToSend } from './lib/auth.js'
import { brevoSender, sendViaBrevo } from './lib/brevo.js'
import { createComunicazione, logRecipient, updateComunicazione } from './lib/log.js'
import { resolveRecipients } from './lib/recipients.js'
import { buildHtmlBody, renderTemplate } from './lib/render.js'

const CONCURRENCY = 5
const SAMPLE_SIZE = 25

/**
 * Esegue `worker` su tutti gli elementi con concorrenza limitata.
 * Ritorna i risultati nello stesso ordine dell'input.
 */
async function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return results
}

function publicRecipient(recipient) {
  return {
    contattoId: recipient.contattoId ?? null,
    nome: recipient.nome ?? '',
    cognome: recipient.cognome ?? '',
    email: recipient.email,
    famigliaId: recipient.famigliaId ?? null,
    famiglia: recipient.famiglia ?? ''
  }
}

function fullName(recipient) {
  return `${recipient.nome || ''} ${recipient.cognome || ''}`.trim()
}

export default {
  id: 'communications',
  handler: (router, ctx) => {
    const { env, logger } = ctx

    router.get('/ping', (req, res) => {
      res.json({ ok: true, brevo: Boolean(env.BREVO_API_KEY), sender: env.BREVO_SENDER_EMAIL || null })
    })

    router.post('/recipients', async (req, res, next) => {
      try {
        if (!allowedToSend(req, env)) {
          res.status(403).json({ error: 'Non autorizzato all invio di comunicazioni' })
          return
        }
        const { audience, filter, filterFamiglia, ruoli, contattoId, cognome } = req.body || {}
        const recipients = await resolveRecipients({
          ctx,
          audience,
          filter,
          filterFamiglia,
          ruoli,
          contattoId,
          cognome
        })
        res.json({ count: recipients.length, sample: recipients.slice(0, SAMPLE_SIZE).map(publicRecipient) })
      } catch (error) {
        logger?.error?.(error, '[communications] resolve recipients')
        next(error)
      }
    })

    router.post('/send', async (req, res, next) => {
      let comunicazioneId = null
      try {
        if (!allowedToSend(req, env)) {
          res.status(403).json({ error: 'Non autorizzato all invio di comunicazioni' })
          return
        }
        if (!env.BREVO_API_KEY) {
          res.status(500).json({ error: 'BREVO_API_KEY non configurata' })
          return
        }

        const { audience, filter, filterFamiglia, ruoli, contattoId, cognome, subject, body, link, tipo } =
          req.body || {}
        if (!subject || !body) {
          res.status(400).json({ error: 'Oggetto e corpo sono obbligatori' })
          return
        }

        const recipients = await resolveRecipients({
          ctx,
          audience,
          filter,
          filterFamiglia,
          ruoli,
          contattoId,
          cognome
        })
        const sender = brevoSender(env)

        comunicazioneId = await createComunicazione(ctx, {
          Oggetto: subject,
          Corpo: body,
          DataInvio: new Date().toISOString(),
          Mittente: req.accountability?.user || null,
          Tipo: tipo || audience || 'contatti',
          Filtri: { audience, filter, filterFamiglia, ruoli, contattoId, cognome },
          LinkAllegato: link || null,
          NInviati: 0,
          NFalliti: 0,
          Stato: 'in_invio'
        })

        let inviati = 0
        let falliti = 0
        const errori = []

        await mapConcurrent(recipients, CONCURRENCY, async recipient => {
          const vars = {
            nome: recipient.nome,
            cognome: recipient.cognome,
            famiglia: recipient.famiglia,
            email: recipient.email
          }
          try {
            const result = await sendViaBrevo({
              apiKey: env.BREVO_API_KEY,
              sender,
              to: { email: recipient.email, name: fullName(recipient) },
              subject: renderTemplate(subject, vars),
              htmlContent: buildHtmlBody({ body: renderTemplate(body, vars), link }),
              textContent: renderTemplate(body, vars)
            })
            inviati += 1
            await logRecipient(ctx, {
              Comunicazione: comunicazioneId,
              Contatto: recipient.contattoId,
              Famiglia: recipient.famigliaId,
              Email: recipient.email,
              Esito: 'inviata',
              BrevoMessageId: result?.messageId || null
            })
          } catch (error) {
            falliti += 1
            errori.push({ email: recipient.email, message: error.message })
            await logRecipient(ctx, {
              Comunicazione: comunicazioneId,
              Contatto: recipient.contattoId,
              Famiglia: recipient.famigliaId,
              Email: recipient.email,
              Esito: 'fallita',
              Errore: error.message
            }).catch(logError => logger?.error?.(logError, '[communications] log recipient'))
          }
        })

        await updateComunicazione(ctx, comunicazioneId, {
          NInviati: inviati,
          NFalliti: falliti,
          Stato: falliti === 0 ? 'completato' : inviati === 0 ? 'errore' : 'parziale'
        })

        res.json({ comunicazioneId, totale: recipients.length, inviati, falliti, errori })
      } catch (error) {
        logger?.error?.(error, '[communications] send')
        if (comunicazioneId) {
          await updateComunicazione(ctx, comunicazioneId, { Stato: 'errore' }).catch(() => {})
        }
        next(error)
      }
    })
  }
}
