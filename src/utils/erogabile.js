/**
 * Calcolo puro dell'importo erogabile e del residuo da coprire per un progetto.
 *
 * Fonte unica della formula usata da: stato riga (Verifica), ricalcolo proposta
 * (pagamenti) e ricalcolo batch (pagamenti). Evita che le tre copie divergano
 * (tolleranze, cap sull'allocato, percentuali).
 */
import { parseNum } from './number'

export const PERCENTUALE_RIMBORSO_DEFAULT = 80

/**
 * Normalizza la percentuale di rimborso del progetto (`MassimaPercentualeErogabile`).
 *
 * `null`/`undefined`/stringa vuota → default 80. Un valore numerico valido viene
 * limitato a 0–100 (0 è un valore legittimo e NON deve diventare 80).
 *
 * @param {number|string|null|undefined} percentualeRimborso
 * @returns {number} percentuale tra 0 e 100
 */
export function normalizzaPercentuale(percentualeRimborso) {
  if (percentualeRimborso === null || percentualeRimborso === undefined || percentualeRimborso === '') {
    return PERCENTUALE_RIMBORSO_DEFAULT
  }
  const pct = Number.parseFloat(percentualeRimborso)
  if (!Number.isFinite(pct)) return PERCENTUALE_RIMBORSO_DEFAULT
  return Math.min(100, Math.max(0, pct))
}

/**
 * Importo erogabile: il minore tra il verificato al netto della percentuale di
 * rimborso e l'allocato (l'erogabile non supera mai l'allocato).
 *
 * @param {Object} input
 * @param {number|string} [input.allocato=0]
 * @param {number|string} [input.totaleVerificato=0]
 * @param {number|string} [input.percentualeRimborso=80]
 * @returns {number}
 */
export function calcolaErogabile({ allocato = 0, totaleVerificato = 0, percentualeRimborso = 80 } = {}) {
  const allocatoNum = parseNum(allocato)
  const verificatoNum = parseNum(totaleVerificato)
  const pct = normalizzaPercentuale(percentualeRimborso) / 100
  return Math.min(verificatoNum * pct, allocatoNum)
}

/**
 * Residuo ancora da coprire (arrotondato ai centesimi), dato l'erogabile e
 * quanto è già coperto (pagato + in pagamento, oppure totale storico).
 *
 * @param {number} erogabile
 * @param {number} importoGiaCoperto
 * @returns {number}
 */
export function residuoDaCoprire(erogabile, importoGiaCoperto) {
  const e = parseNum(erogabile)
  const c = parseNum(importoGiaCoperto)
  return Math.round((e - c) * 100) / 100
}
