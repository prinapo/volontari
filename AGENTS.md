# Project conventions

## Stack

- Vue 3 + Quasar 2 + Pinia + Axios, plain JS (no TypeScript)
- Vite via @quasar/app-vite
- Backend: Directus 11.x REST API

## Quality toolchain

| Tool           | Purpose                 | Config                                   |
| -------------- | ----------------------- | ---------------------------------------- |
| ESLint 8       | JS + Vue linting        | `.eslintrc.cjs`                          |
| Prettier 3     | Formatting              | `.prettierrc`                            |
| Stylelint 16   | SCSS linting            | `.stylelintrc.cjs`                       |
| commitlint     | Conventional commits    | `commitlint.config.cjs`                  |
| Husky 9        | Git hooks               | `.husky/pre-commit`, `.husky/commit-msg` |
| lint-staged    | Auto-fix on commit      | Defined in `package.json`                |
| knip 5         | Dead code detection     | Defined in `package.json`                |
| Playwright     | E2E tests               | `tests/e2e/playwright.config.js`         |
| GitHub Actions | CI/CD                   | `.github/workflows/ci.yml`               |
| Dependabot     | Auto-dependency updates | `.github/dependabot.yml`                 |

## Commands

```bash
npm run dev             # Dev server on :9000
npm run build           # Production build (dist/spa/)
npm run lint            # ESLint
npm run lint:css        # Stylelint
npm run lint:all        # Both
npm run format          # Prettier
npm run audit           # Check vulnerabilities
npm run knip            # Find dead code
npm run test:e2e        # Playwright
npm run release         # Build + deploy via FTP
```

## Commit convention

Use `type(scope): message` where type is one of: feat, fix, chore, docs, refactor, test, style, ci, perf, build, revert.

## ESLint rules

- `vue/multi-word-component-names: off` (Quasar pages are single-word)
- `import/order` enforced (alphabetized within groups: builtin → external → internal → parent → sibling → index)
- Catch parameters must be named `error` (not `err`)
- Use `Number.parseFloat` not `parseFloat`
- Use `String#replaceAll` not `String#replace` with regex
- No console.log (only warn/error allowed)
- Cognitive complexity limit: 25 (warn)

## Path aliases (Vite/Quasar)

`src/` → `./src`, `stores/` → `./src/stores`, `components/` → `./src/components`, `pages/` → `./src/pages`, `services/` → `./src/services`, `utils/` → `./src/utils`, `boot/` → `./src/boot`

## Pre-commit hooks

- `.js` → ESLint --fix + Prettier --write
- `.vue` → ESLint --fix
- `.scss` → Stylelint --fix + Prettier --write
- `.json`, `.md` → Prettier --write
- Commit messages validated with conventional-changelog

## Visibilità contenuti per ruolo

Tabella basata sulle permissions Directus verificate sulle collections (giu 2026).  
Regola: **se il ruolo non ha permessi di lettura su una collection, l'app non deve mostrare l'interfaccia che chiama quella collection**.

| Collection / Feature | Administrator | Gestore Volontari | GestoreVerifica | Verificatore | Volontario |
|---|---|---|---|---|---|
| Pagamenti | ✅ 200 | ❌ 403 | ❌ 403 | ✅ 200 | ❌ 403 |
| Associazioni | ✅ 200 | ❌ 403 | ❌ 403 | ✅ 200 | ❌ 403 |
| BatchPagamenti | ✅ 200 | ❌ 403 | ❌ 403 | ✅ 200 | ❌ 403 |
| ListePagamenti | ✅ 200 | ❌ 403 | ❌ 403 | ✅ 200 | ❌ 403 |
| ErrorLog | ✅ 200 | ✅ 200 | ✅ 200 | ❌ 403 | ❌ 403 |
| Famiglie_Contatti | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 |
| Progetti | ✅ 200 | ✅ 200 | ✅ 200 | — | — |
| Famiglie | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 | — |
| Contatti | ❌ 403 | — | — | — | — |

**Permessi Directus attuali** (giu 2026):
- **Verificatore**: lettura + modifica su `Pagamenti`; lettura su `Associazioni`; lettura + creazione su `BatchPagamenti` + `ListePagamenti`
- **Administrator**: full su tutte
- **ErrorLog**: admin + gestori hanno accesso; verificatore **no** — l'interceptor Axios che logga errori 4xx tenta POST ma fallisce con 403 silenziato nel catch; browser mostra console.error ma non blocca il flusso
- **Contatti**: admin non ha read su `/items/Contatti` (usa `/users` invece)

## Unit testing (Vitest)

- Run: `npm run test:unit` (240 tests, no backend needed)
- Coverage: `npm run test:unit:coverage`
- Path: `tests/unit/`
- Utils coverage: 100%, Stores: 82%, Services: 78%

## E2E testing (Playwright)

- Run: `npm run test:e2e` (needs Directus accessible)
- Tags: `@smoke` (critical path), `@crud` (data persistence), `@regression` (edge cases), `@visual` (screenshots)
- Page Object Model in `tests/e2e/pages/`
- Two projects in Playwright: `chromium` (desktop) and `mobile` (Pixel 6)
- Screenshot tests: update baseline with `PLAYWRIGHT_UPDATE_SNAPSHOTS=1 npm run test:e2e`
- Visual tests (`@visual`) verify UI consistency across commits
- CI/CD: `.github/workflows/ci.yml` — quality (lint+build) → e2e (playwright)

## Processo feature

1. **Aprire GitHub Issue** con label: `feature`, `bug`, `security`, `chore`
2. **Discutere requisiti** nella issue (chi fa cosa, perché, quando)
3. **Scrivere piano** in `.opencode/plans/{nome-feature}.md` con:
   - Obiettivo e contesto
   - Modifiche necessarie (file per file)
   - Rischi e mitigazioni
   - Test da creare/modificare
4. **Implementare** seguendo il piano
5. **Testare** — unitari + E2E
6. **Aggiornare CHANGELOG.md** con descrizione della modifica
7. **Commit** con messaggio convenzionale: `feat(area): descrizione`
8. **Pull Request** su GitHub (se applicabile)

### .env e ambienti

- `.env` → sviluppo locale + test (MAI in produzione)
- `.env.production` → solo per `quasar build`
- `.env.development` → solo per `quasar dev` (sovrascrive .env)
- Le variabili `VITE_*` sono caricate nell'app. Quelle senza prefisso `VITE_` sono usate solo da script (deploy, test)
- **Non mettere MAI URL di produzione in `.env`** — usare `.env.production`

### Password utenti

- Alla creazione di un utente Directus, NON viene inviata email di invito
- Il volontario riceve password gestita manualmente dall'admin
- Il cambio password è disponibile dal menu utente (AppLayout)
- Il reset password via email funziona dalla pagina di login

## Deploy

- **MAI deployare in produzione senza prima chiedere esplicita autorizzazione all'utente.**
- Prima del deploy: E2E full suite passata.
- Dopo il deploy: avvisare l'utente e chiedere conferma.
- Il numero di versione (patch) va aumentato solo dopo autorizzazione.
