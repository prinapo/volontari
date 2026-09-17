import { verificaService } from 'src/services/verifica.service'
import { calcolaAggregatiProgetto } from 'src/utils/statoProgetto'

/**
 * Ricalcola e persiste gli aggregati derivati di un progetto a partire da dati
 * FRESCHI (mai da stato UI). È l'invariante condiviso: ogni mutazione di
 * giustificativo termina qui. Idempotente (ricalcolo puro).
 *
 * @param {string|number} progettoId
 * @returns {Promise<{TotaleGiustificativi:number, TotaleImporto:number, StatoRendicontazione:string, StatoProgetto:string}|null>}
 *          Il payload scritto, oppure null se il progetto non esiste o in errore
 *          (best-effort: non deve mai rompere l'azione principale che lo ha innescato).
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
    const payload = calcolaAggregatiProgetto(progetto, giustificativi)
    await verificaService.updateProgetto(progettoId, payload)
    return payload
  } catch (error) {
    console.warn(`[usecases] syncProgettoAggregati fallito per progetto ${progettoId}`, error)
    return null
  }
}
