# Regola — Solo capacità native Quasar
Ogni modifica UI deve usare esclusivamente componenti, props, classi e API native di Quasar. Niente librerie CSS terze (Tailwind, Bootstrap), niente componenti custom esterni, niente manipolazione DOM diretta. Lo stile va in `src/css/app.scss` con variabili CSS custom e override di classi Quasar. Google Fonts è l'unica eccezione. Vale per TUTTO il codice, esistente e nuovo.

# v2.7.1

- **Fix env vars**: tutte rinominte con prefisso `VITE_` per matchare il build di Quasar.
- **Version bump**: 2.7.0 → 2.7.1

# v2.7.0

- **Audit qualità senior**: .env rimosso da git, error handling ContattoDialog/DeduplicaPage, validazione RiconciliaDialog, messaggi espliciti (413/network/403/500), A/B → Principale/Secondario.
- **Email/tel cliccabili**: 44 link mailto:/tel: in 8 file (ContattiTab, ContattiDialog, FamiglieTab, FamigliaInfoCard, ContattoInfoLine, RiconciliaDialog, RiconciliazionePage, DeduplicaPage).
- **Accessibilità**: aria-label su 60+ bottoni icona, 0 immagini senza alt.
- **Hardcoded URLs → env vars**: RESET_URL, INVII_PUBBLICI_FOLDER via `import.meta.env`.
- **UUID inutilizzati rimossi**: GIUSTIFICATIVI, ISEE, PROGETTI (dead code).
- **Hide rendicontazione notify**: Messaggio discrepanze DB nascosto in attesa di revisione.
- **npm audit**: 6/8 vulnerabilità fixate.
- **Test file**: SP-10 file troppo grande, SP-11 estensione non valida.
- **Page object**: GestionePage.waitForTable/getRowCount supportano grid mode mobile.
- **Version bump**: 2.6.0 → 2.7.0

# v2.6.0

- **Restyling completo**: Palette colori CSS custom, font Inter, card/pulsanti/input uniformati, drawer scuro, header con bordo.
- **Tabelle responsive**: 13 tabelle migrate a `grid` mode su mobile con card QExpansionItem. VerificaPage, RiconciliazionePage, ContattiTab, FamiglieTab, AdminPage, ProgettoDetailDialog, AssegnaFamigliaDialog, DeduplicaPage (×4), ContattiDialog (×2).
- **VerificaPage**: Rimossa selezione progetto, colonne Dati bancari/Rimborsabili spostate in expand, intestatario sopra IBAN.
- **RiconciliazionePage**: Card mobile con tutti i campi + barra colore stato.
- **ContattiTab**: Aggiunta colonna Telefono a desktop. Card mobile con email/Primaria, stato, famiglie, tutte le azioni.
- **Test atomici**: RC-PG-03, CT-10, EC-01, IN-01 fixati per essere auto-contenuti.
- **Icone/tooltip**: 24 tooltip aggiunti, colori non-tema uniformati (teal→accent, orange→warning).
- **Page object**: GestionePage.waitForTable/getRowCount funzionano in grid mode.
- **Playwright project**: Aggiunto progetto "mobile" per test su viewport smartphone.
- **Version bump**: 2.5.2 → 2.6.0

# v2.5.2

- **Responsive dialog**: RiconciliaDialog layout verticale, max-width 600px. Email rimossa dal confronto. ContattoDialog Nome/Cognome affiancati. GiustificativoForm più compatto (outlined dense). AssegnaFamigliaDialog tre campi responsive.
- **Camera solo mobile**: Pulsante photo_camera in GiustificativoForm nascosto su desktop.
- **Fix min-width dialog**: 9 dialog con `min-width` fissi convertiti a `width: 100%; max-width`.
- **Version bump**: 2.5.1 → 2.5.2

# v2.5.1

