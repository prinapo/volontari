/**
 * Cleanup functions — eliminano dati di test via API per ID tracciato.
 * Non usa piu' pattern matching per cancellare: ogni test traccia
 * i propri ID e pulisciIds() cancella solo quelli.
 *
 * findByPattern() esiste SOLO in modalita' read-only per verificare
 * che il tracking-by-ID funzioni (dry-run).
 */
import { apiDelete, apiGet, apiPatch, apiGetSystem, apiDeleteSystem, apiPatchSystem } from './api.js'

const SAFELIST_EMAILS = [
  'giovanni.prinetti@gmail.com',
  'fake.admin@fake.com',
  'fake.volontario@fake.com',
  'fake.volontario.nofam@fake.com',
  'fake.genitore@fake.com',
  'fake.gestore@fake.com',
  'fake.verificatore@fake.com',
  'fake.gestore.verifica@fake.com',
  'test.validatore.sis@gmail.com'
]

async function unlinkUserFiles(userId) {
  try {
    const files = await apiGetSystem('files', {
      filter: JSON.stringify({
        _or: [{ modified_by: { _eq: userId } }, { uploaded_by: { _eq: userId } }]
      }),
      fields: 'id',
      limit: -1
    })
    for (const f of files.data || []) {
      try {
        await apiPatchSystem('files', f.id, { modified_by: null, uploaded_by: null })
      } catch {
        console.warn('[CLEANUP] Failed to unlink file', f.id, 'from user', userId)
      }
    }
  } catch {
    console.warn('[CLEANUP] Failed to query files for user', userId)
  }
}

export async function deleteEmailByContatto(contattoId) {
  const records = await apiGet('email', {
    filter: JSON.stringify({ Contatto_Relation: { _eq: contattoId } }),
    fields: 'id'
  })
  for (const row of records.data || []) {
    try {
      await apiDelete('email', row.id)
    } catch {
      console.warn('[CLEANUP] Failed to delete email', row.id)
    }
  }
}

export async function deleteDirectusUser(contattoId) {
  try {
    const res = await apiGet('contatti/' + contattoId, { fields: 'user_id' })
    const userId = res.data?.user_id
    if (userId) {
      try {
        await unlinkUserFiles(userId)
      } catch {
        console.warn('[CLEANUP] Failed to unlink files for user', userId)
      }
      try {
        await apiDeleteSystem('users', userId)
      } catch {
        console.warn('[CLEANUP] Failed to delete Directus user', userId)
      }
    }
  } catch {
    console.warn('[CLEANUP] Failed to get contatto user_id for', contattoId)
  }
}

async function deleteProjectAttachments(junctionCollection, progettoId) {
  try {
    const links = await apiGet(junctionCollection, {
      filter: JSON.stringify({ Progetti_id_progetto: { _eq: progettoId } }),
      fields: 'id,directus_files_id'
    })

    for (const row of links.data || []) {
      try {
        await apiDelete(junctionCollection, row.id)
      } catch {
        console.warn('[CLEANUP] Failed to delete attachment', row.id)
      }
      if (row.directus_files_id) {
        try {
          await apiDeleteSystem('files', row.directus_files_id)
        } catch {
          console.warn('[CLEANUP] Failed to delete system file', row.directus_files_id)
        }
      }
    }
  } catch {
    console.warn('[CLEANUP] Failed to query attachments for', junctionCollection, progettoId)
  }
}

export async function deleteProgetti(...ids) {
  for (const id of ids) {
    if (!id) continue
    // Sicurezza: verifica che il progetto sia stato creato dal test (cognome contiene TEST)
    try {
      const check = await apiGet('Progetti/' + id, { fields: 'Cognome_Beneficiario' })
      const cognome = check?.data?.Cognome_Beneficiario || ''
      if (!cognome.includes('TEST')) {
        console.warn('[CLEANUP] SKIP delete progetto', id, '— cognome non contiene TEST:', cognome)
        continue
      }
    } catch {
      console.warn('[CLEANUP] Failed to check progetto', id, '— skipping delete')
      continue
    }
    await deleteProjectAttachments('Progetti_files', id)
    await deleteProjectAttachments('Progetti_files_1', id)
    await deleteProjectAttachments('Progetti_files_2', id)
    try {
      await apiDelete('Progetti', id)
    } catch {
      console.warn('[CLEANUP] Failed to delete Progetti', id)
    }
  }
}

export async function invalidateGiustificativi(...ids) {
  for (const id of ids) {
    if (!id) continue
    try {
      await apiPatch('Giustificativi', id, { Invalidato: true })
    } catch {
      console.warn('[CLEANUP] Failed to invalidate Giustificativi', id)
    }
  }
}

export async function deleteFamiglie(...ids) {
  for (const id of ids) {
    if (!id) continue
    // Sicurezza: verifica che la famiglia sia stata creata dal test (nome contiene TEST)
    try {
      const check = await apiGet('Famiglie/' + id, { fields: 'Nome_Famiglia' })
      const nome = check?.data?.Nome_Famiglia || ''
      if (!nome.includes('TEST')) {
        console.warn('[CLEANUP] SKIP delete famiglia', id, '— nome non contiene TEST:', nome)
        continue
      }
    } catch {
      console.warn('[CLEANUP] Failed to check famiglia', id, '— skipping delete')
      continue
    }
    try {
      const fcRecords = await apiGet('Famiglie_Contatti', {
        filter: JSON.stringify({ Famiglia: { _eq: id } }),
        fields: 'id'
      })
      for (const row of fcRecords.data || []) {
        try {
          await apiDelete('Famiglie_Contatti', row.id)
        } catch {
          console.warn('[CLEANUP] Failed to delete Famiglie_Contatti', row.id)
        }
      }
    } catch {
      console.warn('[CLEANUP] Failed to query Famiglie_Contatti for Famiglia', id)
    }
    try {
      await apiDelete('Famiglie', id)
    } catch {
      console.warn('[CLEANUP] Failed to delete Famiglia', id)
    }
  }
  // Safety: cleanup orphan FC rows for deleted famiglie
  try {
    const orphanFC = await apiGet('Famiglie_Contatti', {
      filter: JSON.stringify({ Famiglia: { _null: true } }),
      fields: 'id',
      limit: -1
    })
    for (const row of orphanFC.data || []) {
      try {
        await apiDelete('Famiglie_Contatti', row.id)
      } catch {
        /* */
      }
    }
  } catch {
    /* */
  }
}

