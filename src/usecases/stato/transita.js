/**
 * Primitiva UNICA di cambio stato.
 *
 * È l'unico punto del codice autorizzato a costruire il payload di stato e a
 * invocare la scrittura: le macchine in `src/state-machines/` validano la
 * transizione, qui si esegue l'I/O tramite il callback `scrivi`.
 *
 * La macchina NON fa I/O e NON persiste: la fonte di verità resta Directus.
 * Le funzioni `calcolaStatoSuccessivo`/`eventoDichiarato` sono pure e
 * testabili senza alcuna chiamata di rete.
 */

export class TransizioneNonValidaError extends Error {
  constructor(statoCorrente, evento, dettaglio = '') {
    const suffisso = dettaglio ? ` (${dettaglio})` : ''
    super(`Transizione non valida: "${statoCorrente}" -[${evento}]->${suffisso}`)
    this.name = 'TransizioneNonValidaError'
    this.statoCorrente = statoCorrente
    this.evento = evento
  }
}

/**
 * True se `evento` è dichiarato per lo stato corrente nella macchina.
 *
 * @param {Object} machine - Macchina @xstate/fsm
 * @param {string} statoCorrente
 * @param {string} evento
 * @returns {boolean}
 */
export function eventoDichiarato(machine, statoCorrente, evento) {
  return Boolean(machine?.config?.states?.[statoCorrente]?.on?.[evento])
}

/**
 * Calcola lo stato successivo validando la transizione. Puro: nessun I/O.
 *
 * @throws {TransizioneNonValidaError} se lo stato corrente è assente o
 *         l'evento non è dichiarato per quello stato.
 * @returns {string} lo stato di destinazione
 */
export function calcolaStatoSuccessivo(machine, statoCorrente, evento, ctx = {}) {
  if (statoCorrente == null || statoCorrente === '') {
    throw new TransizioneNonValidaError(statoCorrente, evento, 'stato corrente assente')
  }
  if (!eventoDichiarato(machine, statoCorrente, evento)) {
    throw new TransizioneNonValidaError(statoCorrente, evento)
  }
  return machine.transition(statoCorrente, { type: evento, ...ctx }).value
}

/**
 * Crea un record partendo dallo stato iniziale dichiarato dalla macchina: è
 * l'unico modo autorizzato di scrivere uno stato alla creazione.
 *
 * @returns {Promise<*>} qualunque cosa ritorni `scrivi` (es. la risposta API)
 */
export async function creaConStatoIniziale({ machine, campo = 'Stato', extra = {}, scrivi }) {
  return scrivi({ ...extra, [campo]: machine.initialState.value })
}

/**
 * Crea un record scegliendo esplicitamente uno stato DICHIARATO dalla macchina
 * (es. riconciliazione che nasce `inviato`). Valida il target contro gli stati
 * della macchina; non richiede che sia raggiungibile.
 *
 * @returns {Promise<*>} qualunque cosa ritorni `scrivi` (es. la risposta API)
 */
export async function creaConStato({ machine, campo = 'Stato', stato, extra = {}, scrivi }) {
  if (!machine?.config?.states?.[stato]) {
    throw new TransizioneNonValidaError(null, `CREA->${stato}`, 'stato iniziale non dichiarato')
  }
  return scrivi({ ...extra, [campo]: stato })
}

/**
 * Esegue una transizione dichiarata: valida con la macchina, poi scrive il
 * nuovo stato tramite `scrivi(patch)`.
 *
 * @param {Object} input
 * @param {Object} input.machine
 * @param {string} [input.campo='Stato'] - nome del campo di stato persistito
 * @param {string} input.statoCorrente
 * @param {string} input.evento
 * @param {Object} [input.ctx] - dati extra passati all'evento (guardie)
 * @param {Object} [input.extra] - altri campi da includere nella patch
 * @param {(patch: Object) => Promise<void>} [input.scrivi]
 * @returns {Promise<string>} lo stato di destinazione
 */
export async function transita({ machine, campo = 'Stato', statoCorrente, evento, ctx = {}, extra = {}, scrivi }) {
  const target = calcolaStatoSuccessivo(machine, statoCorrente, evento, ctx)
  if (typeof scrivi === 'function') {
    await scrivi({ ...extra, [campo]: target })
  }
  return target
}

/**
 * Percorso di riparazione/backfill: porta l'entità a uno stato DICHIARATO nella
 * macchina senza richiedere che sia raggiungibile dallo stato corrente. Resta
 * dentro l'unico scrittore, quindi esplicito e tracciabile.
 *
 * @throws {TransizioneNonValidaError} se `target` non è uno stato della macchina.
 * @returns {Promise<string>} lo stato target
 */
export async function ripara({ machine, campo = 'Stato', statoCorrente, target, extra = {}, scrivi }) {
  if (!machine?.config?.states?.[target]) {
    throw new TransizioneNonValidaError(statoCorrente, `RIPARA->${target}`, 'stato target non dichiarato')
  }
  if (typeof scrivi === 'function') {
    await scrivi({ ...extra, [campo]: target })
  }
  return target
}