- **ProgettoDetailDialog**: Nuovo pulsante `visibility` per riga in VerificaPage. Dialog con tutti i campi Directus (date, età, descrizioni, relazione, allegati). Rimossa toolbar Dettaglio.
- **Fix email case-insensitive**: `getByEmails()` usa `_in` con email lowercased per matching case-insensitive su PostgreSQL.
- **Fix modifica email in riconciliazione**: `handleEmailEdit()` ora salva via API prima di ricaricare. Aggiunto pulsante `save` accanto all'email.
- **Fix discrepanze solo admin**: `showRendicontazioneNotify()` ora controlla `canAdmin`.
- **Hard wait riduzione**: Sostituite decine di `waitForTimeout` con `waitForResponse`/`waitForSelector` in tutti i page objects e spec files.
- **Selettori icon-based eliminati**: 19 selettori `i:text-is`/`i:has-text` sostituiti con `data-testid`.
- **Test autosufficienti**: Nessun `test.skip()` per mancanza pre-condizioni (RC-02/03/CT-10/ER-04 ora falliscono). Eliminati `describe.serial`.
- **Error-handling test**: EH-01 con mock 500 API. VR-SS-01 screenshot regression.
- **Protezioni anti-production**: Global setup + runtime guard in console.js.
- **Database cleanup**: Global setup pulisce record test precedenti.
- **API setup helpers**: `helpers/setup.js` con `createContatto()`, `assignToFamiglia()` via API.
- **Login centralizzato**: `helpers/login.js` con `loginAs()`.
- **Nuovi test**: 20+ nuovi test (EC-01..04, VF-04/05, RC-04/05/PG-04, VP-DETT-01..06, EH-01, VR-SS-01, RG-COMB-01, LB-05, DP-01/02, RG-05).
- **Test E2E**: ~151 passano, 0 falliti, 0 skip. Suite completa e affidabile.
- **Deploy FTP**: `scripts/deploy-ftp.mjs` con `basic-ftp`. Comando `npm run deploy`.
- **Version bump**: 2.5.0 → 2.5.1

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
- **Test E2E**: 112 passano, 0 falliti, 4 skip (Deduplica hardcoded).
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
tramite UI nel test stesso.

**TEST ATOMICI:** Ogni test deve essere eseguibile singolarmente, senza
dipendere da test precedenti o da seed data. Ogni test crea i propri dati
tramite UI (contatti via ContattoDialog, submission via SubmitPage, ecc.).
Vietati setup seriali (`describe.serial`), hardcoded riferimenti a seed data
(`TEST_FAM_01`, `test.genitore@test.com`), e dipendenze tra test.
I test che necessitano di login usano utenti seed (`auth-test.json`) —
questo è l'unico seed data accettabile perché la creazione di utenti
Directus non può avvenire via UI.

**RICERCA UNIVOCA NEI TEST:** Ogni test che cerca o modifica dati deve usare
il campo di filtro/search della pagina, non iterare le righe della tabella
(che potrebbero essere incomplete per paginazione). Le ricerche devono usare
un **criterio univoco**: email (per entità che hanno una mail come riferimento)
o nome completo (che per design è unico). Mai cercare per prefisso o testo
generico che potrebbe dare risultati multipli e inficiare il test.

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

## Configurazione Directus locale necessaria

Per sbloccare tutti i test (Admin, Deduplica, Submit pubblica, Reset password):

### Utente Admin
Creare in Directus (Settings → Users):
- Email: `test.admin@test.com`
- Password: `TestAdmin_2026!`
- Ruolo: `Administrator` (con admin_access = true)

Il nome del ruolo deve corrispondere a uno dei valori in `ADMIN_ROLE_NAMES` (`['administrator', 'admin']`).

### Submit pubblica (SP-07/08/09)
In Settings → Permissions → Ruolo `Public`:
- `InviiGiustificativiNoLogin` → Create
- `directus_files` → Create
- Folder `Invii_Pubblici` (UUID: `25cd095a-20a2-48fd-9827-9b6754b429f6`) → Read

### Reset password (RP-10)
Configurare SMTP in Directus (`.env` o Admin Settings):
```
EMAIL_FROM="noreply@sostienilsostegno.com"
EMAIL_TRANSPORT="smtp"
EMAIL_SMTP_HOST="smtp.gmail.com"
EMAIL_SMTP_PORT=465
EMAIL_SMTP_USER="test.validatore.sis@gmail.com"
EMAIL_SMTP_PASSWORD="(app password Gmail)"
EMAIL_SMTP_SECURE=true
```

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

# Deploy FTP

## Prerequisiti

Le credenziali FTP sono nel file `.env` (non condiviso su git):

