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
  sync — se manca, le chiamate del sync cadono sulla SPA.
- **E2E**: test `SY-01`/`SY-02` in `admin.spec.js` verificano la tab Sync e il
  download da produzione (solo lettura, NON l'import che è distruttivo).
- **Snapshot/backup**: dentro `directus-dev/db-sync/` (host), montato come
  volume `/directus/db-sync` nel container.
- **Limite noto**: i file importati sono i metadati (`directus_files`); i
  binari reali (uploads) non vengono copiati → download/anteprime file non
  funzionano in dev dopo il sync.
- Dopo un sync la sessione admin corrente è invalidata (truncate users): la UI
  chiede di accedere di nuovo.

## Deploy

- FTP su app.sostienilsostegno.com
- MAI senza autorizzazione esplicita
- E2E full suite prima del deploy
- Patch version solo dopo autorizzazione

## Regola fondamentale

Tutto il software è stato sviluppato dall'utente con le mie indicazioni. Nessun bug è "pre-esistente" — va investigato e risolto.
