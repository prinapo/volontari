# Catalogo Use Case

Mappa di **tutte le azioni di business** dell'app (scritture con side-effect), i
punti di ingresso che le innescano e la loro implementazione. Ogni azione deve
avere **una sola** implementazione in `src/usecases/`, invocata da qualunque
entry point: così ogni azione fa esattamente la stessa cosa (stessi controlli,
stessi side-effect) da qualunque parte la si inneschi.

## Struttura a strati

| Strato          | Contenuto                   | Regola                                                                    |
| --------------- | --------------------------- | ------------------------------------------------------------------------- |
| `src/usecases/` | Casi d'uso di business      | Una funzione per azione; orchestrazione + side-effect obbligatori         |
| `src/services/` | Chiamate API Directus       | Nessuna logica di business                                                |
| `src/utils/`    | Funzioni pure (derivazioni) | Nessuna I/O                                                               |
| `src/stores/`   | Adapter UI                  | Stato locale Pinia + chiamata allo use case + aggiornamento dal risultato |
| Componenti/Page | Solo presentazione          | Chiamano lo store, mai API dirette                                        |

Ogni use case ha firma `fn(payload, { origine })` dove `origine` identifica il
punto di ingresso (es. `volontario`, `modulo_libero`, `verificatore`) e serve
**solo** per audit/permessi — mai per eseguire logica diversa.

## Legenda stato

- `estratto` — implementato in `src/usecases/`, gli entry point lo chiamano
- `in store` — resta nella store (batch/CSV o fortemente accoppiato alla UI); da valutare in iterazioni future
- `escluso` — resta fuori dal layer use case (infrastruttura)

---

## Area Giustificativi — `src/usecases/giustificativi.js` ✅ estratto

L'azione "crea giustificativo" ha **3 ingressi**: volontario (FamigliePage →
GiustificativoList), verificatore (VerificaPage → RendicontazioneTab) e modulo
libero (SubmitPage → coda → RiconciliazionePage). Tutti passano dallo stesso
use case.

| Azione                  | Use case                      | Entry point                                               | Stato    |
| ----------------------- | ----------------------------- | --------------------------------------------------------- | -------- |
| Crea giustificativo     | `creaGiustificativo`          | GiustificativoList / RendicontazioneTab / Riconciliazione | estratto |
| Invia giustificativo    | `inviaGiustificativo`         | GiustificativoList                                        | estratto |
| Aggiorna giustificativo | `aggiornaGiustificativo`      | GiustificativoList                                        | estratto |
| Aggiorna campo          | `aggiornaCampoGiustificativo` | GiustificativoList / RendicontazioneTab                   | estratto |
| Invalida giustificativo | `invalidaGiustificativo`      | GiustificativoList                                        | estratto |
| Verifica giustificativo | `verificaGiustificativo`      | RendicontazioneTab                                        | estratto |
| Rifiuta giustificativo  | `rifiutaGiustificativo`       | RendicontazioneTab                                        | estratto |
| Riconcilia submission   | `riconciliaSubmission`        | RiconciliazionePage                                       | estratto |
| Scarta submission       | `scartaSubmission`            | RiconciliazionePage                                       | estratto |
| Ripristina submission   | `ripristinaSubmission`        | RiconciliazionePage                                       | estratto |

### Invariante condiviso

Ogni mutazione di giustificativo termina con `syncProgettoAggregati(progettoId)`
(vedi Area Progetti): ricalcola `TotaleGiustificativi`, `TotaleImporto`,
`StatoRendicontazione`, `StatoProgetto` da dati freschi e li PATCHa su `Progetti`.
La PATCH dal flusso volontario è abilitata dal permesso Directus field-scoped.

### Guardia comune

`creaGiustificativo` applica la guardia **progetto non operativo** (stato in
`STATI_PROGETTO_OPERATIVI`), identica per tutti gli ingressi. I **draft** non
contano come giustificativi validi per lo stato (`hasValidGiustificativi`).

---

## Area Progetti — `src/usecases/progetti.js` (sync) + `src/usecases/pagamenti.js` (chiudi/riapri)

| Azione                     | Use case                | Entry point                                                                | Stato    |
| -------------------------- | ----------------------- | -------------------------------------------------------------------------- | -------- |
| Sincronizza aggregati      | `syncProgettoAggregati` | ogni mutazione giustificativo                                              | estratto |
| Chiudi progetto            | `chiudiProgetto`        | RendicontazioneTab / PagamentiTab                                          | estratto |
| Riapri progetto            | `riapriProgetto`        | PagamentiTab                                                               | estratto |
| Applica stato (tool Admin) | `applicaStatoProgetto`  | Admin → Consistenza → Trasformazioni (`auth.store.applyStatoProgettoById`) | in store |
| Aggiorna beneficiario      | `aggiornaBeneficiario`  | Admin Utenti (`admin.store.updateProgettoBeneficiario`)                    | in store |

---

## Area Pagamenti — `src/usecases/pagamenti.js` ✅ estratto (core)