```env
FTP_HOST=ftp.sostienilsostegno.com
FTP_PORT=21
FTP_USER=app.volontari.deploy@sostienilsostegno.com
FTP_PASSWORD=...
FTP_REMOTE_DIR=/public_html
```

## Build e deploy

```bash
# Solo build
npm run build

# Build + deploy
npm run release

# Solo deploy (dopo build manuale)
npm run deploy
```

## Script di deploy

`scripts/deploy-ftp.mjs` usa la libreria `basic-ftp` per:

1. Leggere le credenziali da `.env` (`.env.local` sovrascrive `.env`)
2. Connettersi via FTP (plain, porta 21 — il server supporta AUTH TLS ma non lo richiede)
3. Creare la directory remota `/public_html` se non esiste
4. Pulire la directory remota
5. Caricare tutto `dist/spa/` (build Quasar)

## Note

- Il server FTP supporta `PASV` ma non `EPSV` (EPSV dà errore 500, PASV funziona)
- La connessione non è criptata (plain FTP). Usare solo per deploy su server di proprietà.
- Per deploy sicuro via FTPS esplicito, modificare `scripts/deploy-ftp.mjs`: impostare `secure: 'explicit'` (il server supporta AUTH TLS)

# Rilevazione ambiente (dev/test/produzione)

L'app usa `import.meta.env.DEV` (built-in Vite, automaticamente `true` con `quasar dev`) combinato con `VITE_APP_ENV` per rilevare l'ambiente.

| Ambiente | Comando | `DEV` | `VITE_APP_ENV` | Banner |
|----------|---------|-------|----------------|--------|
| Locale | `quasar dev` | `true` | `development` (da `.env.development`) | ✅ "AMBIENTE DI TEST" |
| E2E test | Playwright → `quasar dev` | `true` | `development` | ✅ "AMBIENTE DI TEST" |
| Sito di test/staging | `quasar build --mode test` | `false` | `test` (da `.env.test`) | ✅ "SITO DI TEST" |
| Produzione | `quasar build` | `false` | `production` (da `.env.production`) | ❌ nessun banner |

## Pattern nel codice:

```js
// src/components/Layout/AppLayout.vue + src/pages/LoginPage.vue
const isDev = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'test'
```

Usato in:
- **AppLayout.vue**: header colorato (`bg-orange-9` in dev, `bg-primary` in produzione)
- **LoginPage.vue**: banner "🔧 AMBIENTE DI TEST"

## Mode file Vite (.env.{mode})

Al posto di rinominare manualmente `.env`/`.env.local`, Vite carica automaticamente il file corrispondente al mode:

| Mode | File caricati |
|------|---------------|
| `development` (default `quasar dev`) | `.env` + `.env.development` + `.env.local` |
| `production` (default `quasar build`) | `.env` + `.env.production` + `.env.local` |
| `test` (`quasar build --mode test`) | `.env` + `.env.test` + `.env.local` |

Creare un file `.env.test` con:

```env
VITE_APP_ENV=test
# URL Directus di test
VITE_API_URL=https://test.app.sostienilsostegno.com
```

Il deploy di staging/test si fa con:
```bash
quasar build --mode test
```

## Guardia anti-produzione nei test E2E

Due livelli di protezione impediscono l'esecuzione di test su ambienti produttivi:

### 1. Global setup (`tests/e2e/global-setup.mjs`)
Prima dell'avvio di qualsiasi test, legge `VITE_API_URL` da `.env`/`.env.local` e controlla:
- Se contiene pattern di produzione (`sostienilsostegno.com`) → `process.exit(1)` con messaggio di errore
- Se non è localhost → stesso blocco
- Solo se è localhost → procede con cleanup dati test

### 2. Runtime guard (`tests/e2e/helpers/console.js`)
Durante l'esecuzione dei test, intercepta tutte le response API:
- Se il dominio contiene `sostienilsostegno.com` → pusha errore → il test fallisce
- Funziona anche se il global setup venisse aggirato
- Fa fallire qualsiasi test che accidentalmente chiami produzione

```js
const PRODUCTION_DOMAINS = ['sostienilsostegno.com', 'app.sostienilsostegno']
```

Nessun test può essere eseguito su produzione — se tenta, si blocca prima ancora di iniziare.
```

**(copy exactly including closing backticks)**
