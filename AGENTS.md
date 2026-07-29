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

## Deploy
- FTP su app.sostienilsostegno.com
- MAI senza autorizzazione esplicita
- E2E full suite prima del deploy
- Patch version solo dopo autorizzazione

## Regola fondamentale
Tutto il software è stato sviluppato dall'utente con le mie indicazioni. Nessun bug è "pre-esistente" — va investigato e risolto.
