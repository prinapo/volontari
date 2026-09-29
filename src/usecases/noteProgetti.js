import { noteProgettiService } from 'src/services/note-progetti.service'

/**
 * Crea una nota su un progetto. Append-only: autore id e data sono compilati da
 * Directus (campi di sistema `user_created`/`date_created`); il nome visualizzato
 * (`AutoreNome`) è il nome/cognome dell'utente loggato (tutti gli autori sono loggati).
 *
 * @param {Object} payload - { Progetto, Testo, AutoreNome }
 * @param {Object} _ctx - { origine } per audit/permessi (`volontario`/`verificatore`); non altera la logica
 * @returns {Promise<Object>} la nota creata
 */
export async function creaNota({ Progetto, Testo, AutoreNome }, _ctx = {}) {
  if (!Progetto) {
    throw new Error('Progetto mancante')
  }
  if (!Testo || !String(Testo).trim()) {
    throw new Error('Testo nota mancante')
  }
  const res = await noteProgettiService.create({
    Progetto,
    Testo: String(Testo).trim(),
    AutoreNome: AutoreNome || null
  })
  const created = res.data.data
  if (!created?.id) {
    throw new Error('Creazione nota fallita')
  }
  return created
}
