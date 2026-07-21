# Correzione calcolo erogabile nelle proposte di pagamento

Issue: #39, #40

## Problema

In `pagamenti.store.js` il calcolo dell'`erogabile` non applica la regola dell'80%.

```js
// Attuale (SBAGLIATO)
const erogabile = Math.min(totaleVerificato, allocato)

// Corretto
const percentuale = 0.8 // → in futuro leggere da Famiglie.Rimborso100Percentuale
const erogabile = Math.min(totaleVerificato * percentuale, allocato)
```

Questo causa due effetti:

1. Le proposte di pagamento hanno `Importo` maggiore del dovuto (100% invece dell'80%)
2. Il file CSV per il bonifico contiene importi errati

## Flusso atteso

```
Giustificativi verificati (somma cumulativa)
        │
        ▼  * 0.8 (o percentuale famiglia se 100%)
Erogabile lordo
        │
        ▼  min(..., Allocato)
Erogabile (mai > Allocato)
        │
        ▼  − giàPagato (in_pagamento + pagato)
Nuova proposta
        │
        ▼  crea/aggiorna Pagamenti.Importo
File bonifico (CSV con Importo corretto)
        │
        ▼  pagato ✅
Aggiorna TotalePagato su Progetto
```

## Ricalcolo con pagamenti già effettuati

Esempio: Allocato €1000, verificato €1000, già pagato €500

|                 | Prima (sbagliato) | Dopo (corretto) |
| --------------- | ----------------- | --------------- |
| Erogabile lordo | €1000             | €800            |
| Già pagato      | €500              | €500            |
| Nuova proposta  | **€500**          | **€300**        |
| Totale erogato  | €1000 (=100%)     | €800 (=80%) ✓   |

## Modifiche già applicate

- `pagamenti.store.js` — `_ricalcolaPropostaSingola`: erogabile = min(totaleVerificato * 0.8, allocato)
- `pagamenti.store.js` — `ricalcolaProposta`: erogabile = min(totaleVerificato * 0.8, allocato)
- `pagamenti.store.js` — `fetchProposti`: sort ascendente per DataProposta (più vecchie prima)
- `pagamenti.store.js` — `fetchInCorso`: sort ascendente per DataProposta (più vecchie prima)

## Modifiche future (non ancora implementate)

### Issue #40 — Flag per rimborso 100% su alcune famiglie

- Aggiungere colonna `Rimborso100Percentuale` (boolean) su `Famiglie` in Directus
- Modificare `pagamenti.store.js` per leggere il flag dalla famiglia invece dell'80% fisso
- Stessa logica in `verifica.store.js` (`recalculateRowTotals`)
- Stessa logica in `FamigliePage.vue` (calcolo rimborsabile lato volontario)
- UI: aggiungere switch nella modifica famiglia
- Aggiornare label "Rimborsabile 80%" in:
  - `RendicontazioneTab.vue` (3 occorrenze)
  - `ProgettoDetailDialog.vue`
  - `FamigliePage.vue`
  - `ProgettoDetailDialog.vue`

### Ricalcolo proposte esistenti

Le proposte già create nel DB hanno `Importo` calcolato senza 0.8. Dopo il fix servirebbe un ricalcolo massivo triggerando `ricalcolaProposte`.

## Note

- `ricalcolaTotaliProgetto` aggiorna `TotaleVerificato`, `TotaleProposto`, `TotalePagato`, `ResiduoAllocato` sul record Progetti
- L'80% si applica sul **cumulativo** del rendicontato, non sulla singola proposta
- Se l'allocato è già saturo (pagato >= allocato), il ciclo si ferma