| Azione                    | Use case                  | Entry point                                   | Stato                                            |
| ------------------------- | ------------------------- | --------------------------------------------- | ------------------------------------------------ |
| Ricalcola proposta        | `ricalcolaProposta`       | Verifica / PagamentiTab                       | estratto                                         |
| Ricalcola totali progetto | `ricalcolaTotaliProgetto` | `segnaPagato`/`segnaFallito`/`segnaAnnullato` | estratto                                         |
| Ripristina proposto       | `ripristinaProposto`      | PagamentiTab                                  | estratto                                         |
| Segna pagato              | `segnaPagato`             | PagamentiTab                                  | estratto (side-effect: `inviaNotificaPagamento`) |
| Segna fallito             | `segnaFallito`            | PagamentiTab                                  | estratto                                         |
| Segna annullato           | `segnaAnnullato`          | PagamentiTab                                  | estratto                                         |
| Ripristina in pagamento   | `ripristinaInPagamento`   | PagamentiTab                                  | estratto                                         |
| Correggi dati pagamento   | `correggiDati`            | PagamentiTab                                  | estratto                                         |
| Invia notifica pagamento  | `inviaNotificaPagamento`  | side-effect di `segnaPagato`                  | estratto                                         |
| Crea batch                | `creaBatch`               | PagamentiTab                                  | in store (batch/CSV, UI-coupled)                 |
| Aggiorna lista batch      | `_aggiornaListaBatch`     | `creaBatch`/`segnaFallito`/`segnaAnnullato`   | in store (CSV)                                   |
| Elimina lista             | `eliminaLista`            | PagamentiTab                                  | in store                                         |

---

## Area Famiglie / Contatti — `src/usecases/famiglie.js` ✅ estratto

| Azione                     | Use case                  | Entry point                               | Stato    |
| -------------------------- | ------------------------- | ----------------------------------------- | -------- |
| Crea famiglia              | `creaFamiglia`            | Gestione                                  | estratto |
| Aggiorna famiglia          | `aggiornaFamiglia`        | Gestione                                  | estratto |
| Crea genitore              | `creaGenitore`            | Gestione                                  | estratto |
| Aggiorna contatto          | `aggiornaContatto`        | Gestione / Riconciliazione                | estratto |
| Assegna a famiglia         | `assegnaAFamiglia`        | Gestione                                  | estratto |
| Rimuovi da famiglia        | `rimuoviDaFamiglia`       | Gestione                                  | estratto |
| Assegna referente          | `assegnaReferente`        | Gestione                                  | estratto |
| Rimuovi referente          | `rimuoviReferente`        | Gestione                                  | estratto |
| Marca referente            | `marcaReferente`          | Gestione                                  | estratto |
| Crea utente per volontario | `creaUtentePerVolontario` | Gestione                                  | estratto |
| Aggiorna IBAN              | `aggiornaIBAN`            | Verifica (`verifica.store.updateBancari`) | in store |

---

## Area Utenti / Admin — `src/usecases/utenti.js` (core) ✅

| Azione                      | Use case                                 | Entry point       | Stato                                                      |
| --------------------------- | ---------------------------------------- | ----------------- | ---------------------------------------------------------- |
| Crea utente                 | `creaUtente`                             | Admin Utenti      | estratto                                                   |
| Aggiorna ruolo              | `aggiornaRuolo`                          | Admin Utenti      | estratto                                                   |
| Reset password              | `resetPasswordUtente`                    | Admin Utenti      | estratto                                                   |
| Invio email custom          | `inviaEmailCustom`                       | Admin Utenti      | estratto                                                   |
| Disabilita/abilita utente   | `disabilitaUtente`/`abilitaUtente`       | Gestione          | estratto                                                   |
| Impersonation start/stop    | `startImpersonation`/`stopImpersonation` | Admin Utenti      | in store (fire-and-forget + Notify, eccezione documentata) |
| Flag/consistenza volontario | `gestisciVolontario`                     | Admin Consistenza | in store                                                   |

---

## Esclusi dal layer use case

| Area                                                                     | Motivazione                                           |
| ------------------------------------------------------------------------ | ----------------------------------------------------- |
| Auth (`login`/`logout`/sessione/`initFromStorage`)                       | Infrastruttura sessione: resta in `auth.store`        |
| Fetch/read (fetchPage, fetchAll, fetchByProgetto, loadFamigliaContacts…) | Nessun side-effect: restano nelle store o nei service |
| Stato UI, ref, dialog, composable UI                                     | Presentazione                                         |

---

## Regole

1. Una nuova azione di business → un nuovo use case in `src/usecases/`, mai logica in store/componenti.
2. Gli entry point passano payload + `{ origine }`; lo use case decide controlli e side-effect.
3. `origine` mai usata per eseguire logica diversa (solo audit/permessi).
4. Ogni use case è testato con unit test (esito identico per ogni origine).
5. Le store non chiamano mai `api.*` direttamente (regola già esistente) e non duplicano logica di business.
