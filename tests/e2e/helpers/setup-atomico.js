/**
 * Setup atomico per test.
 * Ogni creazione pusha SUBITO l'ID in ids per garantire cleanup anche in caso di fallimento.
 * Per contatti ESISTENTI modificati, salva pre-state per ripristino invece di cancellazione.
 *
 * TUTTI i campi testuali (Nome, Cognome, Descrizione, email, ecc.) iniziano con "TEST_".
 */
import { apiGet, apiPost, apiPatch, apiDelete } from './api.js'
import { deleteFamiglie, deleteProgetti, deleteContatti, deleteEmailByContatto, deleteDirectusUser } from './cleanup.js'
import { createFamigliaViaUI, assegnaContattoAFamigliaViaUI } from './pagina-gestione.js'
import { loginConFamigliaViaUI } from './pagina-famiglie.js'
import { createProgettoViaUI } from '../pages/CreaProgettoPage.js'
import { loginAs } from './login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

/**
 * Crea famiglia + assegna volontario di test + progetto.
 * TUTTI i dati usano prefisso TEST_ per tracciabilita'.
 * ids viene popolato SUBITO dopo ogni creazione.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} ids — oggetto per tracciamento IDs (mutato inline)
 * @returns {Promise<{nomeFam: string, prefix: string}>}
 */
export async function creaFamigliaVolontarioProgetto(page, ids) {
  const ts = Date.now()
  const prefix = `TEST_${ts}_`
  ids.prefix = prefix

  const nomeFam = `${prefix}Fam`
  const fam = await createFamigliaViaUI(page, { nomeFamiglia: nomeFam })
  ids.famiglia = fam.id_famiglia

  const emailRes = await apiGet('email', {
    filter: JSON.stringify({ email_address: { _eq: auth.volontario.email } }),
    fields: 'Contatto_Relation'
  })
  const contattoId = emailRes.data?.[0]?.Contatto_Relation

  // Pre-state del contatto per ripristino (NON cancelliamo nulla)
  const contattoRes = await apiGet('contatti/' + contattoId, {
    fields: 'IsVolontario,user_id'
  })
  const preState = {
    IsVolontario: contattoRes.data?.IsVolontario,
    user_id: contattoRes.data?.user_id
  }

  if (!ids.contattiModificati) ids.contattiModificati = []
  ids.contattiModificati.push({ id: contattoId, preState })

  await assegnaContattoAFamigliaViaUI(page, {
    famigliaNome: nomeFam,
    searchTerm: auth.volontario.email,
    fullName: auth.volontario.email,
    ruolo: 'Volontario'
  })

  ids.progetto = await createProgettoViaUI(
    page,
    {
      famigliaNome: nomeFam,
      Cognome_Beneficiario: prefix,
      Nome_Beneficiario: prefix + 'Test',
      AnnoBando: new Date().getFullYear(),
      Allocato: 5000
    },
    auth,
    'manager'
  )

  return { nomeFam, prefix }
}

/**
 * Login volontario e attende caricamento famiglia.
 */
export async function loginVolontarioConFamiglia(page, nomeFam, role = 'volontario') {
  await loginConFamigliaViaUI(page, {
    role,
    auth,
    nomeFamiglia: nomeFam
  })
}

/**
 * Login manager per setup.
 */
export async function loginGestore(page) {
  await loginAs(page, 'manager', auth)
}

/**
 * Pulizia universale: cancella SOLO per ID tracciato.
 * Ordine FK: figli prima dei padri.
 */
