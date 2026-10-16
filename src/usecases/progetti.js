import { pagamentiService } from 'src/services/pagamenti.service'
import { progettiService } from 'src/services/progetti.service'
import { verificaService } from 'src/services/verifica.service'
import { EVENTI_PROGETTO, eventoRicalcoloProgetto, progettoMachine } from 'src/state-machines/progetto'
import { creaConStato, transita, TransizioneNonValidaError } from 'src/usecases/stato/transita'
import { STATO_PROGETTO } from 'src/utils/constants'
import { calcolaDerivatiProgetto, statoProgettoEffettivo } from 'src/utils/statoProgetto'

/**
 * Invariante delle mutazioni di giustificativo: ricalcola gli aggregati del
 * progetto da dati FRESCHI (progetto + giustificativi + pagamenti, mai stato UI)
 * e persiste i campi derivati.
 *
 * Calcolo UNICO (`calcolaDerivatiProgetto`), condiviso con `ricalcolaTotaliProgetto`.
 * Qui lo scope di scrittura è quello consentito al volontario (policy Directus
 * field-scoped): `TotaleGiustificativi`, `TotaleImporto`, `StatoRendicontazione`,
 * `StatoProgetto`. I campi economici (`TotaleVerificato/Pagato/…`) restano di
 * competenza della via manager (`ricalcolaTotaliProgetto`).
 *
 * Lo stato progetto passa dalla macchina (`transita`). Best-effort: non lancia.
 *
 * @param {string|number} progettoId
 * @returns {Promise<Object|null>} i derivati calcolati, o null se il progetto
 *          non esiste / in errore (best-effort: non rompe l'azione principale).
 */
export async function syncProgettoAggregati(progettoId) {
  if (!progettoId) return null
  try {
    const [progRes, giustRes, pagRes] = await Promise.all([
      verificaService.getProgettoById(progettoId),
      verificaService.getGiustificativiByProgetto(progettoId),
      pagamentiService.getPagamenti({ 'filter[Progetto][_eq]': progettoId, limit: -1 })
    ])
    const progetto = progRes.data.data
    if (!progetto) return null
    const giustificativi = giustRes.data.data || []
    const pagamenti = pagRes.data.data || []
    const derivati = calcolaDerivatiProgetto({ progetto, giustificativi, pagamenti })

    // Scope volontario: esclude i campi economici (competenza manager).
    const volontario = {
      TotaleGiustificativi: derivati.TotaleGiustificativi,
      TotaleImporto: derivati.TotaleImporto,
      StatoRendicontazione: derivati.StatoRendicontazione
    }
    const statoProgetto = derivati.statoProgetto
    const statoRaw = progetto.StatoProgetto
    const statoCorrente = statoProgettoEffettivo(statoRaw)
    const scrivi = patch => verificaService.updateProgetto(progettoId, patch)

    if (statoRaw === statoProgetto) {
      await scrivi(volontario)
    } else {
      const evento = eventoRicalcoloProgetto(statoProgetto)
      if (evento) {
        await transita({
          machine: progettoMachine,
          campo: 'StatoProgetto',
          statoCorrente,
          evento,
          extra: volontario,
          scrivi
        })
      } else {
        await scrivi(volontario)
      }
    }
    return derivati
  } catch (error) {
    if (error?.name === 'TransizioneNonValidaError') {
      // Stato/anomalia non dichiarata dalla macchina: dato da correggere, non da
      // ignorare silenziosamente.
      console.error(
        `[usecases] syncProgettoAggregati: transizione non valida per progetto ${progettoId}`,
        error.message
      )
    } else {
      console.warn(`[usecases] syncProgettoAggregati fallito per progetto ${progettoId}`, error)
    }
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

/**
Evento della macchina per l'avanzamento di uno step nella fase manuale.
*/
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
