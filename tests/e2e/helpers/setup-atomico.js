/**
 * Setup atomico per test — crea famiglia + assegna volontario + progetto.
 * Ogni creazione pusha subito l'ID in ids per garantire cleanup anche in caso di fallimento.
 * Chiamare apiLogin UNA volta nel beforeAll del describe prima di usare queste funzioni.
 */
import { apiGet, apiPost, apiPatch, apiDelete } from './api.js'
import { deleteFamiglie, deleteProgetti, deleteContatti, deleteByPattern } from './cleanup.js'
import { createFamigliaViaUI } from './pagina-gestione.js'
import { loginAs } from './login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

/**
 * Crea famiglia + assegna volontario di test + progetto.
 * TUTTI i dati usano un prefisso timestamp unico per cleanup via pattern.
 * ids viene popolato SUBITO dopo ogni creazione.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} ids — oggetto per tracciamento IDs
 * @returns {Promise<{nomeFam: string, prefix: string}>}
 */
export async function creaFamigliaVolontarioProgetto(page, ids) {
  const prefix = `T${Date.now()}_`
  ids.prefix = prefix

  const nomeFam = `${prefix}Fam`
  const fam = await createFamigliaViaUI(page, { nomeFamiglia: nomeFam })
  ids.famiglia = fam.id_famiglia

  const emailRes = await apiGet('email', {
    filter: JSON.stringify({ email_address: { _eq: auth.volontario.email } }),
    fields: 'Contatto_Relation'
  })
  const contattoId = emailRes.data?.[0]?.Contatto_Relation

  // Pre-clean: elimina FC link orfani (da cleanup falliti)
  // Garantisce che il test parta pulito anche se la pulizia precedente non è riuscita
  const existingFc = await apiGet('Famiglie_Contatti', {
    filter: JSON.stringify({ Contatto: { _eq: contattoId } }),
    fields: 'id'
  })
  for (const fc of existingFc.data || []) {
    try {
      await apiDelete('Famiglie_Contatti', fc.id)
    } catch {
      /* */
    }
  }

  await apiPost('Famiglie_Contatti', {
    id: Math.floor(Math.random() * 9000000) + 1000000,
    Contatto: contattoId,
    Famiglia: fam.id_famiglia,
    Ruolo_nella_Famiglia: 'Volontario',
    Disattivo: false
  })
  await apiPatch('contatti', contattoId, { IsVolontario: true })

  const progRes = await apiPost('Progetti', {
    id_progetto: Math.floor(Math.random() * 9000000) + 1000000,
    Cognome_Beneficiario: prefix,
    Nome_Beneficiario: 'Test',
    AnnoBando: new Date().getFullYear(),
    Allocato: 5000,
    Famiglia: fam.id_famiglia,
    StatoProgetto: 'aperto'
  })
  ids.progetto = progRes.data.id_progetto

  return { nomeFam, prefix }
}

/**
 * Login volontario e attende caricamento famiglia.
 * Se multi-famiglia (impossibile con setup atomico, ma per sicurezza), seleziona la prima.
 */
export async function loginVolontarioConFamiglia(page, nomeFam) {
  await loginAs(page, 'volontario', auth)
  await page.goto('/famiglie', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1000)
  const famSelector = page.locator('.q-select:has(.q-field__label:has-text("Seleziona famiglia"))')
  if (await famSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
    await famSelector.click()
    await page.waitForTimeout(500)
    await page.locator('.q-menu .q-item').first().click()
    await page.waitForTimeout(1000)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
  await page
    .locator('.text-h6')
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {})
}

/**
 * Login gestore per setup.
 */
export async function loginGestore(page) {
  await loginAs(page, 'gestore', auth)
}

/**
 * Patterns universali che coprono TUTTI i dati di test,
 * indipendentemente dal test che li ha creati.
 */
const GLOBAL_PATTERNS = [
  '__TEST_ATOM_',
  '__TEST_CG_',
  '__TEST_IE_',
  '__TEST_AL_',
  '__TEST_EL_',
  '__TEST_SU_',
  '__TEST_RO_',
  '__TEST_FP_',
  '__TEST_HELP_',
  '__TEST_VF_',
  '__TEST_AL_',
  '__TEST_RC',
  'SR-02',
  'VF_0',
  'VF_1',
  'VF_2',
  'VF_3',
  'VF_4',
  'VF_5',
  'VE_ADD_',
  'EC-01 ',
  'EC-02 ',
  'EC-03 ',
  'EC-04 ',
  'test.rf02',
  'test_rc',
  'test_priority',
  'rc_setup',
  'test_rc02',
  'Test errore 400',
  '__TEST_Creazione_',
  '__TEST_RF02_',
  '__TEST_RC0',
  '__TEST_RC5_',
  '__TEST_SR2',
  '__TEST_RC03',
  '__TEST_PAG',
  'test_el02_',
  '__TEST_No' // CG-02/03/04: NoDesc, NoImp, NoFile
]

/**
 * Pulizia universale: cancella per ID (tracciati) + per pattern (prefix).
 * Se ids.prefix è impostato, lo usa come pattern. Altrimenti usa GLOBAL_PATTERNS.
 */
export async function pulisciIds(ids) {
  // Costruisce patterns: prefix del test + globali
  const patterns = [ids.prefix, ...GLOBAL_PATTERNS].filter(Boolean)

  // Hard-delete giustificativi
  if (ids.giustificativi?.length) {
    for (const gid of ids.giustificativi) {
      try {
        await apiDelete('Giustificativi', gid)
      } catch {
        /* */
      }
    }
    ids.giustificativi = []
  }
  // Per sicurezza, cancella anche per pattern
  try {
    const res = await apiGet('Giustificativi', {
      filter: JSON.stringify({
        _or: patterns.map(p => ({ Descrizione: { _icontains: p } }))
      }),
      fields: 'id'
    })
    for (const r of res.data || []) {
      try {
        await apiDelete('Giustificativi', r.id)
      } catch {
        /* */
      }
    }
  } catch {
    /* */
  }

  if (ids.progetto) {
    try {
      await deleteProgetti(ids.progetto)
    } catch {
      /* */
    }
  }
  if (ids.famiglia) {
    try {
      await deleteFamiglie(ids.famiglia)
    } catch {
      /* */
    }
  }
  if (ids.contatti?.length) {
    try {
      await deleteContatti(...ids.contatti)
    } catch {
      /* */
    }
  }

  // Pulizia per pattern (catch-all) — include prefix del test
  const allPatterns = [...new Set([...patterns, ids.prefix].filter(Boolean))]
  try {
    await deleteByPattern(allPatterns)
  } catch {
    /* */
  }
}
