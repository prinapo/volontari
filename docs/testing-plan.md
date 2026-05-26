# Testing Plan Document

**Version:** 2.0.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — 43/46 ✅, 3 skipped (no draft cards); comprehensive CRUD + smoke |
| 2026-05-25 | 2.0.0 | System | Final — updated test count, added test ID reference, documented all test scenarios |

---

## 1. Test Strategy

- **Framework:** Playwright
- **Type:** End-to-end (e2e) tests
- **Scope:** All user-facing flows (auth, famiglie, giustificativi)
- **Environment:** Quasar dev server (Vite) against production Directus
- **Test user:** Volontario-level user (credentials in `tests/e2e/fixtures/auth.json`)

---

## 2. Test Structure

```
tests/e2e/
├── playwright.config.js           # Configuration (chromium, baseURL=localhost:9000)
├── fixtures/
│   ├── auth.json                  # Test user credentials (EXCLUDED from public repo)
│   └── test-file-pdf.pdf          # Sample PDF for file upload tests
├── helpers/
│   └── console.js                 # Captures browser console logs, errors, API 4xx/5xx
├── pages/
│   ├── LoginPage.js               # Page Object Model
│   └── FamigliePage.js            # Page Object Model
└── specs/
    ├── auth.spec.js               # 4 tests (A-01 to A-04)
    ├── famiglie.spec.js           # 12 tests (F-01, G-01, DB-01/02/03, IB-01/02/03/04, IN-01, PS-01/02/03/04)
    └── giustificativi.spec.js     # 22 tests (CG-01..06, IE-01..07, AL-01..06, EL-01..04, SU-01..03, RO-01..02)
```

---

## 3. Playwright Configuration

```js
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // sequential to avoid auth conflicts
  reporter: [['html', { outputFolder: '../../test-results' }], ['list']],
  use: {
    baseURL: 'http://localhost:9000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retry-with-video'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: process.env.CI
    ? {
        command: 'npx quasar build && npx serve dist/spa -p 9000',
        port: 9000,
        timeout: 120000
      }
    : undefined
})
```

---

## 4. Test Execution Commands

```bash
# Run all tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run a single spec file
npx playwright test --config tests/e2e/playwright.config.js specs/auth.spec.js

# Run specific test by title
npx playwright test --config tests/e2e/playwright.config.js --grep "A-01"

# Run with trace for debugging
npx playwright test --config tests/e2e/playwright.config.js --trace=on
```

---

