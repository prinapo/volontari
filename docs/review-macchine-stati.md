# Revisione macchine a stati

Revisione interattiva: **uno stato per volta**, per verificare che il codice usi
esattamente le transizioni dichiarate nelle macchine (`src/state-machines/`) e
capire chi le emette, chi le innesca e con quali side-effect.

- **Branch**: `feat/state-machines`
- **Commit di partenza**: `1b16a00`
- **Ordine**: Submission → Pagamento → Giustificativo → Progetto
- **Esiti**: `confermato` | `da correggere` | `dubbio` | `da rivedere`

> **Nota post-deploy (v4.0.9)**: il primitivo `ripara` e i tool Admin one-shot
> ("Trasformazioni Stato Progetto" e "Sincronizza stati pagamento
> giustificativi") sono stati **rimossi** dopo l'allineamento dei dati. Le
> sezioni che li citano (es. #C6) restano come documentazione storica della
> revisione.

## Avanzamento

| #   | Entità         | Stato                | Esito      |
| --- | -------------- | -------------------- | ---------- |
| 1   | Submission     | `inserito`           | confermato |
| 2   | Submission     | `inviato`            | confermato |
| 3   | Submission     | `scartato`           | confermato |
| 4   | Pagamento      | `proposto`           | confermato |
| 5   | Pagamento      | `in_pagamento`       | confermato |
| 6   | Pagamento      | `pagato`             | confermato |
| 7   | Pagamento      | `fallito`            | confermato |
| 8   | Pagamento      | `annullato`          | confermato |
| 9   | Giustificativo | `draft`              | confermato |
| 10  | Giustificativo | `inviato`            | confermato |
| 11  | Giustificativo | `verificato`         | confermato |
| 12  | Giustificativo | `rifiutato`          | confermato |
| 13  | Giustificativo | `in_pagamento`       | confermato |
| 14  | Giustificativo | `pagato`             | confermato |
| 15  | Progetto       | `proposto`           | confermato |
| 16  | Progetto       | `validato`           | confermato |
| 17  | Progetto       | `approvato`          | confermato |
| 18  | Progetto       | `accettato`          | confermato |
| 19  | Progetto       | `in_rendicontazione` | confermato |
| 20  | Progetto       | `rimborso_parziale`  | confermato |
| 21  | Progetto       | `chiuso`             | confermato |

---

## #1 — Submission · `inserito`

**Significato**: submission del modulo libero accodata e in attesa di
risoluzione. **Tipo**: iniziale (stato di creazione).

### Entrate

| Da         | Evento       | Use case                                                             | Entry point UI                                                            | Side-effect                                                      |
| ---------- | ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| (create)   | —            | `creaSubmission` `usecases/giustificativi.js:106` (`creaConStato`)   | `SubmitPage.vue:289` → `submit.store.inviaSubmission:16`                  | POST `InviiGiustificativiNoLogin`; email lowercase; `data_invio` |
| `scartato` | `RIPRISTINA` | `ripristinaSubmission` `usecases/giustificativi.js:241` (`transita`) | `RiconciliazionePage.vue:663` → `verifica.store.ripristinaSubmission:629` | azzera `note_riconciliazione`; refetch submissions               |

### Uscite

| Evento       | A          | Use case                                                             | Entry point UI                                                           | Side-effect                                                                                                                                                                                                                                   |
| ------------ | ---------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SCARTA`     | `scartato` | `scartaSubmission` `usecases/giustificativi.js:229` (`transita`)     | `RiconciliazionePage.vue:653` → `verifica.store.scartaSubmission:618`    | set `note_riconciliazione`; refetch                                                                                                                                                                                                           |
| `RICONCILIA` | `inviato`  | `riconciliaSubmission` `usecases/giustificativi.js:333` (`transita`) | `RiconciliazionePage.vue:618` → `verifica.store.reconcileSubmission:576` | crea giustificativo (`_creaGiustificativoRecord`: guardia progetto operativo + `syncProgettoAggregati`), copia campi contatto/famiglia, sposta/rinomina allegato, set `famiglia_riconciliata`/`progetto_riconciliato`/`giustificativo_creato` |

### Chi lo legge

- `verificaService.getSubmissions` `services/verifica.service.js:121-153` —
  filtro default `stato = inserito`; con `includeScartati` → `inserito|scartato`.
- `verifica.store.fetchSubmissions` + `_detectSubmissionStates` (matching).
- Lista in `RiconciliazionePage.vue`.

### Test

- Macchina: `tests/unit/state-machines/submission.test.js`.
- Use case: `tests/unit/usecases/giustificativi.test.js`.
- Store: `tests/unit/stores/submit.store.test.js`, `tests/unit/stores/verifica.store.test.js`.
- Page: `tests/unit/pages/RiconciliazionePage.test.js`.
- E2E: `riconciliazione.spec.js` → `RC-04`, `RC-05`, `RC-PG-04`, `RC-PG-01`.

### Anomalie

Nessuna.

### Esito

**Confermato.**

---

## #2 — Submission · `inviato`

**Significato**: submission riconciliata: il giustificativo è stato creato con
`Stato = inviato`. **Tipo**: terminale.

### Entrate

| Da         | Evento       | Use case                                                             | Entry point UI                                                           | Side-effect                                                             |
| ---------- | ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `inserito` | `RICONCILIA` | `riconciliaSubmission` `usecases/giustificativi.js:333` (`transita`) | `RiconciliazionePage.vue:618` → `verifica.store.reconcileSubmission:576` | crea giustificativo + copia campi/allegato; set `giustificativo_creato` |

### Uscite

Nessuna: stato **terminale** (`submissionMachine.states.inviato = {}`).

### Chi lo legge

- `getSubmissions` (`services/verifica.service.js:121-153`) filtra solo
  `inserito` (default) o `inserito|scartato`: le submission `inviato` **non
  compaiono più** nella pagina Riconciliazione ("Da riconciliare").
- `_detectSubmissionStates` gira solo sulle submission fetchate (inserito/scartato).
- Il giustificativo creato prosegue nella macchina Giustificativo.

### Test

- Macchina: `tests/unit/state-machines/submission.test.js` (`inviato` terminale).
- Use case: `tests/unit/usecases/giustificativi.test.js` (assert `stato: 'inviato'`).
- E2E: `riconciliazione.spec.js` → `RC-05`.

### Anomalie

Nessuna. Osservazione: `inviato` è "archiviato" e non esiste una vista storico
delle submission riconciliate (solo il giustificativo collegato).

### Esito

**Confermato.** Osservazione: `inviato` è archiviato, nessuna vista storico
delle submission riconciliate (si segue il giustificativo collegato).

---

## #3 — Submission · `scartato`

**Significato**: submission scartata dal manager (non riconciliabile). **Tipo**:
intermedio (ripristinabile).

### Entrate

| Da         | Evento   | Use case                                                         | Entry point UI                                                        | Side-effect                         |
| ---------- | -------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| `inserito` | `SCARTA` | `scartaSubmission` `usecases/giustificativi.js:229` (`transita`) | `RiconciliazionePage.vue:653` → `verifica.store.scartaSubmission:618` | set `note_riconciliazione`; refetch |

### Uscite

| Evento       | A          | Use case                                                             | Entry point UI                                                            | Side-effect                            |
| ------------ | ---------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------- |
| `RIPRISTINA` | `inserito` | `ripristinaSubmission` `usecases/giustificativi.js:241` (`transita`) | `RiconciliazionePage.vue:663` → `verifica.store.ripristinaSubmission:629` | azzera `note_riconciliazione`; refetch |

### Chi lo legge

- `getSubmissions` con `includeScartati` → `inserito|scartato`.
- Toggle "scartati" e badge "Scartato" in `RiconciliazionePage.vue`.

### Test

- Macchina: `tests/unit/state-machines/submission.test.js`.
- Store: `tests/unit/stores/verifica.store.test.js` (use case mockato).
- E2E: `riconciliazione.spec.js` → `RC-04`, `RC-PG-04`, `RC-PG-01`.

### Anomalie

**Gap test**: `scartaSubmission`/`ripristinaSubmission` non hanno un unit test
diretto del use case (coperti solo da store mock + E2E). Contravviene a
"ogni use case ha unit test".

### Esito

**Confermato.** Gap test coperto: vedi Correzioni proposte (#C1).

---

## #4 — Pagamento · `proposto`

_(in revisione)_

---

## #4 — Pagamento · `proposto`

**Significato**: proposta di pagamento del residuo erogabile, generata dal
ricalcolo. **Tipo**: iniziale/intermedio.

### Entrate

| Da          | Evento                | Use case                                                                                                     | Entry point UI                                                                                                                                                            | Side-effect                                                                    |
| ----------- | --------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| (create)    | —                     | `creaConStatoIniziale` in `ricalcolaProposta` `usecases/pagamenti.js:226` / `_ricalcolaPropostaProgetto:282` | Verifica (`verifica.store:435,454,651` → `pagStore.ricalcolaProposta`) + PagamentiTab bulk (`pagamenti.store.ricalcolaPropostiDaProgetti:72`, `PagamentiTab.vue:777,963`) | collega i verificati (`_collegaGiustificativi`), poi `ricalcolaTotaliProgetto` |
| `annullato` | `RIPRISTINA_PROPOSTO` | `ripristinaProposto` `usecases/pagamenti.js:483` (`transita`)                                                | `PagamentiTab.vue:818` → `pagamenti.store.ripristinaProposto:334`                                                                                                         | `ricalcolaTotaliProgetto` + `sincronizzaStatiPagamentoProgetto`                |

### Uscite

| Evento             | A              | Use case                                                                                   | Entry point UI                                   | Side-effect                                                                  |
| ------------------ | -------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| `IN_PAGAMENTO`     | `in_pagamento` | `segnaInPagamento` `usecases/pagamenti.js:406`                                             | `PagamentiTab` → `pagamenti.store.creaBatch:348` | set `Batch`; `ricalcolaTotaliProgetto` + `sincronizzaStatiPagamentoProgetto` |
| `ANNULLA_PROPOSTA` | `annullato`    | auto in `ricalcolaProposta` `usecases/pagamenti.js:242` / `_ricalcolaPropostaProgetto:298` | (ricalcolo)                                      | `_scollegaGiustificativi`; `NoteEsito` "Proposta annullata…"                 |

Nota: l'aggiornamento `Importo` mentre è `proposto` (`pagamenti.js:224,280`) non
è una transizione di stato.

### Chi lo legge

- `pagamenti.store.fetchProposti` (filtro `Stato = proposto`) e `PagamentiTab`.
- Guardia `creaBatch` (`pagamenti.store.js:359`): tutti i selezionati devono
  essere `proposto`.

### Test

- Macchina: `tests/unit/state-machines/pagamento.test.js`.
- Use case: `tests/unit/usecases/pagamenti.test.js` (`ricalcolaProposta` crea/annulla).
- Store: `tests/unit/stores/pagamenti.store.test.js`.
- E2E: `pagamenti-crud.spec.js` / `PAG-50`.

### Anomalie

**Gap test**: `ripristinaProposto` non ha unit test diretto (solo store mock).

### Esito

**Confermato.** Gap test `ripristinaProposto` coperto: vedi Correzioni proposte (#C2).

---

## #5 — Pagamento · `in_pagamento`

**Significato**: pagamento incluso in un batch, in attesa di esito. **Tipo**:
intermedio.

### Entrate

| Da         | Evento                    | Use case                                                         | Entry point UI                                                       | Side-effect                                                                  |
| ---------- | ------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `proposto` | `IN_PAGAMENTO`            | `segnaInPagamento` `usecases/pagamenti.js:406`                   | `PagamentiTab` → `pagamenti.store.creaBatch:348`                     | set `Batch`; `ricalcolaTotaliProgetto` + `sincronizzaStatiPagamentoProgetto` |
| `fallito`  | `RIPRISTINA_IN_PAGAMENTO` | `ripristinaInPagamento` `usecases/pagamenti.js:498` (`transita`) | `PagamentiTab.vue:837` → `pagamenti.store.ripristinaInPagamento:439` | azzera `NoteEsito`; `sincronizzaStatiPagamentoProgetto`                      |

### Uscite

| Evento     | A           | Use case                                                  | Entry point UI                                                    | Side-effect                                                                                                      |
| ---------- | ----------- | --------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `PAGA`     | `pagato`    | `segnaPagato` `usecases/pagamenti.js:430` (`transita`)    | `PagamentiTab.vue:847,890` → `pagamenti.store.segnaPagato:395`    | `ricalcolaTotaliProgetto` + `sincronizzaStatiPagamentoProgetto` + `inviaNotificaPagamento` (email)               |
| `FALLISCI` | `fallito`   | `segnaFallito` `usecases/pagamenti.js:446` (`transita`)   | `PagamentiTab.vue:868,921` → `pagamenti.store.segnaFallito:409`   | `ricalcolaTotaliProgetto` + `sincronizzaStatiPagamentoProgetto`                                                  |
| `ANNULLA`  | `annullato` | `segnaAnnullato` `usecases/pagamenti.js:464` (`transita`) | `PagamentiTab.vue:878,941` → `pagamenti.store.segnaAnnullato:424` | `_scollegaGiustificativi`; `ricalcolaTotaliProgetto` + `sincronizzaStatiPagamentoProgetto` + `ricalcolaProposta` |

### Chi lo legge

- `pagamenti.store.fetchInCorso:124` (filtro `in_pagamento,pagato`) e `PagamentiTab` ("incorso").
- Guardie di `segnaPagato`/`segnaFallito`/`segnaAnnullato`: partono solo da `in_pagamento`.

### Test

- Macchina: `tests/unit/state-machines/pagamento.test.js`.
- Use case: `usecases/pagamenti.test.js` (`segnaInPagamento`, `segnaPagato`, `segnaAnnullato`).
- Store: `stores/pagamenti.store.test.js`.
- E2E: `pagamenti-crud.spec.js` / `PAG-50`.

### Anomalie

**Gap test**: `segnaFallito` e `ripristinaInPagamento` senza unit test diretto.

### Esito

**Confermato.** Gap test `segnaFallito`/`ripristinaInPagamento` coperto: vedi Correzioni proposte (#C3).

---

## #6 — Pagamento · `pagato`

**Significato**: pagamento effettuato (esito positivo). **Tipo**: terminale.

### Entrate

| Da             | Evento | Use case                                               | Entry point UI                                                 | Side-effect                                                                                                                                     |
| -------------- | ------ | ------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `in_pagamento` | `PAGA` | `segnaPagato` `usecases/pagamenti.js:430` (`transita`) | `PagamentiTab.vue:847,890` → `pagamenti.store.segnaPagato:395` | `ricalcolaTotaliProgetto` (può chiudere il progetto), `sincronizzaStatiPagamentoProgetto`, `inviaNotificaPagamento` (email + `NotificaInviata`) |

### Uscite

Nessuna: stato **terminale**. Non esiste storno (la correzione dati è possibile
solo su `fallito`).

### Chi lo legge

- `pagamenti.store.fetchInCorso:124` (filtro `in_pagamento,pagato`).
- Dashboard (`pagByStato`) e `PagamentiTab` (badge "Pagato").
- `famiglie.store:44` (pagamenti `pagato` per le erogazioni famiglia).

### Test

- Macchina: `tests/unit/state-machines/pagamento.test.js`.
- Use case: `usecases/pagamenti.test.js` (`segnaPagato`).
- Store: `stores/pagamenti.store.test.js`.
- E2E: `PAG-50` (`pagamenti-crud.spec.js`): verifica `pagato` via API con retry (l'email non è bloccante).

### Anomalie

Nessuna.

### Esito

**Confermato.**

---

## #7 — Pagamento · `fallito`

**Significato**: pagamento fallito (esito negativo, es. IBAN errato). **Tipo**:
intermedio (recuperabile).

### Entrate

| Da             | Evento     | Use case                                                | Entry point UI                                                  | Side-effect                                                     |
| -------------- | ---------- | ------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| `in_pagamento` | `FALLISCI` | `segnaFallito` `usecases/pagamenti.js:446` (`transita`) | `PagamentiTab.vue:868,921` → `pagamenti.store.segnaFallito:409` | `ricalcolaTotaliProgetto` + `sincronizzaStatiPagamentoProgetto` |

### Uscite

| Evento                    | A              | Use case                                                         | Entry point UI                                                       | Side-effect                                                |
| ------------------------- | -------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| `ANNULLA`                 | `annullato`    | `segnaAnnullato` `usecases/pagamenti.js:464` (`transita`)        | `PagamentiTab.vue:878,941` → `pagamenti.store.segnaAnnullato:424`    | `_scollegaGiustificativi`; ricalcoli + `ricalcolaProposta` |
| `RIPRISTINA_IN_PAGAMENTO` | `in_pagamento` | `ripristinaInPagamento` `usecases/pagamenti.js:498` (`transita`) | `PagamentiTab.vue:837` → `pagamenti.store.ripristinaInPagamento:439` | azzera `NoteEsito`; `sincronizzaStatiPagamentoProgetto`    |

Non-transizione collegata: `correggiDati` `usecases/pagamenti.js:502` (solo da
`fallito`) aggiorna IBAN/Intestatario su `Pagamenti` + `Famiglie`; non cambia
stato. Entry: `PagamentiTab.vue:813` → `pagamenti.store.correggiDati:453`.

### Chi lo legge

- `pagamenti.store.fetchFalliti` (filtro `Stato = fallito`) e tab "falliti" in
  `PagamentiTab`.

### Test

- Macchina: `tests/unit/state-machines/pagamento.test.js`.
- Use case: `usecases/pagamenti.test.js` (`segnaFallito`, `ripristinaInPagamento` — #C3).
- Store: `stores/pagamenti.store.test.js`.
- E2E: `pagamenti-crud.spec.js`.

### Anomalie

**Gap test**: `correggiDati` senza unit test diretto → #C4 in Correzioni proposte.

### Esito

**Confermato.** Gap test `correggiDati` coperto: vedi Correzioni proposte (#C4).

---

## #8 — Pagamento · `annullato`

**Significato**: pagamento annullato (proposta non più dovuta, oppure rimosso
dal gruppo). **Tipo**: intermedio (ripristinabile a `proposto`).

### Entrate

| Da                         | Evento             | Use case                                                                                   | Entry point UI                                                    | Side-effect                                                                                                      |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `in_pagamento` / `fallito` | `ANNULLA`          | `segnaAnnullato` `usecases/pagamenti.js:464` (`transita`)                                  | `PagamentiTab.vue:878,941` → `pagamenti.store.segnaAnnullato:424` | `_scollegaGiustificativi`; `ricalcolaTotaliProgetto` + `sincronizzaStatiPagamentoProgetto` + `ricalcolaProposta` |
| `proposto`                 | `ANNULLA_PROPOSTA` | auto in `ricalcolaProposta` `usecases/pagamenti.js:242` / `_ricalcolaPropostaProgetto:298` | (ricalcolo)                                                       | `_scollegaGiustificativi`; `NoteEsito` "Proposta annullata…"                                                     |

### Uscite

| Evento                | A          | Use case                                                      | Entry point UI                                                    | Side-effect                                                     |
| --------------------- | ---------- | ------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `RIPRISTINA_PROPOSTO` | `proposto` | `ripristinaProposto` `usecases/pagamenti.js:483` (`transita`) | `PagamentiTab.vue:818` → `pagamenti.store.ripristinaProposto:334` | `ricalcolaTotaliProgetto` + `sincronizzaStatiPagamentoProgetto` |

### Chi lo legge

- `pagamenti.store.fetchAnnullati:190` (filtro `Stato = annullato`, con motivo/ricerca).

### Test

- Macchina: `tests/unit/state-machines/pagamento.test.js`.
- Use case: `usecases/pagamenti.test.js` (`segnaAnnullato`, `ripristinaProposto` — #C2).
- Store: `stores/pagamenti.store.test.js`.
- E2E: `pagamenti-crud.spec.js`.

### Anomalie

Nessuna.

### Esito

**Confermato.**

---

## #9 — Giustificativo · `draft`

**Significato**: bozza del giustificativo, non ancora inviata. **Tipo**: iniziale.

### Entrate

| Da       | Evento | Use case                                                                                        | Entry point UI                                                                                                   | Side-effect                                                    |
| -------- | ------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| (create) | —      | `creaConStato` in `_creaGiustificativoRecord` `usecases/giustificativi.js:63` (default `draft`) | volontario: `giustificativi.store.createGiustificativo:43`; verificatore: `verifica.store.addGiustificativo:681` | `_ensureRendicontazione`, upload file, `syncProgettoAggregati` |

Nota: il form non impone più `Stato` (`GiustificativoForm.vue`); il default
`draft` viene dalla macchina.

### Uscite

| Evento  | A         | Use case                                                                                                                   | Entry point UI                                                                                     | Side-effect                                 |
| ------- | --------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `INVIA` | `inviato` | `inviaGiustificativo` `usecases/giustificativi.js:129` (`transita`)                                                        | `giustificativi.store.submitGiustificativo:81` (GiustificativoList)                                | `syncProgettoAggregati`                     |
| `INVIA` | `inviato` | `aggiornaCampoGiustificativo` (field `Stato`, target `inviato`) `usecases/giustificativi.js:176` via `_eventoPerStato:160` | `RendicontazioneTab.vue:1162` (`handleSendDraft`) → `verifica.store.updateGiustificativoField:442` | azzera `Pagamento`; `syncProgettoAggregati` |

### Chi lo legge

- `giustificativi.store` getter `draftItems:21`, `canEdit:23`.
- `GiustificativoList` (`:can-edit="item.Stato === 'draft'"`).
- I `draft` sono esclusi dai contabili (`STATI_GIUSTIFICATIVO_CONTABILI`) e
  dallo stato progetto (`hasValidGiustificativi`).

### Test

- Macchina: `tests/unit/state-machines/giustificativo.test.js`.
- Use case: `usecases/giustificativi.test.js` (`creaGiustificativo`, `inviaGiustificativo`).
- Store: `stores/giustificativi.store.test.js`.
- Component: `components/GiustificativoForm.test.js`, `GiustificativoList.test.js`.
- E2E: `giustificativi.spec.js`.

### Anomalie

Nessuna. Doppio ingresso a `INVIA` (store dedicato + campo generico) ma stesso
evento e stesso esito: coerente con la macchina.

### Esito

**Confermato.**

---

## #10 — Giustificativo · `inviato`

**Significato**: giustificativo inviato dalla famiglia (o nato alla
riconciliazione), in attesa di verifica. **Tipo**: intermedio.

### Entrate

| Da                         | Evento               | Use case                                                                                        | Entry point UI                                                                                  | Side-effect                                                               |
| -------------------------- | -------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| (create)                   | —                    | `creaConStato` in `_creaGiustificativoRecord` `usecases/giustificativi.js:63` (stato `inviato`) | riconciliazione: `verifica.store.reconcileSubmission:576`                                       | guardia progetto operativo; crea giustificativo + `syncProgettoAggregati` |
| `draft`                    | `INVIA`              | `inviaGiustificativo` `usecases/giustificativi.js:129` / `aggiornaCampoGiustificativo:176`      | vedi #9                                                                                         | `syncProgettoAggregati`                                                   |
| `verificato` / `rifiutato` | `RIPRISTINA_INVIATO` | `aggiornaCampoGiustificativo` `usecases/giustificativi.js:176` via `_eventoPerStato:160`        | `RendicontazioneTab.vue:1137` (`handleRevert`) → `verifica.store.updateGiustificativoField:442` | azzera `Pagamento`; `syncProgettoAggregati`                               |

### Uscite

| Evento     | A            | Use case                                                               | Entry point UI                                                                             | Side-effect                                                                                              |
| ---------- | ------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `VERIFICA` | `verificato` | `verificaGiustificativo` `usecases/giustificativi.js:199` (`transita`) | `RendicontazioneTab.vue:1145` (`handleVerify`) → `verifica.store.verifyGiustificativo:427` | set `DataVerifica`; azzera `Pagamento`; `syncProgettoAggregati` + (manager) `ricalcolaProposta`          |
| `RIFIUTA`  | `rifiutato`  | `rifiutaGiustificativo` `usecases/giustificativi.js:214` (`transita`)  | `RendicontazioneTab.vue:1169` (`handleReject`) → `verifica.store.rejectGiustificativo:643` | `markFileRejected`; set `NotaRifiuto`; azzera `Pagamento`; `syncProgettoAggregati` + `ricalcolaProposta` |

### Chi lo legge

- `verifica.store` righe; stato riga "Da verificare" (`utils/statoRiga.js:75`).
- `giustificativi.store` getter `inviatoItems:22`.
- `RendicontazioneTab` mostra le azioni Verifica/Rifiuta.

### Test

- Macchina: `tests/unit/state-machines/giustificativo.test.js`.
- Use case: `usecases/giustificativi.test.js` (`inviaGiustificativo`, `verificaGiustificativo`).
- Store: `stores/verifica.store.test.js`, `stores/giustificativi.store.test.js`.
- E2E: `giustificativi.spec.js`, `verifica.spec.js`.

### Anomalie

**Gap test**: `rifiutaGiustificativo` senza unit test diretto → #C5.

### Esito

**Confermato.** Gap test `rifiutaGiustificativo` coperto: vedi Correzioni proposte (#C5).

---

## #11 — Giustificativo · `verificato`

**Significato**: giustificativo approvato dal manager; concorre all'erogabile e
alle proposte. **Tipo**: contabile/intermedio.

### Entrate

| Da                        | Evento                 | Use case                                                                     | Entry point UI                                                            | Side-effect                                                                 |
| ------------------------- | ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `inviato`                 | `VERIFICA`             | `verificaGiustificativo` `usecases/giustificativi.js:199` (`transita`)       | `RendicontazioneTab.vue:1145` → `verifica.store.verifyGiustificativo:427` | set `DataVerifica`; `syncProgettoAggregati` + (manager) `ricalcolaProposta` |
| `in_pagamento` / `pagato` | `RICALCOLA_VERIFICATO` | `sincronizzaStatiPagamentoProgetto` `usecases/pagamenti.js:105` (`transita`) | transizioni pagamento (`segna*`/`ripristina*`)                            | riallinea i giustificativi al pagamento                                     |
| qualunque contabile       | `ripara`               | `sincronizzaStatiPagamento` `usecases/sincronizzazione.js:145`               | Admin → Consistenza (backfill)                                            | riallineamento storico                                                      |

### Uscite

| Evento                   | A              | Use case                                                        | Entry point UI                                 | Side-effect                                 |
| ------------------------ | -------------- | --------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| `RIPRISTINA_INVIATO`     | `inviato`      | `aggiornaCampoGiustificativo` `usecases/giustificativi.js:176`  | `RendicontazioneTab.vue:1137` (`handleRevert`) | azzera `Pagamento`; `syncProgettoAggregati` |
| `RICALCOLA_IN_PAGAMENTO` | `in_pagamento` | `sincronizzaStatiPagamentoProgetto` `usecases/pagamenti.js:105` | transizioni pagamento                          | riallinea al pagamento                      |
| `RICALCOLA_PAGATO`       | `pagato`       | `sincronizzaStatiPagamentoProgetto` `usecases/pagamenti.js:105` | transizioni pagamento / cap raggiunto          | riallinea al pagamento                      |

### Chi lo legge

- `STATI_GIUSTIFICATIVO_CONTABILI` (`utils/constants.js:36`): erogabile,
  `TotaleVerificato`, stato riga ("Pronto").
- `ricalcolaProposta` collega i `verificato` non ancora coperti.

### Test

- Macchina: `tests/unit/state-machines/giustificativo.test.js`.
- Use case: `usecases/giustificativi.test.js` (`verificaGiustificativo`),
  `usecases/pagamenti.test.js` (`sincronizzaStatiPagamentoProgetto`),
  `usecases/sincronizzazione.test.js`.
- E2E: `verifica.spec.js`.

### Anomalie

Nessuna.

### Esito

**Confermato.**

---

## #12 — Giustificativo · `rifiutato`

**Significato**: giustificativo rifiutato dal manager, con nota. **Tipo**:
intermedio (recuperabile a `inviato`).

### Entrate

| Da        | Evento    | Use case                                                              | Entry point UI                                                                             | Side-effect                                                                                                              |
| --------- | --------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `inviato` | `RIFIUTA` | `rifiutaGiustificativo` `usecases/giustificativi.js:214` (`transita`) | `RendicontazioneTab.vue:1169` (`handleReject`) → `verifica.store.rejectGiustificativo:643` | `markFileRejected` (rinomina file), set `NotaRifiuto`, azzera `Pagamento`; `syncProgettoAggregati` + `ricalcolaProposta` |

### Uscite

| Evento               | A         | Use case                                                                                 | Entry point UI                                                                                  | Side-effect                                 |
| -------------------- | --------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `RIPRISTINA_INVIATO` | `inviato` | `aggiornaCampoGiustificativo` `usecases/giustificativi.js:176` via `_eventoPerStato:160` | `RendicontazioneTab.vue:1137` (`handleRevert`) → `verifica.store.updateGiustificativoField:442` | azzera `Pagamento`; `syncProgettoAggregati` |

### Chi lo legge

- Escluso dai contabili (`STATI_GIUSTIFICATIVO_CONTABILI`) → non concorre a
  erogabile/stato riga.
- `RendicontazioneTab` blocco `rifiutato` (mostra `NotaRifiuto`).
- `GiustificativoCard.vue:101` (`Stato === 'rifiutato'` → `NotaRifiuto`).

### Nota: `Invalidato` non è uno stato

`invalidaGiustificativo` `usecases/giustificativi.js:188` imposta il flag
`Invalidato` (via `giustificativiService.invalidate`), ortogonale allo `Stato`
e non modellato nella macchina. Un `rifiutato` può essere anche invalidato.

### Test

- Macchina: `tests/unit/state-machines/giustificativo.test.js`.
- Use case: `usecases/giustificativi.test.js` (`rifiutaGiustificativo` — #C5).
- Store: `stores/verifica.store.test.js`.
- E2E: `verifica.spec.js`.

### Anomalie

Nessuna.

### Esito

**Confermato.**

---

## #13 — Giustificativo · `in_pagamento`

**Significato**: giustificativo collegato a un pagamento `in_pagamento`. **Tipo**:
contabile/intermedio.

### Entrate

| Da                      | Evento                   | Use case                                                                     | Entry point UI                      | Side-effect                                    |
| ----------------------- | ------------------------ | ---------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------- |
| `verificato` / `pagato` | `RICALCOLA_IN_PAGAMENTO` | `sincronizzaStatiPagamentoProgetto` `usecases/pagamenti.js:105` (`transita`) | `segnaInPagamento` (da `creaBatch`) | il giustificativo segue il pagamento collegato |
| qualunque contabile     | `ripara`                 | `sincronizzaStatiPagamento` `usecases/sincronizzazione.js:145`               | Admin → Consistenza (backfill)      | riallineamento storico                         |

Non esiste un evento "utente" che porti qui: la transizione è **derivata** dal
pagamento collegato (`Giustificativi.Pagamento` → `Pagamenti.Stato`).

### Uscite

| Evento                 | A            | Use case                                                        | Entry point UI                               | Side-effect            |
| ---------------------- | ------------ | --------------------------------------------------------------- | -------------------------------------------- | ---------------------- |
| `RICALCOLA_VERIFICATO` | `verificato` | `sincronizzaStatiPagamentoProgetto` `usecases/pagamenti.js:105` | pagamento `fallito`/`annullato` o scollegato | riallinea al pagamento |
| `RICALCOLA_PAGATO`     | `pagato`     | `sincronizzaStatiPagamentoProgetto` `usecases/pagamenti.js:105` | pagamento `pagato` o cap raggiunto           | riallinea al pagamento |

### Chi lo legge

- `STATI_GIUSTIFICATIVO_CONTABILI` (erogabile, `TotaleVerificato`).
- Stato riga "In pagamento" (`utils/statoRiga.js:86`).
- FK `Giustificativi.Pagamento`.

### Test

- Macchina: `tests/unit/state-machines/giustificativo.test.js`.
- Use case: `usecases/pagamenti.test.js` (`sincronizzaStatiPagamentoProgetto`),
  `usecases/sincronizzazione.test.js`.
- E2E: `PAG-50` (`pagamenti-crud.spec.js`).

### Anomalie

Nessuna.

### Esito

**Confermato.**

---

## #14 — Giustificativo · `pagato`

**Significato**: giustificativo saldato (pagamento `pagato`, oppure cap allocato
raggiunto). **Tipo**: contabile (reversibile solo dal ricalcolo).

### Entrate

| Da                            | Evento             | Use case                                                                     | Entry point UI                  | Side-effect                                               |
| ----------------------------- | ------------------ | ---------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------- |
| `verificato` / `in_pagamento` | `RICALCOLA_PAGATO` | `sincronizzaStatiPagamentoProgetto` `usecases/pagamenti.js:105` (`transita`) | `segnaPagato` (o cap raggiunto) | set `DataPagamento`; il giustificativo segue il pagamento |
| qualunque contabile           | `ripara`           | `sincronizzaStatiPagamento` `usecases/sincronizzazione.js:145`               | Admin → Consistenza (backfill)  | riallineamento storico                                    |

### Uscite

| Evento                   | A              | Use case                                                        | Entry point UI                   | Side-effect                       |
| ------------------------ | -------------- | --------------------------------------------------------------- | -------------------------------- | --------------------------------- |
| `RICALCOLA_VERIFICATO`   | `verificato`   | `sincronizzaStatiPagamentoProgetto` `usecases/pagamenti.js:105` | pagamento `annullato`/scollegato | azzera `DataPagamento`; riallinea |
| `RICALCOLA_IN_PAGAMENTO` | `in_pagamento` | `sincronizzaStatiPagamentoProgetto` `usecases/pagamenti.js:105` | pagamento `in_pagamento`         | azzera `DataPagamento`; riallinea |

### Chi lo legge

- `STATI_GIUSTIFICATIVO_CONTABILI` (erogabile, `TotaleVerificato`).
- Stato riga "Pagato" (`utils/statoRiga.js:83`).
- Dashboard ed erogazioni famiglia (`famiglie.store`).

### Test

- Macchina: `tests/unit/state-machines/giustificativo.test.js`.
- Use case: `usecases/pagamenti.test.js` (`sincronizzaStatiPagamentoProgetto`:
  pagamento `pagato`, cap raggiunto), `usecases/sincronizzazione.test.js`.
- E2E: `PAG-50`.

### Anomalie

Nessuna.

### Esito

**Confermato.**

---

## #15 — Progetto · `proposto`

**Significato**: progetto in fase manuale iniziale. **Tipo**: manuale/iniziale.

### Entrate

| Da  | Evento | Use case          | Entry point UI | Side-effect                               |
| --- | ------ | ----------------- | -------------- | ----------------------------------------- |
| —   | —      | **nessun evento** | —              | `proposto` non è creato da alcun use case |

`creaProgetto` (`usecases/progetti.js:75`) crea direttamente in `accettato`
(normalizzazione del legacy `aperto`): la fase manuale non viene percorsa alla
creazione. `proposto` resta raggiungibile solo da dati esterni/legacy o dal tool
Admin via `ripara`.

### Uscite

| Evento   | A          | Use case                                         | Entry point UI      | Side-effect                |
| -------- | ---------- | ------------------------------------------------ | ------------------- | -------------------------- |
| `VALIDA` | `validato` | **mai emesso**                                   | —                   | —                          |
| `ripara` | qualunque  | `applicaStatoProgetto` `usecases/progetti.js:89` | Admin → Consistenza | bypassa la raggiungibilità |

### Chi lo legge

- `calcolaStatoProgetto` (`utils/statoProgetto.js:62`): fase manuale invariata.
- Dashboard (`perStatoProgetto`, ordine `DashboardPage.vue:218`).
- `STATI_PROGETTO_OPERATIVI` lo esclude: non è operativo (guardia giustificativi).

### Test

- Macchina: `tests/unit/state-machines/progetto.test.js` (`proposto→validato`
  valido; le altre invalide).
- Use case: nessun test che emetta `VALIDA` (non esiste il percorso).

### Anomalie

**Evento dichiarato ma mai emesso**: `VALIDA` (e a catena `APPROVA`, `ACCETTA`,
vedi #16/#17). La progressione manuale `proposto→validato→approvato→accettato`
**non è implementata nel codice**; il tool Admin usa `ripara`. Da decidere:
(o) implementare gli eventi con un entry point dedicato, (o) rimuoverli dalla
macchina, (o) dichiarare il tool Admin come unica via e allineare la macchina.
→ #C6.

### Esito

**Confermato.** Anomalia #C6 risolta implementando il workflow:
`avanzaStatoProgetto` (`usecases/progetti.js`), manager da `RendicontazioneTab`.

---

## #16 — Progetto · `validato`

**Significato**: progetto validato (secondo step della fase manuale). **Tipo**:
manuale/intermedio.

### Entrate

| Da         | Evento   | Use case                                                      | Entry point UI                                            | Side-effect          |
| ---------- | -------- | ------------------------------------------------------------- | --------------------------------------------------------- | -------------------- |
| `proposto` | `VALIDA` | `avanzaStatoProgetto` `usecases/progetti.js:104` (`transita`) | `RendicontazioneTab` (bottone "Valida progetto", manager) | nessuno (solo stato) |

### Uscite

| Evento    | A           | Use case                                                      | Entry point UI                                    | Side-effect                |
| --------- | ----------- | ------------------------------------------------------------- | ------------------------------------------------- | -------------------------- |
| `APPROVA` | `approvato` | `avanzaStatoProgetto` `usecases/progetti.js:104` (`transita`) | `RendicontazioneTab` (bottone "Approva progetto") | nessuno (solo stato)       |
| `ripara`  | qualunque   | `applicaStatoProgetto` `usecases/progetti.js:89`              | Admin → Consistenza                               | bypassa la raggiungibilità |

### Chi lo legge

- `calcolaStatoProgetto` (`utils/statoProgetto.js:62`): fase manuale invariata.
- Dashboard (`perStatoProgetto`); escluso da `STATI_PROGETTO_OPERATIVI`.

### Test

- Macchina: `tests/unit/state-machines/progetto.test.js`.
- Use case: `usecases/progetti.test.js` (`avanzaStatoProgetto`).
- Store: `stores/pagamenti.store.test.js`.
- Component: `pages/VerificaPage.test.js`.

### Anomalie

Nessuna (dopo #C6).

### Esito

**Confermato.**

---

## #17 — Progetto · `approvato`

**Significato**: progetto approvato (terzo step della fase manuale). **Tipo**:
manuale/intermedio.

### Entrate

| Da         | Evento    | Use case                                                      | Entry point UI                                             | Side-effect          |
| ---------- | --------- | ------------------------------------------------------------- | ---------------------------------------------------------- | -------------------- |
| `validato` | `APPROVA` | `avanzaStatoProgetto` `usecases/progetti.js:104` (`transita`) | `RendicontazioneTab` (bottone "Approva progetto", manager) | nessuno (solo stato) |

### Uscite

| Evento    | A           | Use case                                                      | Entry point UI                                    | Side-effect                |
| --------- | ----------- | ------------------------------------------------------------- | ------------------------------------------------- | -------------------------- |
| `ACCETTA` | `accettato` | `avanzaStatoProgetto` `usecases/progetti.js:104` (`transita`) | `RendicontazioneTab` (bottone "Accetta progetto") | nessuno (solo stato)       |
| `ripara`  | qualunque   | `applicaStatoProgetto` `usecases/progetti.js:89`              | Admin → Consistenza                               | bypassa la raggiungibilità |

### Chi lo legge

- `calcolaStatoProgetto` (`utils/statoProgetto.js:62`): fase manuale invariata.
- Dashboard (`perStatoProgetto`); escluso da `STATI_PROGETTO_OPERATIVI`.

### Test

- Macchina: `tests/unit/state-machines/progetto.test.js`.
- Use case: `usecases/progetti.test.js` (`avanzaStatoProgetto`).
- Store: `stores/pagamenti.store.test.js`.
- Component: `pages/VerificaPage.test.js`.

### Anomalie

Nessuna.

### Esito

**Confermato.**

---

## #18 — Progetto · `accettato`

**Significato**: progetto accettato; **stato operativo** di base (si possono
inserire giustificativi). **Tipo**: operativo.

### Entrate

| Da                                         | Evento                | Use case                                                                                                               | Entry point UI                        | Side-effect                            |
| ------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------- |
| (create)                                   | —                     | `creaConStato` in `creaProgetto` `usecases/progetti.js:75`                                                             | `CreaProgettoPage` (admin)            | crea il progetto                       |
| `approvato`                                | `ACCETTA`             | `avanzaStatoProgetto` `usecases/progetti.js:104` (`transita`)                                                          | `RendicontazioneTab` (manager)        | nessuno (solo stato)                   |
| `in_rendicontazione` / `rimborso_parziale` | `RICALCOLA_ACCETTATO` | `syncProgettoAggregati` `usecases/progetti.js:51` / `ricalcolaTotaliProgetto` `usecases/pagamenti.js:169` (`transita`) | (ricalcolo)                           | ricalcola gli aggregati                |
| `chiuso`                                   | `RIAPRI`              | `riapriProgetto` `usecases/pagamenti.js:536` (`transita`)                                                              | `RendicontazioneTab` / `PagamentiTab` | azzera `DataChiusura`/`MotivoChiusura` |
| legacy `aperto`/NULL                       | `ripara`              | `syncProgettoAggregati` `usecases/progetti.js:40`                                                                      | (normalizzazione)                     | allinea a `accettato`                  |

### Uscite

| Evento                         | A                    | Use case                                                  | Entry point UI          | Side-effect                     |
| ------------------------------ | -------------------- | --------------------------------------------------------- | ----------------------- | ------------------------------- |
| `RICALCOLA_IN_RENDICONTAZIONE` | `in_rendicontazione` | `syncProgettoAggregati` / `ricalcolaTotaliProgetto`       | (giustificativi validi) | ricalcola aggregati             |
| `RICALCOLA_RIMBORSO_PARZIALE`  | `rimborso_parziale`  | `ricalcolaTotaliProgetto`                                 | (0 < pagato < allocato) | ricalcola aggregati             |
| `RICALCOLA_CHIUSO`             | `chiuso`             | `ricalcolaTotaliProgetto` → `chiudiProgetto`              | (pagato ≥ allocato)     | `DataChiusura`/`MotivoChiusura` |
| `CHIUDI`                       | `chiuso`             | `chiudiProgetto` `usecases/pagamenti.js:520` (`transita`) | `RendicontazioneTab`    | chiusura manuale                |

### Chi lo legge

- `STATI_PROGETTO_OPERATIVI` (`utils/constants.js:69`): abilita i giustificativi
  (guardia in `_creaGiustificativoRecord`).
- Stato riga e dashboard.

### Test

- Macchina: `tests/unit/state-machines/progetto.test.js`.
- Use case: `usecases/progetti.test.js` (`syncProgettoAggregati`, `avanzaStatoProgetto`),
  `usecases/pagamenti.test.js` (`ricalcolaTotaliProgetto`, `chiudiProgetto`, `riapriProgetto`).
- Store: `stores/pagamenti.store.test.js`.
- E2E: `verifica.spec.js`, `pagamenti-crud.spec.js`.

### Anomalie

Nessuna.

### Esito

**Confermato.**

---

## #19 — Progetto · `in_rendicontazione`

**Significato**: progetto con giustificativi validi (rendicontazione avviata).
**Tipo**: operativo.

### Entrate

| Da                                | Evento                         | Use case                                                                                                               | Entry point UI                                         | Side-effect             |
| --------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------- |
| `accettato` / `rimborso_parziale` | `RICALCOLA_IN_RENDICONTAZIONE` | `syncProgettoAggregati` `usecases/progetti.js:51` / `ricalcolaTotaliProgetto` `usecases/pagamenti.js:169` (`transita`) | creazione/verifica giustificativi; ricalcoli pagamenti | ricalcola gli aggregati |

### Uscite

| Evento                        | A                   | Use case                                                  | Entry point UI                 | Side-effect         |
| ----------------------------- | ------------------- | --------------------------------------------------------- | ------------------------------ | ------------------- |
| `RICALCOLA_ACCETTATO`         | `accettato`         | `syncProgettoAggregati` / `ricalcolaTotaliProgetto`       | (nessun giustificativo valido) | ricalcola aggregati |
| `RICALCOLA_RIMBORSO_PARZIALE` | `rimborso_parziale` | `ricalcolaTotaliProgetto`                                 | (0 < pagato < allocato)        | ricalcola aggregati |
| `RICALCOLA_CHIUSO`            | `chiuso`            | `ricalcolaTotaliProgetto` → `chiudiProgetto`              | (pagato ≥ allocato)            | `DataChiusura`      |
| `CHIUDI`                      | `chiuso`            | `chiudiProgetto` `usecases/pagamenti.js:520` (`transita`) | `RendicontazioneTab`           | chiusura manuale    |

### Chi lo legge

- `STATI_PROGETTO_OPERATIVI` (`utils/constants.js:69`): resta operativo.
- `StatoRendicontazione` (selettore) e stato riga.

### Test

- Macchina: `tests/unit/state-machines/progetto.test.js`.
- Use case: `usecases/progetti.test.js` (`syncProgettoAggregati`: `accettato→in_rendicontazione`),
  `usecases/pagamenti.test.js`.
- E2E: `verifica.spec.js`.

### Anomalie

Nessuna.

### Esito

**Confermato.**

---

## #20 — Progetto · `rimborso_parziale`

**Significato**: progetto con pagamenti parziali (`0 < pagato < allocato`); resta
**operativo** (si possono ancora inserire giustificativi). **Tipo**: operativo.

### Entrate

| Da                                 | Evento                        | Use case                                                                                                               | Entry point UI                               | Side-effect         |
| ---------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------- |
| `accettato` / `in_rendicontazione` | `RICALCOLA_RIMBORSO_PARZIALE` | `syncProgettoAggregati` `usecases/progetti.js:51` / `ricalcolaTotaliProgetto` `usecases/pagamenti.js:169` (`transita`) | transizioni pagamento (`segna*`) / ricalcoli | ricalcola aggregati |

### Uscite

| Evento                         | A                    | Use case                                                  | Entry point UI                                     | Side-effect         |
| ------------------------------ | -------------------- | --------------------------------------------------------- | -------------------------------------------------- | ------------------- |
| `RICALCOLA_ACCETTATO`          | `accettato`          | `syncProgettoAggregati` / `ricalcolaTotaliProgetto`       | (nessun giustificativo valido / pagamenti rimossi) | ricalcola aggregati |
| `RICALCOLA_IN_RENDICONTAZIONE` | `in_rendicontazione` | `syncProgettoAggregati` / `ricalcolaTotaliProgetto`       | (giustificativi validi, pagato 0)                  | ricalcola aggregati |
| `RICALCOLA_CHIUSO`             | `chiuso`             | `ricalcolaTotaliProgetto` → `chiudiProgetto`              | (pagato ≥ allocato)                                | `DataChiusura`      |
| `CHIUDI`                       | `chiuso`             | `chiudiProgetto` `usecases/pagamenti.js:520` (`transita`) | `RendicontazioneTab`                               | chiusura manuale    |

### Chi lo legge

- `STATI_PROGETTO_OPERATIVI` (`utils/constants.js:69`): **operativo** (a
  differenza di `chiuso`).
- `ricalcolaProposta` elabora anche il parziale (nuovi verificati → nuove proposte).
- Dashboard e stato riga.

### Test

- Macchina: `tests/unit/state-machines/progetto.test.js`.
- Use case: `usecases/pagamenti.test.js` (`ricalcolaTotaliProgetto`:
  transizione a `rimborso_parziale` senza `DataChiusura`),
  `usecases/progetti.test.js`.
- E2E: `verifica.spec.js` (imposta `rimborso_parziale` via API).

### Anomalie

Nessuna.

### Esito

**Confermato.**

---

## #21 — Progetto · `chiuso`

**Significato**: progetto chiuso; **unico stato finale**. **Tipo**: terminale
(**sticky**: `calcolaStatoProgetto` non lo retrocede).

### Entrate

| Da                                                       | Evento                    | Use case                                                                              | Entry point UI                                           | Side-effect                                                             |
| -------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `accettato` / `in_rendicontazione` / `rimborso_parziale` | `RICALCOLA_CHIUSO` (auto) | `ricalcolaTotaliProgetto` → `chiudiProgetto` `usecases/pagamenti.js:520` (`transita`) | pagato ≥ allocato (`segnaPagato`)                        | `DataChiusura` + `MotivoChiusura` "Importo allocato interamente pagato" |
| operativi                                                | `CHIUDI` (manuale)        | `chiudiProgetto` `usecases/pagamenti.js:520` (`transita`)                             | `RendicontazioneTab` (dialog "Chiudi progetto" + motivo) | `DataChiusura` + `MotivoChiusura`                                       |
| qualunque                                                | `ripara`                  | `applicaStatoProgetto` `usecases/progetti.js:89`                                      | Admin → Consistenza                                      | bypassa la raggiungibilità                                              |

### Uscite

| Evento   | A           | Use case                                                  | Entry point UI                        | Side-effect                            |
| -------- | ----------- | --------------------------------------------------------- | ------------------------------------- | -------------------------------------- |
| `RIAPRI` | `accettato` | `riapriProgetto` `usecases/pagamenti.js:536` (`transita`) | `RendicontazioneTab` / `PagamentiTab` | azzera `DataChiusura`/`MotivoChiusura` |

### Chi lo legge

- `STATI_PROGETTO_FINALI` (`utils/constants.js:77`) e dashboard (`chiusi`).
- `ricalcolaProposta` salta i progetti `chiuso`.
- Stato riga e guardia giustificativi (non operativo).

### Test

- Macchina: `tests/unit/state-machines/progetto.test.js`.
- Use case: `usecases/pagamenti.test.js` (`ricalcolaTotaliProgetto`: chiusura automatica).
- Store: `stores/pagamenti.store.test.js`.
- E2E: `verifica.spec.js`, `pagamenti-crud.spec.js`.

### Anomalie

**Gap test**: `chiudiProgetto` e `riapriProgetto` senza unit test diretto
(coperti solo indirettamente dalla chiusura automatica e da store mock) → #C7.

### Esito

**Confermato.** Gap test coperto: vedi Correzioni proposte (#C7).

---

## Correzioni proposte

### #C1 — Unit test diretti per `scartaSubmission` / `ripristinaSubmission`

- **Origine**: stato #3 (Submission `scartato`).
- **Problema**: i due use case erano coperti solo da store mock + E2E.
- **Piano**: in `tests/unit/usecases/giustificativi.test.js`, mock
  `getSubmissionById` + `updateSubmission`; casi:
  1. scarta da `inserito` → patch `{ note_riconciliazione, stato: 'scartato' }`;
  2. scarta da `inviato` → `TransizioneNonValidaError`, nessuna scrittura;
  3. ripristina da `scartato` → patch `{ note_riconciliazione: null, stato: 'inserito' }`;
  4. ripristina da `inserito` → `TransizioneNonValidaError`, nessuna scrittura.
- **Stato**: **fatto**.

### #C2 — Unit test diretti per `ripristinaProposto`

- **Origine**: stato #4 (Pagamento `proposto`).
- **Problema**: `ripristinaProposto` coperto solo da store mock.
- **Piano**: in `tests/unit/usecases/pagamenti.test.js`, mock `getPagamenti`
  (`annullato`) + `updatePagamento`; casi:
  1. da `annullato` → patch `{ Stato: 'proposto', Batch: null }`;
  2. da stato non valido (es. `pagato`) → `TransizioneNonValidaError`, nessuna scrittura.
- **Stato**: **fatto**.

### #C3 — Unit test diretti per `segnaFallito` / `ripristinaInPagamento`

- **Origine**: stato #5 (Pagamento `in_pagamento`).
- **Problema**: coperti solo da store mock + E2E.
- **Piano**: in `tests/unit/usecases/pagamenti.test.js`, mock `getPagamenti` +
  `updatePagamento`; casi:
  1. `segnaFallito` da `in_pagamento` → patch `{ Stato: 'fallito', NoteEsito }`;
  2. `segnaFallito` da `proposto` → `TransizioneNonValidaError`, nessuna scrittura;
  3. `ripristinaInPagamento` da `fallito` → patch `{ Stato: 'in_pagamento', NoteEsito: null }`;
  4. `ripristinaInPagamento` da `pagato` → `TransizioneNonValidaError`, nessuna scrittura.
- **Stato**: **fatto**.

### #C4 — Unit test diretto per `correggiDati`

- **Origine**: stato #7 (Pagamento `fallito`).
- **Problema**: `correggiDati` coperto solo da store mock + E2E.
- **Piano**: in `tests/unit/usecases/pagamenti.test.js`, mock `getPagamenti` +
  `updatePagamento` + `famiglieService.update`; casi:
  1. da `fallito` → aggiorna `Pagamenti` e `Famiglie` (IBAN + Intestatario);
  2. da stato non `fallito` → throw "Solo pagamenti falliti sono modificabili", nessuna scrittura.
- **Stato**: **fatto**.

### #C5 — Unit test diretto per `rifiutaGiustificativo`

- **Origine**: stato #10 (Giustificativo `inviato`).
- **Problema**: `rifiutaGiustificativo` coperto solo da store mock + E2E.
- **Piano**: in `tests/unit/usecases/giustificativi.test.js`, mock `getById`
  (`inviato`) + `update` + `getProgettoById`/`getGiustificativiByProgetto` per
  `syncProgettoAggregati`; casi:
  1. da `inviato` → patch `{ Stato: 'rifiutato', NotaRifiuto, Pagamento: null }`;
  2. da `draft` → `TransizioneNonValidaError`, nessuna scrittura.
- **Stato**: **fatto**.

### #C6 — Decisione: progressione manuale progetto (`VALIDA`/`APPROVA`/`ACCETTA`)

- **Origine**: stati #15/#16/#17 (Progetto fase manuale).
- **Problema**: gli eventi sono dichiarati nella macchina ma **mai emessi**; il
  tool Admin usa `ripara` (bypassa la raggiungibilità).
- **Opzioni**:
  1. implementare un entry point che emetta `VALIDA`/`APPROVA`/`ACCETTA`;
  2. rimuovere gli eventi dalla macchina (fase manuale solo via `ripara`);
  3. lasciare `ripara` come unica via e documentarlo.
- **Decisione**: **requisito reale → opzione 1**. Implementato `avanzaStatoProgetto`
  (use case + store + bottone manager in `RendicontazioneTab`); creazione resta
  `accettato`; solo avanti. Directus dev/prod verificati: `StatoProgetto` ammette
  `proposto/validato/approvato/accettato`.
- **Stato**: **fatto**.

### #C7 — Unit test diretti per `chiudiProgetto` / `riapriProgetto`

- **Origine**: stato #21 (Progetto `chiuso`).
- **Problema**: coperti solo indirettamente (chiusura automatica) e da store mock.
- **Piano**: in `tests/unit/usecases/pagamenti.test.js`, mock `progettiService.getById`
  - `updateStats`; casi:
  1. `chiudiProgetto` manuale da `accettato` → patch con `StatoProgetto:'chiuso'`, `DataChiusura`, `MotivoChiusura`;
  2. `chiudiProgetto({ automatica:true })` → `MotivoChiusura` "Importo allocato interamente pagato";
  3. `riapriProgetto` da `chiuso` → patch `{ StatoProgetto:'accettato', DataChiusura:null, MotivoChiusura:null }`;
  4. `riapriProgetto` da non `chiuso` → `TransizioneNonValidaError`.
- **Stato**: **fatto**.

---

## Esito revisione

- **Stati revisionati**: 21/21, tutti **confermato**.
- **Anomalia di sostanza**: 1 (#C6) — la progressione manuale del progetto era
  dichiarata ma non implementata → **implementata** (`avanzaStatoProgetto` +
  bottone manager in `RendicontazioneTab`).
- **Gap di test coperti**: #C1–#C5 e #C7 (6 unit test diretti aggiunti per use case
  che ne erano privi).
- **Nessuna** transizione illegale o scrittura di stato fuori dal layer macchina
  rilevata.
- **Limite noto**: la submission usa il campo lowercase `stato`, non coperto dalla
  regola ESLint (che vieta `Stato`/`StatoProgetto`); le sue transizioni passano
  comunque da `transita`.
- **Directus**: `Progetti.StatoProgetto` ammette `proposto/validato/approvato/accettato`
  (verificato su dev e prod); nessuna modifica di schema richiesta.
