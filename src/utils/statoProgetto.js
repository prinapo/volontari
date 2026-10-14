/**
 * Calcolo dello stato del progetto (StatoProgetto) a partire dai dati grezzi.
 *
 * Il ciclo di vita ha una parte manuale (proposto → validato → approvato →
 * accettato) e una automatica (in_rendicontazione → chiuso | rimborso_parziale).
 *
 * Questa funzione è PURO lato codice (pattern identico a StatoRendicontazione):
 * viene usata per la scrittura in DB dopo le operazioni e dal tool admin
 * che calcola le trasformazioni di stato.
 *
 * Legacy: il valore 'aperto' e NULL vengono tradotti in 'accettato' come base.
 * Il rimborso_parziale è automatico: se pagato>0 ma < allocato, il progetto
 * assume questo stato indipendentemente dallo stato precedente.
 */
import { progettoMachine } from 'src/state-machines/progetto'
import {
  STATI_GIUSTIFICATIVO_CONTABILI,
  STATI_GIUSTIFICATIVO_VALIDI,
  STATO_GIUSTIFICATIVO,
  STATO_PAGAMENTO,
  STATO_PROGETTO
} from './constants'
import { parseNum } from './number'
import { calcolaStatoRendicontazione } from './rendicontazione'

// Un giustificativo "avvia" la rendicontazione se ha uno stato che la
// attesta: inviato/verificato/in_pagamento/pagato oppure bozza. Con una bozza
// la famiglia ha iniziato a compilare (StatoRendicontazione='bozza'): il
// progetto passa a `in_rendicontazione` così il verificatore la vede.
// Le bozze non contano tra gli importi ai fini di Verifica (`totaleRendicontato`).
const STATI_AVVIO = new Set([...STATI_GIUSTIFICATIVO_VALIDI, STATO_GIUSTIFICATIVO.DRAFT])
const STATI_CONTABILI = new Set(STATI_GIUSTIFICATIVO_CONTABILI)

function hasValidGiustificativi(giustificativi = []) {
  return giustificativi.some(g => !g.Invalidato && STATI_AVVIO.has(String(g.Stato || '').toLowerCase()))
}

/**
 * Stato effettivo mostrato/atteso a partire dal valore grezzo salvato in DB.
 * Legacy: 'aperto' e NULL/NIL equivalgono alla base 'accettato'.
 */
export function statoProgettoEffettivo(statoProgetto) {
  return !statoProgetto || statoProgetto === STATO_PROGETTO.APERTO ? STATO_PROGETTO.ACCETTATO : statoProgetto
}

/**
 * True se `stato` è uno stato dichiarato nella macchina Progetto (fonte di
 * verità). Un valore sconosciuto è un dato anomalo da segnalare, non da
 * normalizzare in silenzio.
 */
export function isStatoProgettoValido(stato) {
  return Boolean(stato && progettoMachine.config.states?.[stato])
}

/**
 * Calcola lo stato progetto atteso.
 *
 * Ordine regole:
 * 1. NULL/aperto → accettato (base)
 * 2. Manuale (proposto/validato/approvato) → resta invariata
 * 3. Pagamento completo (pagato>=allocato>0) → chiuso
 * 4. Già chiuso → resta chiuso (sticky: una chiusura manuale parziale non
 *    retrocede a rimborso_parziale)
 * 5. Pagamento parziale (0 < pagato < allocato) → rimborso_parziale (operativo)
 * 6. Ha giustificativi avviati (inviato/contabile oppure una bozza) → in_rendicontazione
 * 7. Altrimenti → accettato
 *
 * @param {Object} input
 * @param {string} [input.statoProgetto] - Stato attuale salvato in DB
 * @param {number} [input.allocato] - Importo allocato
 * @param {number} [input.rimborsato] - Totale pagato (pagamenti 'pagato')
 * @param {Array}  [input.giustificativi] - Giustificativi del progetto
 * @returns {string} Valore di STATO_PROGETTO
 */
export function calcolaStatoProgetto({ statoProgetto, allocato = 0, rimborsato = 0, giustificativi = [] } = {}) {
  const allocatoNum = parseNum(allocato)
  const rimborsatoNum = parseNum(rimborsato)

  // 1. Legacy 'aperto' e assenza valore → 'accettato'
  const stato = !statoProgetto || statoProgetto === STATO_PROGETTO.APERTO ? STATO_PROGETTO.ACCETTATO : statoProgetto

  // 2. Fase manuale (proposto/validato/approvato): resta invariata
  if (stato === STATO_PROGETTO.PROPOSTO || stato === STATO_PROGETTO.VALIDATO || stato === STATO_PROGETTO.APPROVATO) {
    return stato
  }

  // 3. Pagamento completo: chiuso (anche rimborso_parziale che completa)
  if (allocatoNum > 0 && rimborsatoNum >= allocatoNum) {
    return STATO_PROGETTO.CHIUSO
  }

  // 4. Già chiuso: resta chiuso (sticky). Una chiusura manuale con
  //    pagato < allocato non deve retrocedere a rimborso_parziale.
  if (stato === STATO_PROGETTO.CHIUSO) {
    return STATO_PROGETTO.CHIUSO
  }

  // 5. Pagamento parziale: rimborso_parziale (automatico, progetto ancora operativo)
  if (rimborsatoNum > 0 && rimborsatoNum < allocatoNum) {
    return STATO_PROGETTO.RIMBORSO_PARZIALE
  }

  // 6. Ha giustificativi avviati (incluse le bozze) → in_rendicontazione
  if (hasValidGiustificativi(giustificativi)) {
    return STATO_PROGETTO.IN_RENDICONTAZIONE
  }

  // 7. Default: accettato
  return STATO_PROGETTO.ACCETTATO
}

