/**
 * Cleanup functions — eliminano dati di test via API.
 * Ordine: figli prima dei padri (FK constraints).
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
  'fake.gestore.verifica@fake.com'
]
const MIN_PATTERN_LENGTH = 1

/**
 * Sgancia i file Directus che referenziano un utente (modified_by / uploaded_by).
 * Previene FK violation quando si cancella un user.
 */
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
        /* */
      }
    }
  } catch {
    /* */
  }
}

async function deleteEmailByContatto(contattoId) {
  const records = await apiGet('email', {
    filter: JSON.stringify({ Contatto_Relation: { _eq: contattoId } }),
    fields: 'id'
  })
  for (const row of records.data || []) {
    try {
      await apiDelete('email', row.id)
    } catch {
      /* */
    }
  }
}

async function deleteDirectusUser(contattoId) {
  try {
    const res = await apiGet('contatti/' + contattoId, { fields: 'user_id' })
    const userId = res.data?.user_id
    if (userId) {
      try {
        await unlinkUserFiles(userId)
      } catch {
        /* */
      }
      try {
        await apiDeleteSystem('users', userId)
      } catch {
        /* */
      }
    }
  } catch {
    /* */
  }
}

export async function deleteProgetti(...ids) {
  for (const id of ids) {
    if (!id) continue
    try {
      await apiDelete('Progetti', id)
    } catch {
      /* */
    }
  }
}

export async function invalidateGiustificativi(...ids) {
  for (const id of ids) {
    if (!id) continue
    try {
      await apiPatch('Giustificativi', id, { Invalidato: true })
    } catch {
      /* */
    }
  }
}

export async function deleteFamiglie(...ids) {
  for (const id of ids) {
    if (!id) continue
    try {
      const fcRecords = await apiGet('Famiglie_Contatti', {
        filter: JSON.stringify({ Famiglia: { _eq: id } }),
        fields: 'id'
      })
      for (const row of fcRecords.data || []) {
        try {
          await apiDelete('Famiglie_Contatti', row.id)
        } catch {
          /* */
        }
      }
    } catch {
      /* */
    }
    try {
      await apiDelete('Famiglie', id)
    } catch {
      /* */
    }
  }
}

export async function deleteContatti(...ids) {
  for (const id of ids) {
    if (!id) continue
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
          /* */
        }
      }
    } catch {
      /* */
    }
    try {
      await apiDelete('contatti', id)
    } catch {
      /* */
    }
  }
}

/**
 * Cancella TUTTI i record che contengono `pattern` in campi specifici.
 * Ordine FK: giustificativi → email → progetti → famiglie (+ FC link) → contatti → users
 * Ogni operazione ignora errori (best-effort).
 *
 * @param {string|string[]} patterns — Stringa o array di stringhe da cercare
 */
export async function deleteByPattern(patterns) {
  const list = (Array.isArray(patterns) ? patterns : [patterns]).filter(p => p.length >= MIN_PATTERN_LENGTH)
  if (list.length === 0) return

  // 0. InviiGiustificativiNoLogin (submission pubbliche)
  for (const p of list) {
    try {
      const res = await apiGet('InviiGiustificativiNoLogin', {
        filter: JSON.stringify({ email: { _icontains: p } }),
        fields: 'id'
      })
      for (const r of res.data || []) {
        try {
          await apiDelete('InviiGiustificativiNoLogin', r.id)
        } catch {
          /* */
        }
      }
    } catch {
      /* */
    }
  }

  // 1. Giustificativi (hard delete)
  for (const p of list) {
    try {
      const res = await apiGet('Giustificativi', {
        filter: JSON.stringify({ Descrizione: { _icontains: p } }),
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
  }

  // 2. Email
  for (const p of list) {
    try {
      const res = await apiGet('email', {
        filter: JSON.stringify({ email_address: { _icontains: p } }),
        fields: 'id'
      })
      for (const r of res.data || []) {
        try {
          await apiDelete('email', r.id)
        } catch {
          /* */
        }
      }
    } catch {
      /* */
    }
  }

  // 3. Progetti (per pattern su Cognome_Beneficiario o id_progetto, orfani senza famiglia)
  for (const p of list) {
    try {
      const res = await apiGet('Progetti', {
        filter: JSON.stringify({
          _or: [{ Cognome_Beneficiario: { _icontains: p } }, { id_progetto: { _icontains: p } }]
        }),
        fields: 'id_progetto'
      })
      for (const r of res.data || []) {
        try {
          await apiDelete('Progetti', r.id_progetto)
        } catch {
          /* */
        }
      }
    } catch {
      /* */
    }
  }
  // Progetti orfani (famiglia null) — se nessun pattern specifico li ha presi
  try {
    const res = await apiGet('Progetti', {
      filter: JSON.stringify({ Famiglia: { _null: true } }),
      fields: 'id_progetto'
    })
    for (const r of res.data || []) {
      try {
        await apiDelete('Progetti', r.id_progetto)
      } catch {
        /* */
      }
    }
  } catch {
    /* */
  }

  // 4. Famiglie (+ FC link figli)
  for (const p of list) {
    try {
      const res = await apiGet('Famiglie', {
        filter: JSON.stringify({
          _or: [{ Nome_Famiglia: { _icontains: p } }, { id_famiglia: { _icontains: p } }]
        }),
        fields: 'id_famiglia'
      })
      for (const r of res.data || []) {
        // Cancella FC link figli
        try {
          const fc = await apiGet('Famiglie_Contatti', {
            filter: JSON.stringify({ Famiglia: { _eq: r.id_famiglia } }),
            fields: 'id'
          })
          for (const fcRow of fc.data || []) {
            try {
              await apiDelete('Famiglie_Contatti', fcRow.id)
            } catch {
              /* */
            }
          }
        } catch {
          /* */
        }
        try {
          await apiDelete('Famiglie', r.id_famiglia)
        } catch {
          /* */
        }
      }
    } catch {
      /* */
    }
  }

  // Step 5 e 6 rimossi: la pulizia di contatti e directus_users per pattern
  // è troppo pericolosa. Contatti e users vengono puliti SOLO tramite
  // deleteContatti() esplicito (chiamato da pulisciIds quando ids.contatti è popolato).
}
