# E2E Testing con Playwright

## Stack

- **Framework:** Playwright (`@playwright/test ^1.40.0`)
- **Config:** `tests/e2e/playwright.config.js`
- **Test dir:** `tests/e2e/specs/`
- **Progetti:** `chromium` (Desktop) e `mobile` (Pixel 6, 390x844)

## Setup

```bash
# Installa browser
npx playwright install --with-deps

# Esegui tutti i test E2E (serve Directus in esecuzione)
npm run test:e2e

# UI mode interattivo
npm run test:e2e:ui

# Solo smoke test
npx playwright test --config tests/e2e/playwright.config.js --grep @smoke

# Solo test CRUD
npx playwright test --config tests/e2e/playwright.config.js --grep @crud
```

## Tagging

| Tag           | Scopo                                             | Esempi                    |
| ------------- | ------------------------------------------------- | ------------------------- |
| `@smoke`      | Percorso critico (login, pagina carica)           | `A-01`, `F-01`, `CT-01`   |
| `@crud`       | Persistenza dati (crea, modifica, elimina)        | `CG-04`, `IE-01`, `IB-01` |
| `@regression` | Edge case, validazione, errori                    | `A-04`, `CG-02`, `EH-01`  |
| `@visual`     | Screenshot (toHaveScreenshot)                     | `VR-SS-01`, `F-SS-01`     |
| `@e2e`        | Flusso end-to-end completo                        | `VF-05`, `RP-10`          |
| `@setup`      | Preparazione dati per altri test                  | `RC-SETUP-01`             |
| `@system`     | Test di sistema (flusso completo, multi-famiglia) | `SYS-01`…`SYS-09`         |

## Screenshot Test

I test screenshot usano `toHaveScreenshot()` e confrontano l'output con un baseline.

### Aggiungere un nuovo screenshot test

```js
test('XX-SS-01: Descrizione @visual', async ({ page }) => {
  // Naviga e attendi il caricamento
  await page.goto('/pagina')
  await expect(page.locator('.selector')).toBeVisible({ timeout: 10000 })
  await page.waitForTimeout(500) // attendi animazioni

  // Screenshot
  await expect(page).toHaveScreenshot('nome-file.png', {
    maxDiffPixels: 500,
    animations: 'disabled'
  })
})
```

### Generare/aggiornare i baseline

```bash
PLAYWRIGHT_UPDATE_SNAPSHOTS=1 npm run test:e2e
```

I file `.png` generati vanno committati nel repository (in `tests/e2e/specs/*.spec.js-snapshots/`).

### Quando aggiornare i baseline

- Dopo modifiche significative al layout
- Dopo aggiornamenti Quasar
- Quando un test screenshot fallisce intenzionalmente (modifica voluta)

## Struttura

```
tests/e2e/
├── playwright.config.js       # Configurazione Playwright
├── global-setup.mjs           # Pulizia dati di test + guard produzione
├── fixtures/
│   ├── auth-test.json         # 8 utenti di test
│   └── test-file-pdf.pdf      # PDF per test upload
├── helpers/
│   ├── console.js             # Base test con monitoraggio console
│   ├── login.js               # Helper login per ruolo
│   ├── setup.js               # Creazione dati via API Directus
│   ├── submission.js          # Creazione submission anonima
│   ├── giustificativo.js      # Creazione giustificativo via UI
│   ├── network.js             # Intercettazione richieste API
│   ├── email.js               # Lettura email via IMAP
│   ├── results-reporter.cjs   # Reporter custom
│   ├── system-scenario.js     # Azioni + assert per i test di sistema (@system)
│   └── skip-mobile.js         # Helper skip su mobile
├── pages/
│   ├── LoginPage.js
│   ├── SubmitPage.js
│   ├── VerificaPage.js
│   ├── GestionePage.js
│   ├── RiconciliazionePage.js
│   ├── ResetPasswordPage.js
│   └── FamigliePage.js
└── specs/
    ├── auth.spec.js           # Login, logout, route guards, screenshot
    ├── submit.spec.js          # Invio pubblico giustificativi, screenshot
    ├── verifica.spec.js        # Verifica tabella, badge, bancari, screenshot
    ├── verifica-flow.spec.js   # Flusso verifica E2E
    ├── riconciliazione.spec.js # Riconciliazione submissions
    ├── famiglie.spec.js        # CRUD famiglie, IBAN, screenshot
    ├── giustificativi.spec.js  # CRUD giustificativi, screenshot
    ├── contatti.spec.js        # CRUD contatti, screenshot
    ├── layout.spec.js          # Sidebar navigazione per ruolo, screenshot
    ├── admin.spec.js           # Admin page CRUD, screenshot
    ├── pagamenti.spec.js       # Pagamenti page
    ├── deduplica.spec.js       # Deduplica page
    ├── gestione-fixes.spec.js  # Fix gestione
    ├── referente.spec.js       # Referenti
    ├── email-case.spec.js      # Case sensitivity email
    ├── error-log.spec.js       # Error log admin
    ├── system-scenario.spec.js  # Test di sistema @system (desktop + mobile)
    └── reset-password.spec.js  # Reset password
```

## Robustezza contro i flake del dev server

- `helpers/console.js` ignora **solo** i `Failed to fetch dynamically imported module` transitori del dev server (path `/src/`, mai build di produzione) e li stampa in un blocco dedicato; gli altri errori console restano bloccanti.
- `helpers/login.js` (`loginAs`) fa un `reload` + secondo tentativo se `waitForURL` va in timeout per un hiccup del dev.
- `helpers/giustificativo.js` (`inviaGiustificativo`) è deterministico: attende la card e la PATCH `Stato=inviato`, non salta il click.
- `retries` locale opt-in: `E2E_RETRIES=1 npm run test:e2e` (in CI è già 1).

## CI/CD

Il workflow GitHub Actions (`.github/workflows/ci.yml`) esegue i test E2E nel job `e2e`:

1. Checkout + setup Node (dal `.nvmrc`)
2. `npm ci`
3. `npx playwright install --with-deps`
4. `npm run build` (serve per i test)
5. `npx playwright test --config tests/e2e/playwright.config.js`
6. Upload artefatti (`test-results/`) anche in caso di fallimento

Per eseguire i test E2E in locale con le stesse condizioni CI:

```bash
quasar build && npx serve dist/spa -p 9000
# In un altro terminale:
npx playwright test --config tests/e2e/playwright.config.js
```

## Note

- I test richiedono un'istanza Directus accessibile (configurata in `.env`)
- I dati di test vengono puliti automaticamente da `global-setup.mjs` all'inizio di ogni run
- Gli utenti di test sono definiti in `fixtures/auth-test.json`
- Il file non va committato se contiene credenziali reali
- I test screenshot (`@visual`) generano file `.png` che vanno committati
