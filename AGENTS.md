# v2.3.0

- **Tranche rimosso**: Eliminato il sistema Tranche da tutto il codice. `recalculateRowTotals()` ora somma direttamente tutti i giustificativi con stato `inviato/verificato/approvato`.
- **Stato case normalization**: Tutti i confronti Stato usano lowercase (`'inviato'`, `'verificato'`, `'rifiutato'`). DB e frontend coerenti.
- **Paginazione client-side**: VerificaPage usa `fetchAllPages()` per caricare tutti i dati. Ordinamento e filtro funzionano lato client.
- **ContattiTab fix**: Paginazione con `v-model:pagination`, ricerca case-insensitive (`_icontains`), filtro Referente funzionante.
- **Email CRUD**: ContattoDialog supporta N email con add/edit/delete/primary. Controllo email duplicate.
- **Referente model**: Nuova tabella `Volontari_Referenti` (junction many-to-many). Il Referente segue i Volontari, non le Famiglie. Campo `contatti.IsReferente` per filtro.
- **Badge multipli**: ContattiTab mostra tutti i ruoli (Volontario + Genitore + Referente) come badge separati.
- **ContattiDialog**: Layout più largo, pulsanti impilati verticalmente, pulsante "Crea contatto" con popup ruolo dopo creazione.
- **FamiglieTab**: Ordinamento funzionante (sort mappato a Directus field names). Genitori prima, poi separator, poi Volontari nell riga espandibile.
- **FamigliaInfoCard**: Mostra referente di ogni volontario.
- **Email layout**: Email verticali nella tabella Contatti (non orizzontali).
- **Test E2E**: 112 test passano, 0 falliti, 4 skip (Deduplica hardcoded).
- **Version bump**: 2.2.0 → 2.3.0

# v2.1.0

- **StatoRendicontazione fix**: `reconcileSubmission()` ora imposta `Stato: 'inviato'` sul giustificativo riconciliato. Aggiunto `fetchPage()` dopo riconciliazione.
- **normalizeProject()**: include ora `StatoRendicontazione`, `TotaleGiustificativi`, `TotaleImporto` dal DB.
- **Services**: aggiunti `email.service.js` (batch email), `users.service.js` (CRUD Directus users).
- **Shared utilities**: `notify.js`, `enrichment.js`, `file-naming.js`, `assets.js` documentati.
- **AdminPage**: descrizione corretta — User Admin (utenti), non gestione ruoli/policy.

# v1.1.0

- **FamiglieTab**: server-side pagination + search (come ContattiTab). `gestione.service.js:getFamiglie()` ora accetta `{ page, limit, search, sort, meta }`. Il filtro client-side è stato rimosso.
- **SubmitPage**: multipli giustificativi con lista dinamica (pulsante "+"). Ogni giustificativo ha descrizione, importo, data, file proprio. Invio unico processa N upload + N create.
- **Version bump**: 1.0.1 → 1.1.0

# v2.0.0 (historical)

- DeduplicaPage: aggiunto controllo ID duplicati su contatti, famiglie, progetti
- VerificaPage: show tutte email con badge Primaria, telefoni già presenti
- FamigliaInfoCard: tutte email con badge Primaria
- FamiglieTab accordion, ContattiDialog, ContattiTab: tutte email con badge Primaria
- Fix email Primary `=== 'true'` → `=== true` (booleano Directus)
- Rimossi getter conflitto `altriVolontari` / `genitori` dal famiglie.store
- VerificaPage performance: paginazione server-side, batch famiglie, campi minimi
- Soft-delete `Disattivo` su Famiglie_Contatti invece di DELETE
- Auto-link Directus user per volontari senza account

# REGOLA OBBLIGATORIA — Test E2E

**NESSUNA CHIAMATA API NEI TEST.** Ogni azione deve avvenire ESCLUSIVAMENTE
tramite interazione UI del browser. Vietato usare `fetch`, Axios,
`seedPrepare()`, `POST/GET/DELETE/PATCH` su Directus o qualsiasi altra
chiamata di rete.

Un test che usa API non è un test utente. I dati di partenza vanno creati
manualmente in Directus o tramite UI nei test di setup (es. FM-01).

