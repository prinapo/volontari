import { VerificaPage } from '../pages/VerificaPage.js'
import { apiGet } from './api.js'
import { createGiustificativoViaDialog } from './giustificativo.js'
import { loginAs } from './login.js'
import { selezionaFamiglia } from './pagina-famiglie.js'
import { assegnaContattoAFamigliaViaUI } from './pagina-gestione.js'

export { createProgettoViaUI } from '../pages/CreaProgettoPage.js'

export { createTestSubmission } from './submission.js'

export async function setupGiustificativiConStato(page, { prefix, giustificativi, auth, ids }) {
  const emailRes = await apiGet('email', {
    filter: JSON.stringify({ email_address: { _eq: auth.volontario_nofam.email } }),
    fields: 'Contatto_Relation'
  })
  const contattoId = emailRes.data?.[0]?.Contatto_Relation
  if (!contattoId) throw new Error(`Contatto non trovato per ${auth.volontario_nofam.email}`)

  const preState = await apiGet('contatti/' + contattoId, { fields: 'IsVolontario' })
  if (!ids.contattiModificati) ids.contattiModificati = []
  ids.contattiModificati.push({
    id: contattoId,
    preState: { IsVolontario: preState.data?.IsVolontario }
  })

  await assegnaContattoAFamigliaViaUI(page, {
    famigliaNome: prefix,
    searchTerm: auth.volontario_nofam.email,
    fullName: auth.volontario_nofam.email,
    ruolo: 'Volontario'
  })

  for (const g of giustificativi) {
    await loginAs(page, 'volontario_nofam', auth)
    await page.goto('/famiglie', { timeout: 15_000 }).catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
    await selezionaFamiglia(page, prefix)
    await page.waitForLoadState('networkidle').catch(() => {})
    const result = await createGiustificativoViaDialog(page, {
      descrizione: g.descrizione,
      importo: g.importo,
      submitAfter: g.stato === 'inviato' || g.stato === 'verificato' || g.stato === 'rifiutato'
    })

    if (result?.id) {
      if (!ids.giustificativi) ids.giustificativi = []
      ids.giustificativi.push(result.id)
    }

    if (g.stato === 'verificato' || g.stato === 'rifiutato') {
      await loginAs(page, 'manager', auth)
      const vp = new VerificaPage(page)
      await vp.goto()
      await vp.waitForTable()
      await vp.searchFamiglia(prefix)
      await vp.expandRow(0)
      await page.waitForLoadState('networkidle').catch(() => {})

      if (g.stato === 'verificato') {
        await page
          .locator('[data-testid="btn-verify"]')
          .first()
          .evaluate(el => el.click())
        await page.waitForLoadState('networkidle').catch(() => {})
      } else {
        await page
          .locator('[data-testid="btn-reject"]')
          .first()
          .evaluate(el => el.click())
        await page.waitForLoadState('networkidle').catch(() => {})
        const rejectDialog = page.locator('.q-dialog:visible').last()
        if (await rejectDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
          const textarea = rejectDialog.locator('textarea').first()
          await textarea.fill('Rifiutato E2E', { force: true })
          const rifiutaBtn = rejectDialog
            .locator('button')
            .filter({ hasText: /rifiut|conferma/i })
            .last()
          const targetId = ids.giustificativi?.at(-1)
          const patchPromise = targetId
            ? page
                .waitForResponse(
                  resp =>
                    resp.url().includes(`/items/Giustificativi/${targetId}`) && resp.request().method() === 'PATCH',
                  { timeout: 15_000 }
                )
                .catch(() => null)
            : null
          await rifiutaBtn.evaluate(el => el.click())
          await page.waitForLoadState('networkidle').catch(() => {})
          if (patchPromise) {
            const patchResp = await patchPromise
            if (!patchResp || patchResp.status() >= 400) {
              throw new Error(`Reject PATCH non completato per giustificativo ${targetId}`)
            }
          }
        }
      }
    }
  }
}

export {
  assegnaContattoAFamigliaViaUI,
  createFamigliaViaUI,
  createContattoViaUI,
  rimuoviContattoDaFamigliaViaUI
} from './pagina-gestione.js'
export { createGiustificativoViaDialog } from './giustificativo.js'
