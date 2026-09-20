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

La creazione di un giustificativo passa da UN solo primitivo interno
`_creaGiustificativoRecord` (`src/usecases/giustificativi.js`): guardia
"progetto operativo" + create + `syncProgettoAggregati`. Gli ingressi reali sono:
volontario (FamigliePage → GiustificativoList → `creaGiustificativo`),
verificatore (VerificaPage → RendicontazioneTab → `creaGiustificativo`) e
riconciliazione (RiconciliazionePage → `riconciliaSubmission`, che usa il
primitivo). Il **modulo libero (non loggato)** NON crea giustificativi: accoda
con `creaSubmission` e la materializzazione avviene alla riconciliazione (manager).

| Azione                  | Use case                      | Entry point                               | Stato    |
| ----------------------- | ----------------------------- | ----------------------------------------- | -------- |
| Crea giustificativo     | `creaGiustificativo`          | GiustificativoList / RendicontazioneTab   | estratto |
| Invia giustificativo    | `inviaGiustificativo`         | GiustificativoList                        | estratto |
| Aggiorna giustificativo | `aggiornaGiustificativo`      | GiustificativoList                        | estratto |
| Aggiorna campo          | `aggiornaCampoGiustificativo` | GiustificativoList / RendicontazioneTab   | estratto |
| Invalida giustificativo | `invalidaGiustificativo`      | GiustificativoList                        | estratto |
| Verifica giustificativo | `verificaGiustificativo`      | RendicontazioneTab                        | estratto |
| Rifiuta giustificativo  | `rifiutaGiustificativo`       | RendicontazioneTab                        | estratto |
| Riconcilia submission   | `riconciliaSubmission`        | RiconciliazionePage (usa il primitivo)    | estratto |
| Scarta submission       | `scartaSubmission`            | RiconciliazionePage                       | estratto |
| Ripristina submission   | `ripristinaSubmission`        | RiconciliazionePage                       | estratto |
| Crea submission         | `creaSubmission`              | SubmitPage (pubblico, non loggato → coda) | estratto |

### Invariante condiviso

Ogni mutazione di giustificativo termina con `syncProgettoAggregati(progettoId)`
(vedi Area Progetti): ricalcola `TotaleGiustificativi`, `TotaleImporto`,
`StatoRendicontazione`, `StatoProgetto` da dati freschi e li persiste su
`Progetti`. `StatoProgetto` è scritto tramite la macchina (`transita`/`ripara`);
gli altri derivati nella stessa patch. La PATCH dal flusso volontario è abilitata
dal permesso Directus field-scoped.

### Unico scrittore di stato (macchine a stati)

Ogni cambio di `Stato`/`StatoProgetto` passa da `src/usecases/stato/transita.js`
(`transita`/`creaConStato`/`creaConStatoIniziale`/`ripara`), che valida l'evento
con la macchina in `src/state-machines/` e poi scrive via service. I service non
scrivono stato; i derivati restano selettori puri. Enforcement: ESLint
`no-restricted-syntax` vieta i literal `Stato`/`StatoProgetto` fuori da
`state-machines/` e `usecases/stato/`.

### Guardia comune

La guardia **progetto non operativo** (stato in `STATI_PROGETTO_OPERATIVI` =
`accettato`, `in_rendicontazione`, `rimborso_parziale`) è nel
primitivo `_creaGiustificativoRecord`: vale per **tutti** gli ingressi, inclusa la
riconciliazione. I **draft** non contano come giustificativi validi per lo stato
(`hasValidGiustificativi`). `rimborso_parziale` è operativo (la famiglia può
completare la rendicontazione); `chiuso` è l'unico stato finale.

---

## Area Progetti — `src/usecases/progetti.js` (sync) + `src/usecases/pagamenti.js` (chiudi/riapri)

| Azione                            | Use case                    | Entry point                                                                        | Stato    |
| --------------------------------- | --------------------------- | ---------------------------------------------------------------------------------- | -------- |
| Sincronizza aggregati             | `syncProgettoAggregati`     | ogni mutazione giustificativo                                                      | estratto |
| Crea progetto                     | `creaProgetto`              | Admin CreaProgettoPage                                                             | estratto |
| Avanza stato manuale              | `avanzaStatoProgetto`       | RendicontazioneTab (manager)                                                       | estratto |
| Chiudi progetto                   | `chiudiProgetto`            | RendicontazioneTab / PagamentiTab                                                  | estratto |
| Riapri progetto                   | `riapriProgetto`            | PagamentiTab                                                                       | estratto |
| Applica stato (tool Admin)        | `applicaStatoProgetto`      | Admin → Consistenza → Trasformazioni (`auth.store.applyStatoProgettoById`)         | estratto |
| Sync stati pagamento (tool Admin) | `sincronizzaStatiPagamento` | Admin → Consistenza → Sincronizza stati pagamento (`usecases/sincronizzazione.js`) | estratto |
| Aggiorna beneficiario             | `aggiornaBeneficiario`      | Admin Utenti (`admin.store.updateProgettoBeneficiario`)                            | in store |

---

## Area Pagamenti — `src/usecases/pagamenti.js` ✅ estratto (core)

| Azione                    | Use case                            | Entry point                                   | Stato                                            |
| ------------------------- | ----------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| Ricalcola proposta        | `ricalcolaProposta`                 | Verifica / PagamentiTab                       | estratto                                         |
| Ricalcola proposte (bulk) | `ricalcolaPropostiDaProgetti`       | PagamentiTab                                  | estratto                                         |
| Ricalcola totali progetto | `ricalcolaTotaliProgetto`           | `segnaPagato`/`segnaFallito`/`segnaAnnullato` | estratto                                         |
| Riallinea stati pagamento | `sincronizzaStatiPagamentoProgetto` | transizioni pagamento                         | estratto (idempotente)                           |
| Segna in pagamento        | `segnaInPagamento`                  | `creaBatch` (store)                           | estratto                                         |
| Ripristina proposto       | `ripristinaProposto`                | PagamentiTab                                  | estratto                                         |
| Segna pagato              | `segnaPagato`                       | PagamentiTab                                  | estratto (side-effect: `inviaNotificaPagamento`) |
| Segna fallito             | `segnaFallito`                      | PagamentiTab                                  | estratto                                         |
| Segna annullato           | `segnaAnnullato`                    | PagamentiTab                                  | estratto                                         |
| Ripristina in pagamento   | `ripristinaInPagamento`             | PagamentiTab                                  | estratto                                         |
| Correggi dati pagamento   | `correggiDati`                      | PagamentiTab                                  | estratto                                         |
| Invia notifica pagamento  | `inviaNotificaPagamento`            | side-effect di `segnaPagato`                  | estratto                                         |
| Crea batch                | `creaBatch`                         | PagamentiTab                                  | in store (batch/CSV, UI-coupled)                 |
| Aggiorna lista batch      | `_aggiornaListaBatch`               | `creaBatch`/`segnaFallito`/`segnaAnnullato`   | in store (CSV)                                   |
| Elimina lista             | `eliminaLista`                      | PagamentiTab                                  | in store                                         |

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
