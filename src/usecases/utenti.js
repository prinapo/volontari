import { adminService } from 'src/services/admin.service'
import { contattiService } from 'src/services/contatti.service'
import { emailService } from 'src/services/email.service'
import { usersService } from 'src/services/users.service'

function generatePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, v => chars[v % chars.length]).join('')
}

export async function disabilitaUtente(userId) {
  await usersService.update(userId, { status: 'suspended' })
}

export async function abilitaUtente(userId) {
  await usersService.update(userId, { status: 'active' })
}

export async function creaUtente(email, role, firstName, lastName, contattoTrovato = null) {
  if (!contattoTrovato) {
    const contattoRes = await contattiService.create({
      Nome: firstName || '',
      Cognome: lastName || ''
    })
    const contattoId = contattoRes.data.data?.id_contatto
    await emailService.createSafe({
      email_address: email.toLowerCase(),
      Contatto_Relation: contattoId,
      Primary: true
    })
  }

  const pwd = generatePassword()
  await usersService.create({
    email,
    password: pwd,
    role,
    first_name: firstName || contattoTrovato?.Nome || '',
    last_name: lastName || contattoTrovato?.Cognome || ''
  })
  return pwd
}

export async function aggiornaRuolo(userId, roleId) {
  await usersService.update(userId, { role: roleId })
}

export async function resetPasswordUtente(userId, password) {
  await usersService.update(userId, { password })
}

export async function inviaEmailCustom(to, subject, body) {
  const resolvedBody = body.replaceAll('{email}', to).replaceAll('{link_login}', globalThis.location.origin + '/login')
  await adminService.sendEmail({ to, subject, body: resolvedBody })
}