**CONSOLE ERRORS = TEST FAILURE.** Ogni test deve fallire se rileva errori
console (4xx/5xx API, eccezioni JS, errori runtime). Il helper `console.js`
chiama `expect(errors).toHaveLength(0)` dopo ogni test. I test vanno sempre
eseguiti con `--reporter=list` per vedere subito gli errori.

**INTERCETTAZIONE RETE PRIMA DEL DOM.** Quando un test interagisce con la rete
e non funziona, la prima cosa da fare è intercettare la risposta API con
`page.on('response')` o `page.waitForResponse()` per verificare:
- Lo status code (200, 403, 500?)
- Il body della risposta
- Il payload inviato

Solo DOPO aver verificato la rete ha senso controllare il DOM.
Se un pulsante non viene trovato, riscrivere il test per intercettare
l'HTML/HTML invece di cercare selettori specifici.

# Architecture Overview

## Pages (8)

| File | Description |
|------|-------------|
| `LoginPage.vue` | Login with email/password |
| `ResetPasswordPage.vue` | Password reset via query-string token |
| `SubmitPage.vue` | Public form for no-login giustificativi submission |
| `FamigliePage.vue` | Volunteer home: family card, progetto selector, giustificativi list |
| `VerificaPage.vue` | Verification dashboard: progetti table + reconcile tab |
| `GestionePage.vue` | Management: Contatti CRUD tab + Famiglie CRUD tab |
| `DeduplicaPage.vue` | Email deduplication: merge/delete duplicate contatti |
| `AdminPage.vue` | Amministrazione: tabella ruoli + assegnazione policy |

## Stores (8 + 1 index)

| File | Purpose |
|------|---------|
| `index.js` | Pinia instance factory |
| `auth.store.js` | Auth state, user, contatto, role getters (`canVerifica`, `canGestione`, `canAdmin`) |
| `gestione.store.js` | Gestione CRUD: famiglie, contatti, email, invites |
| `famiglie.store.js` | Family portal: progetto, genitori, altri volontari, IBAN |
| `verifica.store.js` | Verification: projects, giustificativi, submissions reconciliation |
| `giustificativi.store.js` | Volunteer-side giustificativi CRUD with inline edit |
| `deduplica.store.js` | Duplicate groups, merge, delete actions |
| `admin.store.js` | Admin: ruoli, policy, assegnazione policy ai ruoli |

## Services (15)

| File | Key endpoints |
|------|---------------|
| `api.js` | Axios instance + auth interceptor + token refresh |
| `auth.service.js` | `/auth/login`, `/auth/refresh`, `/users/me` |
| `contatti.service.js` | CRUD contatti, batch `getByEmails()` |
| `email.service.js` | CRUD email, batch `getByContatto()`, `getByEmails()` |
| `gestione.service.js` | Paginated contatti, users batch, famiglie, Famiglie_Contatti |
| `users.service.js` | CRUD Directus users |
| `famiglie.service.js` | Famiglie_Contatti by ruolo, famiglia detail, email batch |
| `verifica.service.js` | Progetti, giustificativi, submissions, famiglia/progetto search |
| `giustificativi.service.js` | CRUD giustificativi by progetto |
| `deduplica.service.js` | CRUD email, contatti, Famiglie_Contatti |
| `submit.service.js` | File upload + POST InviiGiustificativiNoLogin |
| `files.service.js` | File upload with FormData order fix |
| `rendicontazioni.service.js` | CRUD rendicontazioni |
| `progetti.service.js` | GET single progetto |
| `admin.service.js` | `GET /roles`, `GET /policies`, `PATCH /roles/:id` (set policies) |

## Shared Utilities (`src/utils/`)

| File | Purpose | Used by |
|------|---------|---------|
| `notify.js` | `notifyError($q, err, fallback)` + `notifySuccess($q, msg)` | All pages/stores |
| `enrichment.js` | `enrichWithEmails(ids, emailService)` — batch email merge | Stores, components |
| `file-naming.js` | `buildUploadFileName(famiglia, nome)`, `buildObsoletePrefix()`, `buildRejectPrefix()` | Upload flows |
| `assets.js` | `assetUrl(id, { preview })` — Directus asset URL builder | Components |
| `constants.js` | Role names, FOLDERS, RENDICONTAZIONE states | Stores |
| `formatters.js` | Date/number formatting helpers | Pages |

### Conventions

