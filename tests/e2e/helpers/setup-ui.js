import { loginAs } from './login.js'
import { apiGet } from './api.js'
import { VerificaPage } from '../pages/VerificaPage.js'
import {
  createFamigliaViaUI,
  createContattoViaUI,
  assegnaContattoAFamigliaViaUI,
  rimuoviContattoDaFamigliaViaUI
} from './pagina-gestione.js'
import { createGiustificativoViaDialog } from './giustificativo.js'

export {
  createFamigliaViaUI,
  createContattoViaUI,
  assegnaContattoAFamigliaViaUI,
  rimuoviContattoDaFamigliaViaUI
}

export { createProgettoViaUI } from '../pages/CreaProgettoPage.js'

export { createGiustificativoViaDialog }

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
    await page.waitForURL('**/famiglie', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(3000)
    for (let i = 0; i < 30; i++) {
      const done = await page.evaluate(async (famigliaNome) => {
        try {
          const app = document.querySelector('#q-app')?.__vue_app__
          if (!app) return false
          const pinia = app.config.globalProperties.$pinia
          if (!pinia) return false
          const s = pinia.state.value?.famiglie
          if (!s?.famiglieContatti?.length) return false
          if (s.selectedProgettoId) return true
          if (s.error || s.selectedFamigliaId) return false
          const fc = s.famiglieContatti.find(fc => fc.Famiglia?.Nome_Famiglia === famigliaNome)
          if (!fc?.Famiglia) return false
          const famId = fc.Famiglia.id_famiglia
          const token = localStorage.getItem('access_token')
          if (!token) return false
          const res = await fetch('https://api-dev.sostienilsostegno.com/items/Famiglie/' + famId + '?fields=*,Progetti.*', {
            headers: { Authorization: 'Bearer ' + token }
          })
          if (!res.ok) return false
          const famiglia = (await res.json())?.data
          if (!famiglia) return false
          s.famiglia = famiglia
          s.selectedFamigliaId = famId
          if (famiglia.Progetti?.length > 0) {
            s.selectedProgettoId = famiglia.Progetti[0].id_progetto
            return true
          }
          return false
        } catch (e) { return false }
      }, prefix)
      if (done) break
      await page.waitForTimeout(1000)
    }
    await page.waitForTimeout(500)
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
      await loginAs(page, 'verificatore', auth)
      const vp = new VerificaPage(page)
      await vp.goto()
      await vp.waitForTable()
      await vp.searchFamiglia(prefix)
      await vp.expandRow(0)
      await page.waitForTimeout(500)

      if (g.stato === 'verificato') {
        await page.locator('[data-testid="btn-verify"]').first().click()
        await page.waitForTimeout(2000)
      } else {
        await page.locator('[data-testid="btn-reject"]').first().click()
        await page.waitForTimeout(1500)
        const rejectDialog = page.locator('.q-dialog:visible').last()
        if (await rejectDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
          const nota = rejectDialog.locator('textarea, input[type="text"]').first()
          if (await nota.isVisible().catch(() => false)) await nota.fill('Rifiutato E2E')
          await rejectDialog
            .locator('button')
            .filter({ hasText: /rifiut|conferma/i })
            .last()
            .click()
          await page.waitForTimeout(2000)
        }
      }
    }
  }
}