export async function pulisciIds(ids) {
  // Giustificativi
  if (ids.giustificativi?.length) {
    for (const gid of ids.giustificativi) {
      try {
        await apiDelete('Giustificativi', gid)
      } catch {
        console.warn('[CLEANUP] Failed to delete Giustificativi', gid)
      }
    }
    ids.giustificativi = []
  }

  // Pagamenti
  if (ids.pagamenti?.length) {
    for (const pid of ids.pagamenti) {
      try {
        await apiDelete('Pagamenti', pid)
      } catch {
        console.warn('[CLEANUP] Failed to delete Pagamenti', pid)
      }
    }
    ids.pagamenti = []
  }

  // Rendicontazioni
  if (ids.rendicontazioni?.length) {
    for (const rid of ids.rendicontazioni) {
      try {
        await apiDelete('Rendicontazioni', rid)
      } catch {
        console.warn('[CLEANUP] Failed to delete Rendicontazioni', rid)
      }
    }
    ids.rendicontazioni = []
  }

  // Email create dal test
  if (ids.email?.length) {
    for (const eid of ids.email) {
      try {
        await apiDelete('email', eid)
      } catch {
        console.warn('[CLEANUP] Failed to delete email', eid)
      }
    }
    ids.email = []
  }

  // FC links creati dal test
  if (ids.fcLinks?.length) {
    for (const fid of ids.fcLinks) {
      try {
        await apiDelete('Famiglie_Contatti', fid)
      } catch {
        console.warn('[CLEANUP] Failed to delete Famiglie_Contatti', fid)
      }
    }
    ids.fcLinks = []
  }

  // Batch pagamenti
  if (ids.batch?.length) {
    for (const bid of ids.batch) {
      try {
        await apiDelete('BatchPagamenti', bid)
      } catch {
        console.warn('[CLEANUP] Failed to delete BatchPagamenti', bid)
      }
    }
    ids.batch = []
  }

  // InviiGiustificativiNoLogin
  if (ids.inviiNoLogin?.length) {
    for (const iid of ids.inviiNoLogin) {
      try {
        await apiDelete('InviiGiustificativiNoLogin', iid)
      } catch {
        console.warn('[CLEANUP] Failed to delete InviiGiustificativiNoLogin', iid)
      }
    }
    ids.inviiNoLogin = []
  }

  // Progetti
  if (ids.progetto) {
    const progettoIds = Array.isArray(ids.progetto) ? ids.progetto : [ids.progetto]
    try {
      await deleteProgetti(...progettoIds)
    } catch {
      console.warn('[CLEANUP] Failed to delete progetti', progettoIds)
    }
    ids.progetto = Array.isArray(ids.progetto) ? [] : null
  }

  // Famiglie (include FC figli)
  if (ids.famiglia) {
    const famigliaIds = Array.isArray(ids.famiglia) ? ids.famiglia : [ids.famiglia]
    try {
      await deleteFamiglie(...famigliaIds)
    } catch {
      console.warn('[CLEANUP] Failed to delete famiglie', famigliaIds)
    }
    ids.famiglia = Array.isArray(ids.famiglia) ? [] : null
  }

  // Contatti NUOVI (creati dal test) — deleteContatti gestisce user/email/FC
  const contattiDaEliminare = []
  if (ids.contattiCreati?.length) contattiDaEliminare.push(...ids.contattiCreati)
  if (ids.contatti?.length) contattiDaEliminare.push(...ids.contatti)
  if (contattiDaEliminare.length > 0) {
    try {
      await deleteContatti(...contattiDaEliminare)
    } catch {
      console.warn('[CLEANUP] Failed to delete contatti', contattiDaEliminare)
    }
    ids.contattiCreati = []
    ids.contatti = []
  }

  // Orphaned Famiglie_Contatti cleanup (FK SET NULL can leave dangling rows)
  try {
    const orphanFC = await apiGet('Famiglie_Contatti', {
      filter: JSON.stringify({
        _or: [
          { Famiglia: { _null: true } },
          { Contatto: { _null: true } }
        ]
      }),
      fields: 'id',
      limit: -1
    })
    for (const row of orphanFC.data || []) {
      try {
        await apiDelete('Famiglie_Contatti', row.id)
      } catch {
        console.warn('[CLEANUP] Failed to delete orphan Famiglie_Contatti', row.id)
      }
    }
  } catch {
    // silent — best-effort
  }

  // Contatti MODIFICATI: ripristino pre-state
  if (ids.contattiModificati?.length) {
    for (const mod of ids.contattiModificati) {
      const patch = {}
      if (mod.preState.IsVolontario !== undefined) {
        patch.IsVolontario = mod.preState.IsVolontario
      }
      if (Object.keys(patch).length > 0) {
        try {
          await apiPatch('contatti', mod.id, patch)
        } catch {
          console.warn('[CLEANUP] Failed to restore contatto', mod.id)
        }
      }
    }
    ids.contattiModificati = []
  }
}
