import { contattiService } from 'src/services/contatti.service'
import { emailService } from 'src/services/email.service'
import { famiglieService } from 'src/services/famiglie.service'
import { filesService } from 'src/services/files.service'
import { giustificativiService } from 'src/services/giustificativi.service'
import { submitService } from 'src/services/submit.service'
import { verificaService } from 'src/services/verifica.service'
import { FOLDERS, STATI_PROGETTO_OPERATIVI, STATO_SUBMISSION } from 'src/utils/constants'
import { markFileObsolete, markFileRejected, uploadAndPrefixFile } from 'src/utils/file-naming'
import { syncProgettoAggregati } from './progetti'

/**
 * Guardia comune a tutti gli ingressi di "crea giustificativo": il progetto
 * (stato normalizzato, `aperto`→`accettato`) deve essere operativo.
 */
async function guardiaProgettoOperativo(progettoId) {
  const progRes = await verificaService.getProgettoById(progettoId)
  const stato = progRes.data.data?.StatoProgetto
  const statNorm = stato === 'aperto' ? 'accettato' : stato
  if (!STATI_PROGETTO_OPERATIVI.includes(statNorm)) {
    throw new Error('Progetto non operativo')
  }
}

async function _ensureRendicontazione({ Famiglia, Progetto, AnnoBando }) {
  if (!Famiglia || !Progetto) return null
  const existingRes = await giustificativiService.findByProject({
    famigliaId: Famiglia,
    progettoId: Progetto
  })
  const existing = existingRes.data.data?.[0]
  if (existing?.id) return existing.id
  const createRes = await giustificativiService.createRendicontazione({
    Famiglia,
    Progetto,
    AnnoBando: AnnoBando || null,
    Stato: 'ricevuta',
    Data_Ricezione: new Date().toISOString()
  })
  return createRes.data.data?.id || null
}

/**
 * PRIMITIVO UNICO di scrittura di un giustificativo, condiviso da tutti gli
 * ingressi (volontario, verificatore, riconciliazione). Applica la guardia
 * "progetto operativo", gestisce l'eventuale nuovo file (o usa un allegato già
 * caricato) e termina SEMPRE con `syncProgettoAggregati`.
 *
 * @param {Object} payload - { Progetto, Famiglia, Descrizione, Importo, Data, Stato, NotaVolontario, AnnoBando, Rendicontazione } + (file | Allegato)
 * @param {Object} _ctx - { origine } per audit/permessi (riservato: non altera la logica)
 * @returns {Promise<Object>} il giustificativo creato
 */
async function _creaGiustificativoRecord(payload, _ctx = {}) {
  await guardiaProgettoOperativo(payload.Progetto)
  let allegatoId = payload.Allegato ?? null
  if (payload.file) {
    allegatoId = await uploadAndPrefixFile(payload.file, payload.Famiglia, FOLDERS.GIUSTIFICATIVI)
  }
  const createRes = await giustificativiService.create({
    Descrizione: payload.Descrizione,
    Importo: payload.Importo,
    Data: payload.Data,
    Stato: payload.Stato || 'draft',
    NotaVolontario: payload.NotaVolontario || '',
    Progetto: payload.Progetto,
    Famiglia: payload.Famiglia,
    AnnoBando: payload.AnnoBando,
    Allegato: allegatoId,
    Rendicontazione: payload.Rendicontazione ?? null
  })
  const created = createRes.data.data
  if (!created?.id) {
    throw new Error('Creazione giustificativo fallita')
  }
  await syncProgettoAggregati(payload.Progetto)
  return created
}

/**
 * Crea un giustificativo dal flusso volontario/verificatore. UNICO entry point
 * per quei due ingressi. Garantisce la rendicontazione e delega al primitivo.
 *
 * @param {Object} payload - { Progetto, Famiglia, Descrizione, Importo, Data, Stato, NotaVolontario, AnnoBando, file }
 * @param {Object} _ctx - { origine } per audit/permessi
 * @returns {Promise<Object>} il giustificativo creato
 */
export async function creaGiustificativo(payload, _ctx = {}) {
  const rendicontazioneId = await _ensureRendicontazione(payload)
  return _creaGiustificativoRecord(
    { ...payload, Stato: payload.Stato || 'draft', Rendicontazione: rendicontazioneId },
    _ctx
  )
}

/**
 * Submission pubblica (modulo libero, utente non loggato). NON crea un
 * giustificativo: accoda la richiesta in `InviiGiustificativiNoLogin` con stato
 * `in_attesa`. La materializzazione in giustificativo avviene alla
 * riconciliazione (manager). Nessuna guardia: la submission non ha un progetto.
 */
export async function creaSubmission(payload, _ctx = {}) {
  const res = await submitService.createSubmission({
    ...payload,
    email: payload.email ? payload.email.toLowerCase() : payload.email,
    stato: STATO_SUBMISSION.INSERITO,
    data_invio: new Date().toISOString()
  })
  return res.data.data
}

export async function inviaGiustificativo({ id, progettoId }) {
  const res = await giustificativiService.submit(id)
  await syncProgettoAggregati(progettoId)
  return res.data.data
}

export async function aggiornaGiustificativo({ id, data, file, allegatoAttuale, famigliaId, progettoId }) {
  if (file) {
    if (allegatoAttuale) {
      await markFileObsolete(allegatoAttuale)
    }
    data.Allegato = await uploadAndPrefixFile(file, famigliaId, FOLDERS.GIUSTIFICATIVI)
  }
  const res = await giustificativiService.update(id, data)
  await syncProgettoAggregati(progettoId)
  return res.data.data
}

