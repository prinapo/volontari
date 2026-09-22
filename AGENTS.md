# Project conventions

## Stack

- Vue 3 + Quasar 2 + Pinia + Axios, plain JS (no TypeScript)
- Vite via @quasar/app-vite
- Backend: Directus 11.x REST API

## Quality toolchain

ESLint 8 | Prettier 3 | Stylelint 16 | commitlint | Husky 9 | lint-staged | knip 5 | Playwright | GitHub Actions | Dependabot

**Nota su knip e template Vue**: knip non traccia i tag usati solo nei template Vue
(es. `<ProgettoDetailDialog />`). Dopo ogni rimozione di import segnalato come
"unused" da knip, verificare SEMPRE che il componente non sia referenziato come tag
in un template prima di eliminare il file/import.

## Comandi chiave

- npm run dev (porta :9000)
- npm run build (dist/spa/)
- npm run lint (ESLint, ora --max-warnings 0)
- npm run lint:css (Stylelint)
- npm run test:e2e (Playwright)
- npm run release (build + FTP deploy)

## Regole ESLint

- Nessun console.log (solo warn/error)
- Nessun warning tollerato
- import/order alfabetico
- Number.parseFloat, String#replaceAll
- Catch parameter = error

## Path aliases

src/ → ./src, stores/, components/, pages/, services/, utils/, boot/

## Pre-commit hooks

.js → ESLint --fix + Prettier
.vue → ESLint --fix
.scss → Stylelint --fix + Prettier
.json, .md → Prettier
Commit message → conventional-changelog

## Store Pinia

- (target futuro: Composition API setup stores — non ancora applicato)
- Stato asincrono: `{ data` (o `data_*`, array/null), `loading`, `error` } — no varianti (isLoading, pending...)
  Eccezione: più flag loading ammessi solo se mappano sezioni UI indipendenti (es. `saving` per submit + `loading` per fetch)
- Naming azioni: verbo+entità in camelCase (fetchX, createX, updateX, deleteX)
  Prefisso `_` solo per azioni private (helper interni allo store)