- **`notifyError($q, err, fallback)`** — always use for error toasts. Timeout 0, close button, extracts Directus message.
- **`notifySuccess($q, msg)`** — success confirmations.
- **`limit: -1`** — Directus batch fetches must use `limit: -1` (default 100 truncates results). Required in: `getFamiglieBatch`, `getByEmails`, `getByContatto`, `queryFamiglieContatti`, `getGiustificativiByProgetti`, `getRendicontazioniBatch`.
- **Email enrichment** — centralize in `enrichWithEmails()`, never duplicate batch email fetch logic.

## Components (17)

**Layout (1):** `AppLayout.vue`

**Common (5):** `ConfirmDialog.vue`, `FileUploader.vue`, `InlineEditableField.vue`, `ContattoInfoLine.vue`, `BancariDialog.vue`

**Famiglia (2):** `FamigliaInfoCard.vue`, `ProgettoSelector.vue`

**Gestione (6):** `ContattiTab.vue`, `ContattoDialog.vue`, `FamiglieTab.vue`, `FamigliaDialog.vue`, `ContattiDialog.vue`, `AssegnaFamigliaDialog.vue`

**Giustificativi (3):** `GiustificativoCard.vue`, `GiustificativoList.vue`, `GiustificativoForm.vue`

**Other (1):** `RiconciliaDialog.vue`

## Routes (8)

| Path | Meta | Component |
|------|------|-----------|
| `/login` | `{ public: true }` | `LoginPage.vue` |
| `/reset-password` | `{ public: true }` | `ResetPasswordPage.vue` |
| `/submit` | `{ public: true }` | `SubmitPage.vue` |
| `/famiglie` | `{ requiresAuth: true }` | `FamigliePage.vue` |
| `/verifica` | `{ requiredRole: 'Verifica' }` | `VerificaPage.vue` |
| `/gestione` | `{ requiredRole: 'Gestione' }` | `GestionePage.vue` |
| `/deduplica` | `{ requiredRole: 'Admin' }` | `DeduplicaPage.vue` |
| `/admin` | `{ requiredRole: 'Admin' }` | `AdminPage.vue` |

## Role-Based Access Matrix

In Directus, ogni utente ha **1 ruolo**, ogni ruolo ha **N policy** collegate.
Il frontend decide l'accesso UI via `auth.store.js` getters che matchano
**role name** o **role UUID** contro liste in `constants.js` + `.env`.

| Pagina | Guard route | Visibile nel menu a |
|--------|-------------|---------------------|
| `/login` | `public: true` | — |
| `/reset-password` | `public: true` | — |
| `/submit` | `public: true` | — |
| `/famiglie` | `requiresAuth: true` | Tutti (poi `FamigliePage` controlla `hasFamiglieAccess`) |
| `/verifica` | `requiredRole: 'Verifica'` | `canVerifica === true` |
| `/gestione` | `requiredRole: 'Gestione'` | `canGestione === true` |
| `/deduplica` | `requiredRole: 'Admin'` | `canAdmin === true` |
| `/admin` | `requiredRole: 'Admin'` | `canAdmin === true` (sotto "Amministrazione") |

### Getters (auth.store.js)

| Getter | Matcha se role name è in | Oppure role UUID in |
|--------|--------------------------|---------------------|
| `canVerifica` | `VERIFICA_ROLE_NAMES` | `VITE_VERIFICA_ROLE_IDS` |
| `canGestione` | `GESTIONE_ROLE_NAMES` | `VITE_GESTIONE_ROLE_IDS` |
| `canAdmin` | `ADMIN_ROLE_NAMES` | `VITE_ADMIN_ROLE_IDS` |

### Role names per getter

| Getter | Role names |
|--------|------------|
| `canVerifica` | `verifica`, `verificatore`, `validatore`, `validator`, `gestoreverifica`, `administrator`, `admin` |
| `canGestione` | `gestore volontari`, `gestione`, `gestoreverifica`, `administrator`, `admin` |
| `canAdmin` | `administrator`, `admin` |

### Per dare accesso combinato (es. Gestione + Verifica)

Si crea un ruolo Directus il cui **nome** è presente in entrambe le liste
`constants.js`. Es. ruolo `GestoreVerifica` (name normalizzato `gestoreverifica`)
è incluso sia in `GESTIONE_ROLE_NAMES` che in `VERIFICA_ROLE_NAMES`.

