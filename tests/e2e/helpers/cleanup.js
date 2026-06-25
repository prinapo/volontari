/**
 * Cleanup functions — eliminano dati di test via API.
 * Ordine: figli prima dei padri (FK constraints).
 */
import { apiDelete, apiGet, apiPatch, apiGetSystem, apiDeleteSystem } from './api.js'

const SAFELIST_EMAILS = [
  'fake.admin@fake.com',
  'fake.volontario@fake.com',
  'fake.volontario.nofam@fake.com',
  'fake.genitore@fake.com',
  'fake.gestore@fake.com',
  'fake.verificatore@fake.com',
  'fake.gestore.verifica@fake.com'
]
const MIN_PATTERN_LENGTH = 3

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

  // 3. Progetti (per pattern o orfani senza famiglia)
  for (const p of list) {
    try {
      // Cerca per pattern su Cognome_Beneficiario
      const res = await apiGet('Progetti', {
        filter: JSON.stringify({ Cognome_Beneficiario: { _icontains: p } }),
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
        filter: JSON.stringify({ Nome_Famiglia: { _icontains: p } }),
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

  // 5. Users diretti (per pattern su email) — prima dei contatti
  for (const p of list) {
    try {
      const res = await apiGetSystem('users', {
        filter: JSON.stringify({ email: { _icontains: p } }),
        fields: 'id,email'
      })
      for (const u of res.data || []) {
        if (SAFELIST_EMAILS.includes(u.email)) continue
        try {
          await apiDeleteSystem('users', u.id)
        } catch {
          /* */
        }
      }
    } catch {
      /* */
    }
  }

  // Pre-fetch safelist user IDs (per proteggere contatti safelistati)
  const safelistUserIds = new Set()
  for (const email of SAFELIST_EMAILS) {
    try {
      const res = await apiGetSystem('users', {
        filter: JSON.stringify({ email: { _eq: email } }),
        fields: 'id'
      })
      for (const u of res.data || []) safelistUserIds.add(u.id)
    } catch {
      /* */
    }
  }

  // 6. Contatti (+ users via FK)
  for (const p of list) {
    try {
      const res = await apiGet('contatti', {
        filter: JSON.stringify({ _or: [{ Nome: { _icontains: p } }, { Cognome: { _icontains: p } }] }),
        fields: 'id_contatto,user_id'
      })
      for (const r of res.data || []) {
        if (r.user_id && !safelistUserIds.has(r.user_id)) {
          try {
            await apiDeleteSystem('users', r.user_id)
          } catch {
            /* */
          }
        }
        if (!safelistUserIds.has(r.user_id)) {
          try {
            await apiDelete('contatti', r.id_contatto)
          } catch {
            /* */
          }
        }
      }
    } catch {
      /* */
    }
  }

  // Pulisci set per memory
  safelistUserIds.clear()
}