export async function deleteContatti(...ids) {
  for (const id of ids) {
    if (!id) continue
    // Sicurezza: verifica che il contatto sia stato creato dal test (cognome contiene TEST)
    try {
      const check = await apiGet('contatti/' + id, { fields: 'Cognome' })
      const cognome = check?.data?.Cognome || ''
      if (!cognome.includes('TEST')) {
        console.warn('[CLEANUP] SKIP delete contatto', id, '— cognome non contiene TEST:', cognome)
        continue
      }
    } catch {
      console.warn('[CLEANUP] Failed to check contatto', id, '— skipping delete')
      continue
    }
    await deleteDirectusUser(id)
    await deleteEmailByContatto(id)
    try {
      const fcRecords = await apiGet('Famiglie_Contatti', {
        filter: JSON.stringify({ Contatto: { _eq: id } }),
        fields: 'id'
      })
      for (const row of fcRecords.data || []) {
        try {
          await apiDelete('Famiglie_Contatti', row.id)
        } catch {
          console.warn('[CLEANUP] Failed to delete Famiglie_Contatti', row.id)
        }
      }
    } catch {
      console.warn('[CLEANUP] Failed to query Famiglie_Contatti for Contatto', id)
    }
    try {
      await apiDelete('contatti', id)
    } catch {
      console.warn('[CLEANUP] Failed to delete contatto', id)
    }
  }
  // Safety: cleanup orphan FC rows for deleted contatti
  try {
    const orphanFC = await apiGet('Famiglie_Contatti', {
      filter: JSON.stringify({ Contatto: { _null: true } }),
      fields: 'id',
      limit: -1
    })
    for (const row of orphanFC.data || []) {
      try {
        await apiDelete('Famiglie_Contatti', row.id)
      } catch {
        /* */
      }
    }
  } catch {
    /* */
  }
}

/**
 * findByPattern — MODALITA' SOLO LETTURA (dry-run).
 *
 * Cerca record con _icontains pattern su tutte le tabelle di test,
 * restituisce un report di cio' che troverebbe deleteByPattern.
 * Usato per verificare che il tracking-by-ID abbia funzionato.
 *
 * @param {string|string[]} patterns — Stringa o array di stringhe da cercare
 * @returns {Promise<Array<{table: string, id: string|number, field: string, value: string}>>}
 */
export async function findByPattern(patterns) {
  const list = (Array.isArray(patterns) ? patterns : [patterns]).filter(p => p.length >= 1)
  if (list.length === 0) return []

  const report = []

  for (const p of list) {
    try {
      const res = await apiGet('InviiGiustificativiNoLogin', {
        filter: JSON.stringify({ email: { _icontains: p } }),
        fields: 'id,email'
      })
      for (const r of res.data || []) {
        report.push({ table: 'InviiGiustificativiNoLogin', id: r.id, field: 'email', value: r.email })
      }
    } catch {
      console.warn('[CLEANUP] findByPattern query failed: InviiGiustificativiNoLogin')
    }

    try {
      const res = await apiGet('Giustificativi', {
        filter: JSON.stringify({ Descrizione: { _icontains: p } }),
        fields: 'id,Descrizione'
      })
      for (const r of res.data || []) {
        report.push({ table: 'Giustificativi', id: r.id, field: 'Descrizione', value: r.Descrizione })
      }
    } catch {
      console.warn('[CLEANUP] findByPattern query failed: Giustificativi')
    }

    try {
      const res = await apiGet('email', {
        filter: JSON.stringify({ email_address: { _icontains: p } }),
        fields: 'id,email_address'
      })
      for (const r of res.data || []) {
        report.push({ table: 'email', id: r.id, field: 'email_address', value: r.email_address })
      }
    } catch {
      console.warn('[CLEANUP] findByPattern query failed: email')
    }

    try {
      const res = await apiGet('Progetti', {
        filter: JSON.stringify({ Cognome_Beneficiario: { _icontains: p } }),
        fields: 'id_progetto,Cognome_Beneficiario'
      })
      for (const r of res.data || []) {
        report.push({
          table: 'Progetti',
          id: r.id_progetto,
          field: 'Cognome_Beneficiario',
          value: r.Cognome_Beneficiario
        })
      }
    } catch {
      console.warn('[CLEANUP] findByPattern query failed: Progetti')
    }

    try {
      const res = await apiGet('Famiglie', {
        filter: JSON.stringify({
          _or: [{ Nome_Famiglia: { _icontains: p } }, { id_famiglia: { _icontains: p } }]
        }),
        fields: 'id_famiglia,Nome_Famiglia,id_famiglia'
      })
      for (const r of res.data || []) {
        report.push({
          table: 'Famiglie',
          id: r.id_famiglia,
          field: r.Nome_Famiglia?.includes(p) ? 'Nome_Famiglia' : 'id_famiglia',
          value: r.Nome_Famiglia || r.id_famiglia
        })
      }
    } catch {
      console.warn('[CLEANUP] findByPattern query failed: Famiglie')
    }
  }

  return report
}