Non serve modificare `.env` — il match avviene via role name.
In `AdminPage` assegni a questo ruolo le policy **Gestione** + **Verifica**
per dare i permessi Directus corrispondenti.

### Redirect login

Utente autenticato a `/` o pagina pubblica:
→ prova `/gestione` (se `canGestione`)
→ `/verifica` (se `canVerifica`)
→ `/famiglie` (fallback)

### Nota su /famiglie

`/famiglie` ha `requiresAuth: true` ma **nessun** `requiredRole`. Utenti senza
`hasFamiglieAccess` (nessuna riga in `Famiglie_Contatti`) passano la route guard
ma vedono "accesso negato" dentro `FamigliePage.vue`.

### Menu laterale (AppLayout)

| Voce | Condizione |
|------|------------|
| Famiglie | `authStore.hasFamiglieAccess` |
| Verifica | `authStore.canVerifica` |
| Gestione | `authStore.canGestione` |
| Duplicati | `authStore.canAdmin` |
| **Amministrazione > Ruoli e Policy** | `authStore.canAdmin` |

## AdminPage — User Admin

Pagina `/admin` accessibile solo a `canAdmin === true`.

**Cosa fa:**
- Gestisce utenti Directus: lista, creazione, reset password
- Mostra tabella: Utente, Email, Ruolo, Stato, Azioni
- Crea utente con email, password, ruolo
- Reset password per utente esistente

**Attenzione:** l'utente admin Directus deve avere permessi di lettura su
`directus_users` e scrittura su `directus_users` (per reset password).

## Test Data

Fixture in `tests/e2e/fixtures/auth-test.json` e `tests/e2e/helpers/seed.js`.

### Utenti test (crea in Directus una tantum)

| Chiave | Email | Password | Ruolo Directus | Policy |
|--------|-------|----------|----------------|--------|
| `volontario` | test.volontario@test.com | TestVol_2026! | Volontario | Volontario |
| `volontario_nofam` | test.volontario.nofam@test.com | TestVol_2026! | Volontario | Volontario |
| `genitore` | test.genitore@test.com | TestVol_2026! | Volontario | Volontario |
| `gestore` | test.gestore@test.com | TestGest_2026! | Gestione | Gestione |
| `verificatore` | test.verificatore@test.com | TestVer_2026! | Verifica | Verifica |
| `gestore_verifica` | test.gestore.verifica@test.com | TestGestVer_2026! | GestoreVerifica | Gestione + Verifica |

### Seed dati (via `seedPrepare(page)`)

`seed.js` upserta 9 contatti, 7 email, 2 famiglie, 3 famiglie_contatti,
1 progetto, 3 giustificativi. Ogni record ha ID prefisso (`TEST_*`) —
se esiste già, skip; se no, POST.

### Categorie coperte

| ID contatto | Categorie test |
|-------------|----------------|
| TEST_01 | Volontario con famiglia e giustificativi |
| TEST_02 | Volontario senza `hasFamiglieAccess` |
| TEST_03 | Contatto con ruolo Genitore |
| TEST_04 | Utente Gestione (ContattiTab, FamiglieTab) |
| TEST_05 | Utente Verifica (VerificaPage) |
| TEST_06 | Utente GestoreVerifica (canGestione + canVerifica) |
| TEST_07 | Contatto senza `user_id` (CT-08 Directus fix) |
| TEST_08 | Contatto senza email |
| TEST_09 | Contatto per test email duplicata |

### Pulizia manuale (nessun teardown automatico)

Ordine: Giustificativi → Progetto → Famiglie_Contatti → Famiglie → Email → Contatti → Directus users.

---

# Directus 11 — Deep fields su M2O escludono righe con relazione nulla

**Problema:** In Directus 11, quando in `fields` includi campi annidati su una
relazione M2O (es. `user_id.id`, `user_id.email`), Directus fa **INNER JOIN**
invece di LEFT JOIN. Le righe dove la relazione è `NULL` vengono **escluse**
dal risultato.

**Fix applicati:**
- `gestione.service.js:queryContatti()` — `user_id.id,user_id.email,...` → solo `user_id`,
  poi fetch separato `GET /users?filter[id][_in]=...` + merge lato frontend
- `verifica.service.js:getGiustificativi()` — `Rendicontazione.id,...` → solo `Rendicontazione`
  (il codice già gestisce `typeof === 'object'`)
- `giustificativi.service.js:getByProgetto()` — stessa modifica

