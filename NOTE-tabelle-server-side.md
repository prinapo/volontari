# NOTE — Conversione tabelle server-side

## Step 2 — AssegnaFamigliaDialog.vue

**Dubbio**: Il dialog mostra l'elenco delle famiglie assegnate a un
contatto. I dati arrivano da `gestioneService.getFamiglieByContatto` che
carica TUTTE le famiglie per quel contatto — in genere 1-3 righe, mai
abbastanza da giustificare paginazione server-side.

La tabella ha già `:pagination="{ rowsPerPage: 10 }"` (client-side), senza
search/sort/filtri. Convertire a `useServerTable` richiederebbe di
aggiungere parametri di paginazione al service e allo store, per un
beneficio nullo su dataset di 1-3 righe.

**Decisione**: Saltare la conversione. Serve solo se in futuro il dialogo
mostrerà centinaia di famiglie.

## Step 3 — ContattiDialog.vue

Stessa situazione dello Step 2: dialog piccolo che carica i contatti
assegnati a una famiglia via `gestioneService.getContattiByFamiglia`
(senza paginazione). Dataset tipico: 1-10 righe.

**Decisione**: Saltare la conversione per lo stesso motivo dello Step 2.

## Step 6 — Verifica/RendicontazioneTab.vue

Lo store aveva già `fetchPage({ page, limit, search, anno, ... })` che
supporta vera paginazione server-side. Convertito a `useServerTable` con
`filteredRows` che punta a `store.rows` (non al composable `rows`) perché
altre parti del componente mutano `store.rows` in-place (es.
`recalculateRowTotals`). Il composable gestisce loading/pagination/search,
i dati passano dallo store.

**Completato.**

## Step 8 — Verifica/PagamentiTab.vue (3 tabelle)

**Skip motivato**: Con l'introduzione futura del filtro per anno (previsto,
visto che Verifica/RendicontazioneTab ha già un selettore "Anno bando"),
il dataset per vista sarà ~200 righe, gestibile client-side senza rischi
di risultati mancanti. Non richiede riscrittura store per paginazione
generica. Da rivedere solo se in futuro si vorrà vedere più anni insieme
senza filtro.
