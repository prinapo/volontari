import { contattiService } from 'src/services/contatti.service'
import { emailService } from 'src/services/email.service'
import { gestioneService } from 'src/services/gestione.service'
import { referentiService } from 'src/services/referenti.service'
import { usersService } from 'src/services/users.service'
import { RUOLI_FAMIGLIA } from 'src/utils/constants'

function generateSecurePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  const array = new Uint32Array(16)
  crypto.getRandomValues(array)
  return 'Temp_' + Array.from(array, v => chars[v % chars.length]).join('') + '_2026!'
}

async function _findOrCreateUser(contattoId) {
  const contattoRes = await contattiService.getById(contattoId)
  const contatto = contattoRes.data.data
  if (!contatto) return { error: 'Contatto non trovato' }
  if (contatto.user_id) {
    try {
      const userRes = await usersService.getByIds([contatto.user_id])
      if (userRes.data.data?.[0] && !userRes.data.data[0].role) {
        const rolesRes = await usersService.getRoleByName('Volontario')
        const ruoloId = rolesRes.data.data?.[0]?.id
        if (ruoloId) await usersService.update(contatto.user_id, { role: ruoloId })
      }
    } catch {
      /* skip */
    }
    return { success: true, contatto }
  }

  const email = contatto.email?.find(e => e.Primary === true)?.email_address || contatto.email?.[0]?.email_address
  if (!email) return { error: 'Email mancante' }

  const userRes = await usersService.searchByEmail(email)
  const existing = (userRes.data.data || [])[0]
  if (existing) {
    await contattiService.update(contattoId, { user_id: existing.id })
    if (!existing.role) {
      const rolesRes = await usersService.getRoleByName('Volontario')
      const ruoloId = rolesRes.data.data?.[0]?.id
      if (ruoloId) await usersService.update(existing.id, { role: ruoloId })
    }
    return { success: true, contatto }
  }

  const rolesRes = await usersService.getRoleByName('Volontario')
  const ruoloId = rolesRes.data.data?.[0]?.id
  if (!ruoloId) return { error: "Ruolo Volontario non trovato in Directus. Contatta l'amministratore." }

  const newUserRes = await usersService.create({
    email,
    password: generateSecurePassword(),
    first_name: contatto.Nome || '',
    last_name: contatto.Cognome || '',
    role: ruoloId
  })
  const newUserId = newUserRes.data.data?.id
  if (newUserId) {
    await contattiService.update(contattoId, { user_id: newUserId })
  }
  return { success: true, contatto }
}

export async function creaGenitore(data) {
  if (data.Email) {
    const emailCheck = await contattiService.getByEmails([data.Email])
    const existingContatti = emailCheck.data.data || []
    if (existingContatti.length > 0) {
      const err = new Error('Email duplicata')
      err.message = 'Email duplicata'
      throw err
    }
  }
  const contattoRes = await contattiService.create({
    id_contatto: data.id_contatto,
    Nome: data.Nome,
    Cognome: data.Cognome,
    Numero_di_cellulare: data.Numero_di_cellulare || null,
    Numero_di_telefono: data.Numero_di_telefono || null
  })
  const contattoId = contattoRes.data.data?.id_contatto
  if (contattoId && data.Email) {
    await emailService.createSafe({
      email_address: data.Email.toLowerCase(),
      Contatto_Relation: contattoId,
      Primary: true
    })
  }
  if (contattoId && data.IsReferente) {
    await contattiService.update(contattoId, { IsReferente: true })
  }
  return contattoId
}

export async function aggiornaContatto(id, data) {
  const newEmail = data.Email
  const contattoData = { ...data }
  delete contattoData.Email

  await contattiService.update(id, contattoData)

  if (newEmail !== undefined && newEmail) {
    const emailCheck = await contattiService.getByEmails([newEmail])
    const existingContatti = emailCheck.data.data || []
    const duplicateContatto = existingContatti.find(c => c.id_contatto !== id)
    if (duplicateContatto) {
      const err = new Error('Email duplicata')
      err.message = 'Email duplicata'
      throw err
    }
    const emailRes = await emailService.getRecordByContatto(id)
    const existing = emailRes.data.data?.[0]
    await (existing
      ? emailService.updateSafe(existing.id, { email_address: newEmail.toLowerCase() })
      : emailService.createSafe({
          email_address: newEmail.toLowerCase(),
          Contatto_Relation: id,
          Primary: true
        }))
  }
}

export async function creaFamiglia(data) {
  await gestioneService.createFamiglia({
    id_famiglia: `FAM_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    Nome_Famiglia: data.Nome_Famiglia,
    IBAN: data.IBAN || null,
    Intestatario_CC: data.Intestatario_CC || null
  })
}

export async function aggiornaFamiglia(id, data) {
  await gestioneService.updateFamiglia(id, data)
}

export async function assegnaAFamiglia(contattoId, famigliaId, ruolo) {
  if (ruolo === 'Volontario') {
    const result = await _findOrCreateUser(contattoId)
    if (result.error) {
      const err = new Error('Email mancante')
      err.message = 'Email mancante'
      throw err
    }
  }
  await gestioneService.assignToFamiglia({
    Contatto: contattoId,
    Famiglia: famigliaId,
    Ruolo_nella_Famiglia: ruolo || RUOLI_FAMIGLIA.VOLONTARIO
  })
  const flagPatch = {}
  if (ruolo === 'Volontario') flagPatch.IsVolontario = true
  else if (ruolo === 'Genitore') flagPatch.IsGenitore = true
  if (Object.keys(flagPatch).length > 0) {
    await contattiService.update(contattoId, flagPatch)
  }
}

export async function rimuoviDaFamiglia(fcId, contattoId, ruolo) {
  await gestioneService.removeFromFamiglia(fcId)
  if (contattoId) {
    const flagPatch = {}
    if (ruolo === 'Genitore') flagPatch.IsGenitore = false
    else if (ruolo === 'Referente') flagPatch.IsReferente = false
    if (Object.keys(flagPatch).length > 0) {
      await contattiService.update(contattoId, flagPatch)
    }
  }
}

export async function assegnaReferente(volontarioId, referenteId) {
  await referentiService.create(volontarioId, referenteId)
}

export async function rimuoviReferente(relationId) {
  await referentiService.remove(relationId)
}

export async function marcaReferente(contattoId) {
  const result = await _findOrCreateUser(contattoId)
  if (result.error) {
    const err = new Error('Email mancante')
    err.message = 'Email mancante'
    throw err
  }
  await contattiService.update(contattoId, { IsReferente: true })
}

export async function creaUtentePerVolontario(contattoId) {
  const result = await _findOrCreateUser(contattoId)
  if (result.error) {
    const err = new Error(result.error)
    err.message = result.error
    throw err
  }
  return result
}