**Da tenere d'occhio (M2O con FK potenzialmente nullable):**
- `Progetti.Famiglia.*` in `getProgetti()` — non dovrebbe mai essere null
- `Famiglie_Contatti.Contatto.*` / `Famiglia.*` — junction table, FK sempre presenti
- `Famiglie.Progetti.*` (O2M) — le O2M **non** hanno questo problema

**Pattern sicuro:**
```js
fields: ['*', 'Relazione']  // solo UUID/scalare
// poi fetch separato se servono campi della relazione
```

# Directus — FormData order

Quando si carica un file via `POST /files`, i campi non-file (es. `folder`)
devono essere appesi **prima** del campo `file`, altrimenti Directus li ignora.
Vedi: https://github.com/directus/directus/discussions/10130

# VerificaPage — VE-EDIT (Inline editable fields)

Nella riga espansa di VerificaPage, per giustificativi in stato `Inviato`:
- **Descrizione**, **Importo**, **Data** sono editabili inline via `<InlineEditableField>`
- Solo utenti con `canVerifica === true` vedono i campi editabili
- Salvataggio via `store.updateGiustificativoField(progettoId, giustId, field, value)` → `PATCH /items/Giustificativi/{id}`
- Dopo salvataggio, `recalculateRowTotals()` si occupa del ricalcolo locale

# VerificaPage — VE-ADD (Aggiungi giustificativo)

Pulsante `add_circle` color secondary nella colonna Actions di ogni riga (solo se `canVerifica`).
Apre `<GiustificativoForm>` pre-compilato con `progettoId`, `famigliaId`, `annoBando`.
Alla creazione: upload file → `giustificativiService.create()` → `store.fetchAll()`.

# FamigliaInfoCard — FAM-CONTACTS (Altri volontari)

Sezione "Altri volontari" dopo la sezione "Genitori" in `FamigliaInfoCard.vue`.
I dati arrivano da `famiglie.store.js:loadVolontari(famigliaId)`:
- GET Famiglie_Contatti con ruolo Volontario
- Esclude il contatto corrente (`authStore.contattoId`)
- Batch fetch email, merge risultati
- Visibile solo se `altriVolontari.length > 0`

# DeduplicaPage — Gestione duplicati email

Pagina `/deduplica` accessibile solo a ruoli `administrator`/`admin` (getter `canAdmin`).
**I test E2E su questa pagina skippano** perché nessun utente test ha ruolo Admin.

**Logica:** raggruppa contatti che condividono la stessa `email_address` nella tabella `email`.

**Workflow per gruppo:**
1. Apre dialog di confronto con due contatti affiancati
2. Per ogni campo diverso (Nome, Cognome, Cellulare, Telefono), scegli se tenere A o B
3. Sezioni Email e Famiglie: sposta masse in A o elimina singoli
4. **Unisci in A**: applica le scelte campi, migra email + famiglie + user_id, cancella B
5. **Elimina contatto B**: solo se B non ha più famiglie assegnate

**Store:** `deduplica.store.js` — `fetchDuplicates()`, `merge()`, `deleteContattoIfEmpty()`
**Service:** `deduplica.service.js` — CRUD diretto su `contatti`, `email`, `Famiglie_Contatti`

# Form Pubblico — SubmitPage

Route: `/submit` (public, no auth)
Accesso Public Directus su `InviiGiustificativiNoLogin` e `directus_files` (da configurare).
Flusso: upload file → POST submission con `stato: in_attesa`.

## Coda riconciliazione — VerificaPage

Tab "Da riconciliare" (solo `canVerifica`) con badge count.
Colonne: Data invio, Richiedente, Email, Beneficiario, Importo, Allegato, Azioni.

**Riconcilia manuale** (`RiconciliaDialog.vue`):
- Riepilogo submission, dropdown Famiglia + Progetto, campo note
- Crea Giustificativo (stato `inviato`), PATCH submission `stato: riconciliato`
- Dopo creazione: `fetchSubmissions()` + `fetchPage()` per aggiornare entrambi i tab

**Scarta**: prompt motivazione → PATCH `stato: scartato` + note (audit trail).

**Riconciliazione automatica** (`store.tryAutoReconcile()`):
- Match IBAN + Intestatario su `Famiglie`
- Match Cognome beneficiario su `Progetti`
- Solo se un risultato univoco → riconcilia