/**
 * Confronta lo stato salvato in DB con quello calcolato e restituisce l'elenco
 * dei progetti disallineati. Sola lettura: non scrive nulla.
 *
 * Lo stato DB è normalizzato con statoProgettoEffettivo (legacy 'aperto'/NULL
 * → 'accettato'), così il confronto riflette lo stato mostrato all'utente.
 *
 * @param {Array} rows - Righe Verifica (idProgetto, beneficiario, statoProgetto,
 *                       allocato, totalePagato, giustificativi)
 * @returns {Array<{idProgetto, beneficiario, statoDB, statoCalcolato}>}
 */
export function calcolaDisallineati(rows = []) {
  const disallineati = []
  for (const row of rows) {
    const statoDB = statoProgettoEffettivo(row.statoProgetto)
    const statoCalcolato = calcolaStatoProgetto({
      statoProgetto: row.statoProgetto,
      allocato: row.allocato,
      rimborsato: row.totalePagato,
      giustificativi: row.giustificativi
    })
    if (statoCalcolato !== statoDB) {
      disallineati.push({
        idProgetto: row.idProgetto,
        beneficiario: row.beneficiario,
        statoDB,
        statoCalcolato
      })
    }
  }
  return disallineati
}

/**
 * Computazione UNICA dei campi derivati del progetto a partire da dati grezzi
 * (progetto + giustificativi + pagamenti). È la fonte condivisa da
 * `syncProgettoAggregati` e `ricalcolaTotaliProgetto`: entrambi ricalcolano gli
 * stessi valori da dati freschi e poi scrivono solo i campi consentiti dai
 * permessi (volontario vs manager).
 *
 * @param {Object} input
 * @param {Object} input.progetto - Progetto con StatoProgetto, Allocato
 * @param {Array}  input.giustificativi - Giustificativi del progetto
 * @param {Array}  input.pagamenti - Pagamenti del progetto (proposto/in_pagamento/pagato)
 * @returns {{TotaleGiustificativi, TotaleImporto, TotaleVerificato, TotaleProposto,
 *            TotaleInPagamento, TotalePagato, ResiduoAllocato, StatoRendicontazione, statoProgetto}}
 */
export function calcolaDerivatiProgetto({ progetto = {}, giustificativi = [], pagamenti = [] } = {}) {
  const allocato = parseNum(progetto.Allocato)
  const validi = giustificativi.filter(g => !g.Invalidato)
  const totaleImporto = validi.reduce((sum, g) => sum + parseNum(g.Importo), 0)
  const totaleVerificato = giustificativi
    .filter(g => !g.Invalidato && STATI_CONTABILI.has(String(g.Stato || '').toLowerCase()))
    .reduce((sum, g) => sum + parseNum(g.Importo), 0)

  const proposto = pagamenti.find(p => p.Stato === STATO_PAGAMENTO.PROPOSTO)
  const totaleProposto = proposto ? parseNum(proposto.Importo) : 0
  const inPagamento = pagamenti
    .filter(p => p.Stato === STATO_PAGAMENTO.IN_PAGAMENTO)
    .reduce((sum, p) => sum + parseNum(p.Importo), 0)
  const pagato = pagamenti
    .filter(p => p.Stato === STATO_PAGAMENTO.PAGATO)
    .reduce((sum, p) => sum + parseNum(p.Importo), 0)
  const residuo = allocato - (totaleProposto + inPagamento + pagato)

  return {
    TotaleGiustificativi: validi.length,
    TotaleImporto: totaleImporto,
    TotaleVerificato: totaleVerificato,
    TotaleProposto: totaleProposto,
    TotaleInPagamento: inPagamento,
    TotalePagato: pagato,
    ResiduoAllocato: Math.max(0, residuo),
    StatoRendicontazione: calcolaStatoRendicontazione(giustificativi),
    statoProgetto: calcolaStatoProgetto({
      statoProgetto: progetto.StatoProgetto,
      allocato,
      rimborsato: pagato,
      giustificativi
    })
  }
}
