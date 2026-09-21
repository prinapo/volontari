import { progettiService } from 'src/services/progetti.service'
import { verificaService } from 'src/services/verifica.service'
import { EVENTI_PROGETTO, eventoRicalcoloProgetto, progettoMachine } from 'src/state-machines/progetto'
import { creaConStato, transita, TransizioneNonValidaError } from 'src/usecases/stato/transita'
import { STATO_PROGETTO } from 'src/utils/constants'
import { calcolaAggregatiProgetto, statoProgettoEffettivo } from 'src/utils/statoProgetto'

/**
 * Ricalcola e persiste gli aggregati derivati di un progetto a partire da dati
 * FRESCHI (mai da stato UI). È l'invariante condiviso: ogni mutazione di
 * giustificativo termina qui. Idempotente (ricalcolo puro).
 *
 * Lo stato progetto passa dalla macchina (`transita`); gli altri derivati sono
 * scritti nella stessa patch.
 *
 * @param {string|number} progettoId
 * @returns {Promise<Object|null>} gli aggregati calcolati, o null se il progetto
 *          non esiste / in errore (best-effort: non rompe l'azione principale).
 */
export async function syncProgettoAggregati(progettoId) {
  if (!progettoId) return null
  try {
    const [progRes, giustRes] = await Promise.all([
      verificaService.getProgettoById(progettoId),
      verificaService.getGiustificativiByProgetto(progettoId)
    ])
    const progetto = progRes.data.data
    if (!progetto) return null
    const giustificativi = giustRes.data.data || []
    const aggregati = calcolaAggregatiProgetto(progetto, giustificativi)
    const { statoProgetto, ...derivati } = aggregati
    const statoRaw = progetto.StatoProgetto
    const statoCorrente = statoProgettoEffettivo(statoRaw)
    const scrivi = patch => verificaService.updateProgetto(progettoId, patch)

    if (statoRaw === statoProgetto) {
      await verificaService.updateProgetto(progettoId, derivati)
    } else {
      const evento = eventoRicalcoloProgetto(statoProgetto)
      if (evento) {
        await transita({
          machine: progettoMachine,
          campo: 'StatoProgetto',
          statoCorrente,
          evento,
          extra: derivati,
          scrivi
        })
      } else {
        await verificaService.updateProgetto(progettoId, derivati)
      }
    }
    return aggregati
  } catch (error) {
    console.warn(`[usecases] syncProgettoAggregati fallito per progetto ${progettoId}`, error)
    return null
  }
}

/**
 * Crea un progetto nuovo. Lo stato iniziale è dichiarato dalla macchina
 * (`accettato`, equivalente operativo del legacy `aperto`).
 */
export async function creaProgetto(payload) {
  return creaConStato({
    machine: progettoMachine,
    campo: 'StatoProgetto',
    stato: STATO_PROGETTO.ACCETTATO,
    extra: payload,
    scrivi: patch => progettiService.createProgetto(patch)
  })
}

/** Evento della macchina per l'avanzamento di uno step nella fase manuale. */
const EVENTO_AVANZAMENTO = {
  [STATO_PROGETTO.PROPOSTO]: EVENTI_PROGETTO.VALIDA,
  [STATO_PROGETTO.VALIDATO]: EVENTI_PROGETTO.APPROVA,
  [STATO_PROGETTO.APPROVATO]: EVENTI_PROGETTO.ACCETTA
}

/**
 * Avanza di uno stato la fase manuale del progetto:
 * `proposto → validato → approvato → accettato`. Solo in avanti e sequenziale;
 * fuori dalla fase manuale lancia `TransizioneNonValidaError`.
 */
export async function avanzaStatoProgetto(progettoId) {
  const progRes = await verificaService.getProgettoById(progettoId)
  const progetto = progRes.data.data
  if (!progetto) throw new Error('Progetto non trovato')
  const statoCorrente = statoProgettoEffettivo(progetto.StatoProgetto)
  const evento = EVENTO_AVANZAMENTO[statoCorrente]
  if (!evento) {
    throw new TransizioneNonValidaError(statoCorrente, 'AVANZA', 'progetto non in fase manuale')
  }
  return transita({
    machine: progettoMachine,
    campo: 'StatoProgetto',
    statoCorrente,
    evento,
    scrivi: patch => progettiService.updateStats(progettoId, patch)
  })
}