## 5. CI/CD Integration (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test --config tests/e2e/playwright.config.js
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test-results/
```

---

## 6. Test Isolation Strategy

- Each test suite uses `beforeEach` to login as the test user
- Tests run sequentially (`workers: 1`) to avoid token clashes
- Giustificativi tests create their own test data with `__TEST_` prefix for isolation
- Tests skip gracefully when prerequisites are not met (no draft card, no card with allegato, etc.)
- Console error helper captures browser errors, warnings, and API 4xx/5xx for debugging

---

## 7. Test ID Reference

### Auth (4 tests)

| ID | Title | Tags | File |
|---|---|---|---|
| A-01 | Login con credenziali valide | `@smoke` | auth.spec.js |
| A-02 | Logout pulisce sessione e blocca accesso diretto | `@smoke` | auth.spec.js |
| A-03 | Login fallito mostra errore | `@regression` | auth.spec.js |
| A-04 | Privazione token forza redirect a login | `@regression` | auth.spec.js |

### Famiglie (12 tests)

| ID | Title | Tags | File |
|---|---|---|---|
| F-01 | Pagina carica tutti i dati corretti all'avvio | `@smoke` | famiglie.spec.js |
| G-01 | Genitori con Nome, Email cliccabile, Telefoni cliccabili | `@smoke` | famiglie.spec.js |
| DB-01 | Dati bancari espansione inizialmente collassata | `@smoke` | famiglie.spec.js |
| DB-02 | Click Dati bancari espande mostra IBAN e Intestatario | `@smoke` | famiglie.spec.js |
| DB-03 | Click again collassa nasconde IBAN e Intestatario | `@smoke` | famiglie.spec.js |
| IB-01 | IBAN modifica con ✓ salva e aggiorna display | `@crud` | famiglie.spec.js |
| IB-02 | IBAN modifica con X annulla valore originale | `@crud` | famiglie.spec.js |
| IB-03 | IBAN clicca senza modificare ✓ torna a display NO PATCH | `@crud` | famiglie.spec.js |
| IB-04 | IBAN click senza modificare torna a display | `@crud` | famiglie.spec.js |
| IN-01 | Intestatario modifica con ✓ salva persiste dopo reload | `@crud` | famiglie.spec.js |
| PS-01 | ProgettoSelector opzioni formato corretto | `@smoke` | famiglie.spec.js |
| PS-02 | Selezione progetto mostra card totali | `@smoke` | famiglie.spec.js |
| PS-03 | Card totali mostra valori positivi | `@crud` | famiglie.spec.js |
| PS-04 | Item selezionato ha sfondo bg-green-1 | `@smoke` | famiglie.spec.js |

### Giustificativi (22 tests)

| ID | Title | Tags | File |
|---|---|---|---|
| CG-01 | Dialog si apre con Aggiungi | `@smoke` | giustificativi.spec.js |
| CG-02 | Salva senza Descrizione mostra errore validazione | `@regression` | giustificativi.spec.js |
| CG-03 | Salva senza Importo mostra errore validazione | `@regression` | giustificativi.spec.js |
| CG-04 | Salva senza File mostra errore validazione | `@regression` | giustificativi.spec.js |
| CG-05 | Annulla chiude dialog senza creare | `@regression` | giustificativi.spec.js |
| CG-06 | Crea con tutti i campi persiste dopo reload | `@crud` | giustificativi.spec.js |
| IE-01 | Descrizione modifica con ✓ salva e persiste dopo reload | `@crud` | giustificativi.spec.js |
| IE-02 | Descrizione modifica con X annulla valore originale | `@crud` | giustificativi.spec.js |
| IE-03 | Descrizione click senza modificare ✓ torna a display | `@crud` | giustificativi.spec.js |
| IE-04 | Importo modifica con ✓ salva e persiste dopo reload | `@crud` | giustificativi.spec.js |
| IE-05 | Importo modifica con X annulla valore originale | `@crud` | giustificativi.spec.js |
| IE-06 | Data modifica con ✓ salva e persiste dopo reload | `@crud` | giustificativi.spec.js |
| IE-07 | Data modifica con X annulla valore originale | `@crud` | giustificativi.spec.js |
| AL-01 | Card con allegato ha pulsanti Apri e Scarica con label | `@smoke` | giustificativi.spec.js |
| AL-02 | Card senza allegato mostra Nessun allegato | `@smoke` | giustificativi.spec.js |
| AL-03 | Scarica file è un PDF valido | `@crud` | giustificativi.spec.js |
| AL-04 | Apri file si apre in nuova scheda con URL corretto | `@crud` | giustificativi.spec.js |
| AL-05 | Cambia file visibile solo in bozza | `@smoke` | giustificativi.spec.js |
| AL-06 | Sostituisci file reload persiste | `@crud` | giustificativi.spec.js |
| EL-01 | Cestino Elimina visibile solo in bozza | `@smoke` | giustificativi.spec.js |
| EL-02 | Elimina dialog Annulla card resta | `@crud` | giustificativi.spec.js |
| EL-03 | Elimina conferma card sparisce dalla lista | `@crud` | giustificativi.spec.js |
| EL-04 | Elimina reload card ancora sparita | `@crud` | giustificativi.spec.js |
| SU-01 | Invia badge passa da Bozza a Inviato | `@crud` | giustificativi.spec.js |
| SU-02 | Dopo Invia pulsanti edit/Elimina spariscono | `@crud` | giustificativi.spec.js |
| SU-03 | Invia reload stato ancora Inviato | `@crud` | giustificativi.spec.js |
| RO-01 | Card inviata click campo NON entra in edit | `@crud` | giustificativi.spec.js |
| RO-02 | Card inviata Apri e Scarica ancora funzionanti | `@smoke` | giustificativi.spec.js |

---

## 8. Tagging Convention

| Tag | Description |
|---|---|
| `@smoke` | Critical path tests (login, page load, element visibility) |
| `@crud` | Create/read/update/delete tests with data persistence verification |
| `@regression` | Edge cases, validation errors, cancel operations |

Usage in test file:
```js
test('A-01: Login con credenziali valide @smoke', async () => { ... })
test('IB-01: IBAN modifica con ✓ salva e aggiorna display @crud', async () => { ... })
test('CG-02: Salva senza Descrizione mostra errore validazione @regression', async () => { ... })
```