- Nessuna azione ritorna boolean per successo/fallimento: throw o this.error, mai `return true/false`
  È invece ACCETTABILE ritornare un dato utile (es. l'id della risorsa creata)
- Chiamate sempre via `src/services/`, mai `api.*` diretto nello store
- Errori: `catch (error) { this.error = error.response?.data?.errors?.[0]?.message || error.message || 'Errore generico' }`
  Eccezione: admin.store.js usa Notify.create() direttamente nei catch di
  startImpersonation/stopImpersonation perché i chiamanti sono fire-and-forget
  (@click senza await/try-catch), non c'è altro punto dove intercettare l'errore.
  Non estendere questo pattern ad altre azioni store senza la stessa giustificazione.
- Getters solo per derivare stato esistente, mai per eseguire side effect o chiamate
- Riferimento canonico: `error-log.store.js`

## Use Case (layer di business)

Ogni **azione di business** (scrittura con side-effect) ha UNA sola
implementazione in `src/usecases/`, invocata da qualunque entry point (UI
volontario, modulo libero, verificatore, admin…). Gli ultimi fix hanno
evidenziato il problema che questo strato risolve: la stessa azione (es. "crea
giustificativo") era implementata in store diverse con side-effect incoerenti.

### Struttura a strati

- `src/usecases/` — casi d'uso: una funzione per azione. Firma `fn(payload, ctx)` dove `ctx` (`{ origine }`) è presente SOLO per le azioni con più punti di ingresso (oggi `creaGiustificativo`); le altre hanno firma `fn(payload)`.
- `src/services/` — solo chiamate API Directus (regola invariata)
- `src/utils/` — solo funzioni pure (derivazioni)
- `src/stores/` — **adapter UI**: stato locale Pinia + chiamata allo use case + aggiornamento dal risultato. Niente logica di business duplicata.
- Componenti/Page — solo presentazione (chiamano lo store, mai API dirette)

### Regole

1. Nuova azione di business → nuovo use case in `src/usecases/`, mai logica in store/componenti.
2. Lo use case orchestera: validazione/guardie → scrittura via service → **side-effect obbligatori** → return del risultato.
3. `origine` identifica il punto di ingresso (`volontario`/`modulo_libero`/`verificatore`/…): serve SOLO per audit/permessi, MAI per eseguire logica diversa — ogni azione fa esattamente la stessa cosa da qualunque parte venga innescata.4. Guardie e side-effect obbligatori stanno nello use case (es. `creaGiustificativo` applica la guardia "progetto non operativo" e termina sempre con `syncProgettoAggregati`).
4. Side-effect per **composizione diretta** nello use case, NON via event bus (determinismo e testabilità; a questo volume un bus è overkill).
5. I fetch/read NON sono use case (nessun side-effect): restano nelle store o nei service.
6. **Auth è escluso** dal layer use case: `login`/`logout`/sessione restano in `auth.store` (infrastruttura).
7. Ogni use case ha unit test (uno per azione); per le azioni multi-ingresso, stesso esito asserito per ogni origine.
8. Il catalogo completo azioni → entry point è in `docs/usecases-catalog.md`. Allinearlo a ogni nuova azione/spostamento.

### Invariante giustificativi

Ogni mutazione di giustificativo termina con `syncProgettoAggregati(progettoId)`
(`src/usecases/progetti.js`): ricalcola `TotaleGiustificativi`, `TotaleImporto`,
`StatoRendicontazione`, `StatoProgetto` da dati **freschi** (mai da stato UI) e
li PATCHa su `Progetti`. È idempotente: può girare più volte senza effetti.
La PATCH dal flusso volontario è abilitata dal permesso Directus field-scoped
(solo i 4 campi derivati — vedi "Permesso Volontario su Progetti").

`TotaleVerificato` **non** fa parte di questo payload (per non estendere il
permesso field-scoped del Volontario). Lo aggiorna `ricalcolaTotaliProgetto`
(`src/usecases/pagamenti.js`), che gira a ogni verifica/rifiuto manager
(`ricalcolaProposta`) e nel RICALCOLA bulk; il valore di riga in memoria è
allineato da `recalculateRowTotals` (`verifica.store.js`).

### Stati progetto — operatività e finalità

- `rimborso_parziale` è **operativo**: la famiglia può ancora inserire
  giustificativi fino al rimborso totale e i nuovi verificati generano nuove
  proposte. È incluso in `STATI_PROGETTO_OPERATIVI`.
- `chiuso` è l'**unico stato finale** (`STATI_PROGETTO_FINALI`): sia pagato ≥
  allocato (auto) sia chiusura manuale ("Chiudi progetto", anche con
  pagato < allocato). È **sticky**: `calcolaStatoProgetto` non lo retrocede a
  `rimborso_parziale`.
- `ricalcolaProposta` salta solo i progetti `chiuso`; `ricalcolaPropostiDaProgetti`
  elabora le righe in `STATI_PROGETTO_OPERATIVI` (quindi anche il parziale).
- **Fase manuale** (`proposto → validato → approvato → accettato`): avanzata di uno
  step dal manager via `avanzaStatoProgetto` (`usecases/progetti.js`, evento
  `VALIDA`/`APPROVA`/`ACCETTA`). La creazione (`creaProgetto`) nasce `accettato`;
  la fase manuale serve per i progetti che arrivano in quegli stati (import).
  Solo in avanti; le correzioni manuali vanno fatte direttamente sul DB.

### Stati giustificativo (persistiti, opzione C)

Lo stato è **scritto nel DB** su `Giustificativi.Stato` (non più derivato):

- **Volontario**: `draft` → `inviato` → `verificato` / `rifiutato`
- **Modulo libero** (submission `InviiGiustificativiNoLogin`): `inserito` → al
  riscontro nasce il giustificativo `inviato` (la submission passa a `inviato`);
  `scartato` resta solo sulla submission (nessun giustificativo)
- **Pagamento**: `verificato` → `in_pagamento` (progetto nel batch) → `pagato`

`STATI_GIUSTIFICATIVO_CONTABILI` = `{verificato, in_pagamento, pagato}` è la
costante unica usata da tutti gli aggregati (erogabile, `TotaleVerificato`,
`calcolaStatoRendicontazione`, stato riga, `verifica.store`). Ogni `Stato ===
'verificato'` nei calcoli va sostituito con questa costante.

Collegamento pagamento↔giustificativi: FK `Giustificativi.Pagamento`. Alla
creazione/aggiornamento della proposta `ricalcolaProposta` collega i verificati
non ancora coperti; `segnaInPagamento` li porta a `in_pagamento`; `segnaPagato`
li porta a `pagato` (o tutti, se l'allocato è raggiunto). `segnaFallito`/
`segnaAnnullato` riallineano (annullo → scollega). L'invariante è
`sincronizzaStatiPagamentoProgetto` (`usecases/pagamenti.js`), idempotente.

Nota permessi (dev+prod, DB non git): le policy su `Giustificativi` sono
`fields: ['*']` per Manager e Volontario; il volontario **potrebbe** quindi
scrivere `pagato` via API (non esposto in UI). Hardening field-scoped da
valutare separatamente.

### Stati — unico scrittore (macchine a stati)

Ogni cambio di stato (`Giustificativi.Stato`, `Pagamenti.Stato`,
`Progetti.StatoProgetto`, `InviiGiustificativiNoLogin.stato`) passa
**esclusivamente** dalla primitiva `src/usecases/stato/transita.js`:

- `transita({ machine, statoCorrente, evento, extra, scrivi })` — transizione
  dichiarata; valida con la macchina e scrive la patch.
- `creaConStato` / `creaConStatoIniziale` — creazione con stato dichiarato.

Le macchine vivono in `src/state-machines/` (`giustificativo`, `pagamento`,
`progetto`, `submission`): solo `states`/`on`/`cond`, nessun I/O. Sono la fonte
di verità su **quali** transizioni sono legali; gli stati iniziali sono
dichiarati. `@xstate/fsm` è la sola dipendenza di stato.

Regole:

1. I service non scrivono stato: sono invocati solo dal callback `scrivi` dentro
   `transita`/`creaConStato`. Niente `{ Stato: ... }` o
   `{ StatoProgetto: ... }` altrove — **bloccato da ESLint**
   (`no-restricted-syntax`, eccezioni `state-machines/` e `usecases/stato/`).
   Eventuali `eslint-disable` ammessi solo con motivazione (es. export Excel,
   `Rendicontazioni.Stato` che non è entità a macchina).
2. I valori **derivati** restano selettori puri (`statoRiga.js`,
   `rendicontazione.js`, totali): non sono stati macchina e non si editano a
   mano. `StatoRendicontazione` è persistito ma **non editabile** in UI.
3. Gli stati non si scrivono mai direttamente da store/componenti: gli use case
   orchestrano (`transita` → side-effect → invarianti).
4. `origine` non cambia la logica: la stessa azione produce lo stesso esito da
   ogni entry point.
5. Unit test: `tests/unit/state-machines/` enumera transizioni valide e invalide
   (queste ultime → `TransizioneNonValidaError`).

### Creazione giustificativo (primitivo unico)

La scrittura di un giustificativo passa da UN solo primitivo interno,
`_creaGiustificativoRecord` (`src/usecases/giustificativi.js`): applica la
**guardia "progetto operativo"**, crea il record e termina con
`syncProgettoAggregati`. Lo usano `creaGiustificativo` (volontario/verificatore,
con rendicontazione + upload file) e `riconciliaSubmission` (riconciliazione,
Stato `inviato`, con guardia inclusa). La guardia vale quindi per **tutti** gli
ingressi.

**Modulo libero (utente non loggato)**: NON crea giustificativi. `creaSubmission`
accoda la richiesta in `InviiGiustificativiNoLogin` (`in_attesa`); la
materializzazione in giustificativo avviene solo alla riconciliazione (manager).
SubmitPage passa dallo `submit.store` → `creaSubmission` (mai il service diretto).

## Services (Directus)

- Ogni chiamata a Directus passa da src/services/, mai da componenti o store direttamente
- Gestione errori centralizzata in un unico helper condiviso, mai try/catch ad-hoc duplicato nei singoli service
- Refresh token e logica di auth: gestiti solo da services/auth.js, nessun altro file la reimplementa

## Composable

- Prefisso use*, vivono in src/composables/
- Dipendenze esplicite passate come argomenti/parametri, non import diretto di uno store specifico se il composable deve restare riutilizzabile

## Tabelle server-side

- Usare sempre `useServerTable` (src/composables/useServerTable.js) per QTable con
  `@request`, mai implementare `onRequest` ad-hoc
- `table.loading` / `table.error` del composable sono l'UNICA fonte di verità nel
  template, anche quando `fetchFn` avvolge un'azione store che gestisce
  internamente `store.loading`/`store.error` (es. `store.fetchAll`)
- `loadData()` va chiamato esplicitamente al mount (`onMounted(() => table.loadData())`)
- Search input: `v-model="table.searchTerm"` + `debounce="300"` +
  `@update:model-value="table.onSearchChange"`
- Filtri extra: `table.setFilters({ ... })`

### PagamentiTab (eccezione)

Solo "incorso" usa search + filtro server-side (Batch è FK nativa
filtrabile). Proposti/falliti/liste restano client-side (limit: -1, tutto
in memoria) per due motivi:

1. Dataset piccolo per natura del dominio (~200/anno), rischio di
   risultati fuori pagina basso
2. Le azioni bulk (Crea gruppo, Ripristina) operano su tutti i record
   selezionati e richiederebbero un redesign della selezione (persistente
   cross-pagina o reset al cambio pagina) se si passasse a paginazione
   server-side — costo non giustificato dal volume attuale.

Da rivalutare insieme (intero PagamentiTab a useServerTable, incluso
redesign selezione bulk) solo se il volume annuo cresce
significativamente o se si introduce il filtro per anno già previsto,
che potrebbe cambiare lo scope di questa decisione.

## Prima di generare codice nuovo

Prima di scrivere store, service, composable o test nuovi, cerca nel repo un file esistente dello stesso tipo che risolve un problema simile e replica lo stesso pattern — anche se non è l'approccio di default che useresti. Non introdurre un secondo modo di fare la stessa cosa già gestita altrove nel progetto.

## File di riferimento (pattern canonico)

- Store: <!-- es. src/stores/auth.js -->
- Service: <!-- es. src/services/http.js -->
- Composable: <!-- es. src/composables/useAuth.js -->
- Test: <!-- es. tests/unit/stores/auth.spec.js -->

## Test

- E2E: Playwright, 2 progetti (chromium + mobile Pixel 5)
  Tag: @smoke, @crud, @regression, @visual
- Unit: Vitest, 240 test (stores + services)
- Coverage: Utils 100%, Stores 82%, Services 78%

### Ruoli reali (importante)

Gli unici utenti loggabili dell'app sono **admin**, **manager** e **volontario**
(più `volontario_nofam` per il fixture). **Genitore NON è un utente**: è un ruolo
di contatto (`IsGenitore`) usato solo per associare un contatto alla famiglia
tramite il selettore genitore in Verifica/Riconciliazione. Non esistono utenti
né ruoli separati "Verificatore", "Gestore" o "GestoreVerifica": la verifica e
la gestione le fa il manager.

- Nessun test deve fare `loginAs` con genitore/verificatore/gestore.
- Test che assunvano quei ruoli come login → spostati in `tests/e2e/obsolete/`
  (fuori dal `testDir` di Playwright, NON eseguiti, eslint ignorati).
  Esempio: `obsolete/permissions.spec.js` (PER-01..10). La guardia "manager non
  accede a /admin" è preservata da `RG-06` in `auth.spec.js`.

### Copertura e gap noti

- ~224 test E2E tracciati in `test-status.json` (v3.24.0+), tutti pass
  chromium + mobile.
- Coperti in Fase 2: Admin cambio ruolo (`ADU-04`) e reset password (`ADU-05`),
  ErrorLog segna letto/elimina (`ELG-03/04`), flusso pagamenti completo
  (`PAG-50`: giustificativo verificato → RICALCOLA → creaBatch → segnaPagato).
- Gap documentati (NON coperti, da valutare in iterazioni future):
  - Chiusura automatica progetto (pagato ≥ allocato) e riapertura (`riapriProgetto`)
  - Invio email reale di notifica pagamento (il PATCH a `pagato` è verificato,
    l'email Brevo/SMTP no)
  - Edge: 413 file troppo grande, network error, refresh token concorrente
  - Stato riga Verifica derivato "Pagato"/"In pagamento" (residuo erogabile
    ≤ 0.01) e badge per-giustificativo derivato: la logica è coperta da unit
    test e verificata a mano su dev; manca un E2E che crei uno scenario pagato
    (il flusso PAG-50 lo rende fattibile riusando il pattern
    creaBatch → segnaPagato, ma va aggiunto quando ne vale la pena).
    L'helper `VerificaPage.getStatoRiga` accetta già i label 'Pagato' e
    'In pagamento'.
- Nota PAG-50: `segnaPagato` spedisce un'email (POST /mail); il test verifica lo
  stato `pagato` via API con retry (25s) per non dipendere dal timing dell'email.

### Esecuzione e tracciamento E2E

1. **File di stato**: `tests/e2e/test-status.json` — contiene per ogni singolo
   test (GF-01, AD-01, CT-01...) lo stato su chromium e mobile, la versione
   dell'ultima esecuzione, e l'ultima versione in cui ha passato.
2. **Prima di eseguire**: leggere `test-status.json`. Se un test è già `pass`
   per la versione corrente, non rieseguirlo.
3. **Dopo ogni esecuzione**: aggiornare `test-status.json` con l'esito.
4. **Script di comodo**: `scripts/e2e-report.sh` — esegue solo i test con
   stato `untested` per la versione corrente, aggiorna il file, e riporta
   il riepilogo.
5. **Recupero da interruzione**: al rilancio, riprende dai test non ancora
   marcati `pass` — non butta via i risultati già ottenuti.
6. **Dopo ogni modifica al codice**: `npm version patch` (incrementa versione),
   aggiornare `version` in `test-status.json`, eseguire i test mancanti,
   aggiornare il file.

## Sync produzione → dev (Admin → Sync)

- **Scopo**: portare i dati reali di produzione in dev per test con dati veri.
  Sola lettura da prod, mai scrittura.
- **Solo nel build di dev**: tab "Sync" visibile quando `VITE_SYNC_ENABLED=true`
  (definito in `quasar.config.js` → blocco `defineEnv`, gated da `ctx.dev`:
  `ctx.dev ? 'true' : 'false'`). Nel build di produzione è sempre `false`
  (tab assente). NOTA: il blocco `env:` di Quasar NON arriva a
  `import.meta.env` in dev — per i flag build usare `defineEnv`.
  Inoltre `development.sostienilsostegno.com` è servito dal dev server
  (`quasar dev`) tramite nginx → `ctx.dev` è true lì.
- **Flusso a 2 fasi** (Admin → Sync):
  1. **Scarica da produzione** → `POST /sync/prod/download` — l'estensione
     Directus su dev (`directus-dev/extensions/db-sync`, FUORI dal repo) usa il
     token read-only `PROD_SYNC_TOKEN` (env nel compose di directus-dev) e
     scarica: 17 collezioni custom + `/users` + `/files` → snapshot JSON in
     `directus-dev/db-sync/snapshots/prod-<ts>/`.
  2. **Carica in dev** (conferma esplicita) → `POST /sync/prod/import` —
     backup del DB dev attuale (`db-sync/backups/dev-<ts>.json`), TRUNCATE
     (collezioni custom + `directus_users`, MAI roles/policies/permissions/
     settings/folders), import con id preservati (relazioni intatte), re-seed
     dei 9 utenti fake E2E, fix sequenze, clear cache. Tutto in una transazione
     (rollback automatico se fallisce).
- **Password admin preservata**: l'import NON tocca la password dell'utente
  `ADMIN_EMAIL` di dev (la cattura prima del truncate e la ripristina). Gli
  altri utenti importati ricevono la password di dev standard (`DevSync_2026!!`).
  `ADMIN_PASSWORD` del compose è usata solo al primo bootstrap di Directus.
- **Token prod**: `PROD_SYNC_TOKEN` (ruolo Directus read-only su prod, utente
  `sync@readonly.com`, policy "ReadOnly" con solo READ) + `PROD_SYNC_EMAIL`.
  Vivono SOLO nel `docker-compose.yml` di directus-dev (fuori repo), mai in git
  o nel frontend. Nota: `/items/directus_users` e `/items/directus_files` sono
  bloccati per i non-admin da Directus (controller `/items` hardcoded); si
  leggono via `/users` e `/files`.
- **nginx (host)**: `development.sostienilsostegno.com` proxy-za a Directus
  (8055) le route API (`/items/`, `/users/`, `/roles/`, `/sync/`, …) e il resto
  a `localhost:9000` (dev server). La route `/sync/` è stata aggiunta per il
  sync — se manca, le chiamate del sync cadono sulla SPA. NOTA: per l'upload
  file serve ANCHE `location = /files` (esatta, senza slash) — altrimenti
  nginx 301 `/files` → `/files/` e il browser converte il POST in GET (lista
  file) → l'upload non crea nulla.
- **Permessi dev (DB, non git)**: durante i fix E2E è stato aggiunto al ruolo
  Manager di dev il permesso `update` su `Progetti` (il flusso "Chiudi
  progetto" e il ricalcolo aggregati PATCHano `/items/Progetti/{id}` e senza
  il permesso il manager riceve 403). Vale solo per il DB di dev.
- **Permesso Volontario su `Progetti` (dev E prod, DB non git)**: la policy
  "Volontario" ha `update` su `Progetti` limitato ai SOLI campi derivati
  `StatoProgetto,StatoRendicontazione,TotaleGiustificativi,TotaleImporto`
  (field-scoped). È l'abilitatore di `syncProgettoAggregati` (verifica.store):
  ogni mutazione di giustificativo — anche dal flusso volontario — ricalcola e
  PATCHa questi campi dal frontend. Una PATCH volontario con altri campi
  (es. `Allocato`) riceve 403. Va applicato a mano via UI Admin o SQL su dev e
  prod (UUID policy `e7242c87-4b9e-4f34-a539-1f9c10ce71fb`).
- **E2E**: test `SY-01`/`SY-02` in `admin.spec.js` verificano la tab Sync e il
  download da produzione (solo lettura, NON l'import che è distruttivo).
- **Snapshot/backup**: dentro `directus-dev/db-sync/` (host), montato come
  volume `/directus/db-sync` nel container.
- **Limite noto**: i file importati sono i metadati (`directus_files`); i
  binari reali (uploads) non vengono copiati → download/anteprime file non
  funzionano in dev dopo il sync.
- Dopo un sync la sessione admin corrente è invalidata (truncate users): la UI
  chiede di accedere di nuovo.

## Email contatti — invariante primaria

- Per i contatti con account Directus, l'email **primaria** del contatto coincide
  con `directus_users.email` (login).
- La primaria **non è mai cancellabile** direttamente: per sostituirla si
  promuove un'altra email (`impostaEmailPrimaria`, `src/usecases/email.js`), che
  aggiorna anche lo user Directus.
- Azioni in `src/usecases/email.js`: `impostaEmailPrimaria`, `eliminaEmail`
  (solo non primarie), `eliminaContatto` (solo senza account, con cascata su
  email/legami famiglia/referente), `applicaCorrezioniEmailPrimarie`,
  `allineaPrimariaALogin`.
- Strumenti Admin (tab Check): "Email primarie" e "login vs primaria";
  rilevazione pura in `src/utils/emailPrimarie.js`. Idempotenti e replicabili in prod.
- Campo `email.Primary`: default **false** (Directus Studio → Data Model).

## Deploy

- FTP su app.sostienilsostegno.com
- MAI senza autorizzazione esplicita
- E2E full suite prima del deploy
- Patch version solo dopo autorizzazione

## Regola fondamentale

Tutto il software è stato sviluppato dall'utente con le mie indicazioni. Nessun bug è "pre-esistente" — va investigato e risolto.