export async function aggiornaCampoGiustificativo({ id, field, value, progettoId }) {
  const patch = { [field]: value }
  // Un cambio di stato scollega il giustificativo da un eventuale pagamento;
  // ricalcolaProposta lo ricollegherà se torna `verificato`.
  if (field === 'Stato') patch.Pagamento = null
  const res = await giustificativiService.update(id, patch)
  await syncProgettoAggregati(progettoId)
  return res.data.data
}

export async function invalidaGiustificativo({ id, allegato, progettoId }) {
  if (allegato) {
    await markFileObsolete(allegato)
  }
  await giustificativiService.invalidate(id)
  await syncProgettoAggregati(progettoId)
}

export async function verificaGiustificativo({ id, progettoId }) {
  await giustificativiService.verify(id)
  await syncProgettoAggregati(progettoId)
}

export async function rifiutaGiustificativo({ id, nota, allegato, progettoId }) {
  if (allegato) {
    await markFileRejected(allegato).catch(() => {})
  }
  await giustificativiService.reject(id, nota)
  await syncProgettoAggregati(progettoId)
}

export async function scartaSubmission({ id, nota }) {
  await verificaService.updateSubmission(id, {
    stato: STATO_SUBMISSION.SCARTATO,
    note_riconciliazione: nota
  })
}

export async function ripristinaSubmission({ id }) {
  await verificaService.updateSubmission(id, {
    stato: STATO_SUBMISSION.INSERITO,
    note_riconciliazione: null
  })
}

// --- Riconciliazione (modulo libero) ---

function _patchContattoFromCopied(contattoId, copiedFields, rightValues) {
  const contattoPatch = {}
  if (copiedFields.includes('Nome')) contattoPatch.Nome = rightValues.Nome
  if (copiedFields.includes('Cognome')) contattoPatch.Cognome = rightValues.Cognome
  if (copiedFields.includes('Telefono')) contattoPatch.Numero_di_cellulare = rightValues.Telefono
  return Object.keys(contattoPatch).length > 0 ? contattiService.update(contattoId, contattoPatch) : Promise.resolve()
}

function _patchFamigliaFromCopied(famigliaId, copiedFields, rightValues) {
  const famPatch = {}
  if (copiedFields.includes('IBAN')) famPatch.IBAN = rightValues.IBAN
  if (copiedFields.includes('Intestatario')) famPatch.Intestatario_CC = rightValues.Intestatario
  return Object.keys(famPatch).length > 0 ? famiglieService.update(famigliaId, famPatch) : Promise.resolve()
}

async function _handleAllegatoRiconciliazione(allegato, famigliaId) {
  if (!allegato) return
  const fileId = typeof allegato === 'object' ? allegato?.id : allegato
  if (!fileId) return
  await filesService.updateFolder(fileId, FOLDERS.GIUSTIFICATIVI).catch(() => {})
  const famRes = await famiglieService.getFamiglieBatch([famigliaId])
  const nomeFamiglia = famRes.data.data?.[0]?.Nome_Famiglia || ''
  if (!nomeFamiglia) return
  const fileRes = await filesService.getFile(fileId)
  const origName = fileRes.data.data?.filename_download || 'file'
  await filesService.renameFile(fileId, `${nomeFamiglia}_${origName}`)
}

/**
 * Riconciliazione di una submission del modulo libero: copia campi eventuali,
 * gestisce l'allegato, crea il giustificativo (via primitivo, con guardia),
 * marca la submission come riconciliata e sincronizza gli aggregati.
 */
export async function riconciliaSubmission({
  submissionId,
  contattoId,
  emailRecordId,
  famigliaId,
  progettoId,
  note,
  descrizione,
  importo,
  data,
  allegato,
  rightValues,
  copiedFields
}) {
  if (contattoId && copiedFields?.length > 0) {
    await _patchContattoFromCopied(contattoId, copiedFields, rightValues)
    if (copiedFields.includes('Email') && emailRecordId) {
      await emailService.updateSafe(emailRecordId, { email_address: rightValues.Email.toLowerCase() })
    }
  }

  if (famigliaId && copiedFields?.length > 0) {
    await _patchFamigliaFromCopied(famigliaId, copiedFields, rightValues)
  }

  await _handleAllegatoRiconciliazione(allegato, famigliaId)

  const progRes = await verificaService.findProgettoByFamiglia(famigliaId)
  const progetto = (progRes.data.data || []).find(p => p.id_progetto === progettoId)
  const created = await _creaGiustificativoRecord(
    {
      Descrizione: descrizione,
      Importo: importo,
      Data: data,
      Allegato: allegato,
      Progetto: progettoId,
      Famiglia: famigliaId,
      AnnoBando: progetto?.AnnoBando,
      Stato: 'inviato'
    },
    { origine: 'modulo_libero' }
  )
  const giustificativoId = created.id

  await verificaService.updateSubmission(submissionId, {
    stato: STATO_SUBMISSION.INVIATO,
    famiglia_riconciliata: famigliaId,
    progetto_riconciliato: progettoId,
    giustificativo_creato: giustificativoId,
    note_riconciliazione: note || null
  })

  return giustificativoId
}
