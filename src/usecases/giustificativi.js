import { contattiService } from 'src/services/contatti.service'
import { emailService } from 'src/services/email.service'
import { famiglieService } from 'src/services/famiglie.service'
import { filesService } from 'src/services/files.service'
import { giustificativiService } from 'src/services/giustificativi.service'
import { submitService } from 'src/services/submit.service'
import { verificaService } from 'src/services/verifica.service'
import { EVENTI_GIUSTIFICATIVO, giustificativoMachine } from 'src/state-machines/giustificativo'
import { EVENTI_SUBMISSION, submissionMachine } from 'src/state-machines/submission'
import { creaConStato, transita, TransizioneNonValidaError } from 'src/usecases/stato/transita'
import { FOLDERS, STATI_PROGETTO_OPERATIVI, STATO_GIUSTIFICATIVO, STATO_SUBMISSION } from 'src/utils/constants'
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
    // eslint-disable-next-line no-restricted-syntax -- `Rendicontazioni.Stato` non è un'entità a macchina
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
  const createRes = await creaConStato({
    machine: giustificativoMachine,
    stato: payload.stato || payload.Stato || STATO_GIUSTIFICATIVO.DRAFT,
    extra: {
      Descrizione: payload.Descrizione,
      Importo: payload.Importo,
      Data: payload.Data,
      NotaVolontario: payload.NotaVolontario || '',
      Progetto: payload.Progetto,
      Famiglia: payload.Famiglia,
      AnnoBando: payload.AnnoBando,
      Allegato: allegatoId,
      Rendicontazione: payload.Rendicontazione ?? null
    },
    scrivi: patch => giustificativiService.create(patch)
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
  return _creaGiustificativoRecord({ ...payload, Rendicontazione: rendicontazioneId }, _ctx)
}

/**
 * Submission pubblica (modulo libero, utente non loggato). NON crea un
 * giustificativo: accoda la richiesta in `InviiGiustificativiNoLogin` con stato
 * `inserito`. La materializzazione in giustificativo avviene alla
 * riconciliazione (manager). Nessuna guardia: la submission non ha un progetto.
 */
export async function creaSubmission(payload, _ctx = {}) {
  const res = await creaConStato({
    machine: submissionMachine,
    campo: 'stato',
    stato: STATO_SUBMISSION.INSERITO,
    extra: {
      ...payload,
      email: payload.email ? payload.email.toLowerCase() : payload.email,
      data_invio: new Date().toISOString()
    },
    scrivi: patch => submitService.createSubmission(patch)
  })
  return res.data.data
}

async function _statoCorrente(id) {
  const res = await giustificativiService.getById(id)
  return res.data.data?.Stato
}

export async function inviaGiustificativo({ id, progettoId }) {
  const statoCorrente = await _statoCorrente(id)
  let updateRes
  await transita({
    machine: giustificativoMachine,
    statoCorrente,
    evento: EVENTI_GIUSTIFICATIVO.INVIA,
    scrivi: async patch => {
      updateRes = await giustificativiService.update(id, patch)
    }
  })
  await syncProgettoAggregati(progettoId)
  return updateRes?.data?.data
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

/**
 * Evento di transizione per un cambio di `Stato` richiesto dall'UI. Oggi l'unico
 * target ammesso è `inviato` (send draft / ripristino da verificato|rifiutato).
 */
function _eventoPerStato(statoCorrente, target) {
  if (target !== STATO_GIUSTIFICATIVO.INVIATO) {
    throw new TransizioneNonValidaError(statoCorrente, `CAMBIO_STATO->${target}`, 'destinazione non gestita')
  }
  return statoCorrente === STATO_GIUSTIFICATIVO.DRAFT
    ? EVENTI_GIUSTIFICATIVO.INVIA
    : EVENTI_GIUSTIFICATIVO.RIPRISTINA_INVIATO
}

export async function aggiornaCampoGiustificativo({ id, field, value, progettoId }) {
  if (field !== 'Stato') {
    const res = await giustificativiService.update(id, { [field]: value })
    await syncProgettoAggregati(progettoId)
    return res.data.data
  }
  const statoCorrente = await _statoCorrente(id)
  let updateRes
  // Un cambio di stato scollega il giustificativo da un eventuale pagamento;
  // ricalcolaProposta lo ricollegherà se torna `verificato`.
  await transita({
    machine: giustificativoMachine,
    statoCorrente,
    evento: _eventoPerStato(statoCorrente, value),
    extra: { Pagamento: null },
    scrivi: async patch => {
      updateRes = await giustificativiService.update(id, patch)
    }
  })
  await syncProgettoAggregati(progettoId)
  return updateRes?.data?.data
}

export async function invalidaGiustificativo({ id, allegato, progettoId }) {
  if (allegato) {
    await markFileObsolete(allegato)
  }
  await giustificativiService.invalidate(id)
  await syncProgettoAggregati(progettoId)
}

export async function verificaGiustificativo({ id, progettoId }) {
  const statoCorrente = await _statoCorrente(id)
  await transita({
    machine: giustificativoMachine,
    statoCorrente,
    evento: EVENTI_GIUSTIFICATIVO.VERIFICA,
    extra: { DataVerifica: new Date().toISOString(), Pagamento: null },
    scrivi: patch => giustificativiService.update(id, patch)
  })
  await syncProgettoAggregati(progettoId)
}

export async function rifiutaGiustificativo({ id, nota, allegato, progettoId }) {
  if (allegato) {
    await markFileRejected(allegato).catch(() => {})
  }
  const statoCorrente = await _statoCorrente(id)
  await transita({
    machine: giustificativoMachine,
    statoCorrente,
    evento: EVENTI_GIUSTIFICATIVO.RIFIUTA,
    extra: { NotaRifiuto: nota, Pagamento: null },
    scrivi: patch => giustificativiService.update(id, patch)
  })
  await syncProgettoAggregati(progettoId)
}

async function _statoSubmission(id) {
  const res = await verificaService.getSubmissionById(id)
  return res.data.data?.stato
}

export async function scartaSubmission({ id, nota }) {
  const statoCorrente = await _statoSubmission(id)
  await transita({
    machine: submissionMachine,
    campo: 'stato',
    statoCorrente,
    evento: EVENTI_SUBMISSION.SCARTA,
    extra: { note_riconciliazione: nota },
    scrivi: patch => verificaService.updateSubmission(id, patch)
  })
}

export async function ripristinaSubmission({ id }) {
  const statoCorrente = await _statoSubmission(id)
  await transita({
    machine: submissionMachine,
    campo: 'stato',
    statoCorrente,
    evento: EVENTI_SUBMISSION.RIPRISTINA,
    extra: { note_riconciliazione: null },
    scrivi: patch => verificaService.updateSubmission(id, patch)
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
      stato: STATO_GIUSTIFICATIVO.INVIATO
    },
    { origine: 'modulo_libero' }
  )
  const giustificativoId = created.id

  const statoCorrente = await _statoSubmission(submissionId)
  await transita({
    machine: submissionMachine,
    campo: 'stato',
    statoCorrente,
    evento: EVENTI_SUBMISSION.RICONCILIA,
    extra: {
      famiglia_riconciliata: famigliaId,
      progetto_riconciliato: progettoId,
      giustificativo_creato: giustificativoId,
      note_riconciliazione: note || null
    },
    scrivi: patch => verificaService.updateSubmission(submissionId, patch)
  })

  return giustificativoId
}
