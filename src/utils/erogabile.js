/**
 * Calcolo puro dell'importo erogabile e del residuo da coprire per un progetto.
 *
 * Fonte unica della formula usata da: stato riga (Verifica), ricalcolo proposta
 * (pagamenti) e ricalcolo batch (pagamenti). Evita che le tre copie divergano
 * (tolleranze, cap sull'allocato, percentuali).
 */

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
  const allocatoNum = Number.parseFloat(allocato) || 0
  const verificatoNum = Number.parseFloat(totaleVerificato) || 0
  const pct = Math.min(100, Math.max(0, Number.parseFloat(percentualeRimborso) || 80)) / 100
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
  const e = Number.parseFloat(erogabile) || 0
  const c = Number.parseFloat(importoGiaCoperto) || 0
  return Math.round((e - c) * 100) / 100
}