# Test E2E — Reset Password

## Account email per intercettazione
- Email: test@sostienilsostegno.com
- IMAP host: mail.sostienilsostegno.com:993 (TLS)
- Credenziali in `.env` (non condiviso su git)

## Account Directus per reset
- Fixture: `tests/e2e/fixtures/auth-email.json` (gitignorato)
- Email: test@sostienilsostegno.com
- Password base ripristinata dal test: `TestPwdE2EOriginal!`

## Flusso del test RP-10
1. Forgot password → richiedi reset per l'email
2. Intercetta email via IMAP → estrai link col token
3. ResetPasswordPage → imposta `TempPwdRound1!`
4. Login con `TempPwdRound1!` ✓
5. Forgot password → richiedi secondo reset
6. Intercetta email → estrai link
7. ResetPasswordPage → ripristina `TestPwdE2EOriginal!`
8. Login con `TestPwdE2EOriginal!` ✓

# Server-side pagination — ContattiTab

La tabella `contatti` ha campi `IsVolontario` (boolean) e `IsGenitore` (boolean)
usati come cached flags per filtrare e paginare server-side.

Il **Flow Directus** su `Famiglie_Contatti` aggiorna:
- `IsGenitore = true` quando crei/update riga con `Ruolo = 'Genitore'`
- `IsVolontario = true` quando crei/update riga con `Ruolo = 'Volontario'`

Il frontend gestisce **delete** direttamente:
- Se rimuovi riga Genitore → PATCH `IsGenitore = false`
- Se rimuovi riga Volontario → **non** tocca `IsVolontario` (resta true)

`queryContatti({ limit, offset, sort, search, isVolontario, isGenitore, stato })`
— unico metodo API per paginazione server-side con `meta=filter_count`.

## Display `_tipo`
- `IsVolontario = true` → Volontario
- `IsGenitore = true` (e `IsVolontario = false`) → Genitore
- entrambi false → Contatto

## Filtri server-side
| Filtro UI | Directus filter |
|---|---|
| Volontario | `IsVolontario: { _eq: true }` |
| Genitore | `IsGenitore: { _eq: true }` + `IsVolontario: { _eq: false }` |
| Contatto | `IsVolontario: { _eq: false }` + `IsGenitore: { _eq: false }` |

# Test E2E — Gestione Contatti

## Schema Directus — contatti / email

La tabella `contatti` **NON** ha un campo `Email`. Le email sono in una tabella
separata `email` con colonne `id`, `email_address`, `Contatto_Relation`, `Primary` (boolean).

Pattern usato per recuperare le email:
1. `gestioneService.getEmailByContatto(ids)` — batch fetch su `/items/email` con
   `filter[Contatto_Relation][_in]` + `filter[Primary][_eq]=true`
2. `ContattiTab.vue:enrichRows()` — arricchisce le righe visibili mergiando `Email`
   nell'oggetto di ogni contatto (proprietà `Email`)
3. `gestioneService.createEmail()` / `updateEmail()` — create/update nella tabella `email`

In edit, `gestione.store.js:updateContatto()` estrae `Email` dal payload, lo
aggiorna su `email` table, e rimuove il campo prima di chiamare
`PATCH /items/contatti`.

## SubmitPage tests (submit.spec.js)

| Test | Type | Cosa fa |
|------|------|---------|
| SP-02 | smoke | "Torna al login" → /login |
| SP-03 | regression | "+ Aggiungi" aggiunge riga |
| SP-04 | regression | Delete rimuove riga |
| SP-05 | regression | Submit vuoto → errori validazione |
| SP-06 | regression | Email non valida → errore |
| SP-07 | regression | Submit 1 giust. → successo (skip — Directus public upload) |
| SP-08 | regression | Submit N giust. → successo (skip — Directus public upload) |
| SP-09 | regression | "Invia altri" resetta form (skip — Directus public upload) |

Per sbloccare SP-07/08/09: abilitare `POST /files` e `POST /items/InviiGiustificativiNoLogin` per utenti Public in Directus.

## Comandi
```bash
# Tutti i test
npm run test:e2e

# Soli test reset password
npm run test:e2e -- --grep "RP-"

# Test UI (mock email)
npm run test:e2e -- --grep "RP-0"

# Test full E2E (email reale)
npm run test:e2e -- --grep "RP-10"
```
