# Testing Plan Document

**Version:** 1.1.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — 43/46 ✅, 3 skipped (no draft cards); comprehensive CRUD + smoke |

---

## 1. Test Strategy

- **Framework:** Playwright
- **Type:** End-to-end (e2e) tests
- **Scope:** All user-facing flows
- **Environment:** Quasar dev server (Vite) against production Directus

---

## 2. Test Structure

```
tests/e2e/
├── playwright.config.js      # Configuration
├── fixtures/
│   └── auth.json             # Test user credentials
├── pages/
│   ├── LoginPage.js          # Page Object Model
│   └── FamigliePage.js       # Page Object Model
└── specs/
    ├── auth.spec.js          # Auth-related tests
    ├── famiglie.spec.js      # Famiglia page tests
    └── giustificativi.spec.js # Giustificativi CRUD tests
```

---

## 3. Playwright Configuration

```js
// tests/e2e/playwright.config.js
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // sequential to avoid auth conflicts
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:9000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retry-with-video'
  },
  webServer: {
    command: 'npx quasar dev',
    port: 9000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
})
```

---

## 4. Test Execution Commands

```bash
# Run all tests
npx playwright test --config tests/e2e/playwright.config.js

# Run with UI mode (interactive)
npx playwright test --config tests/e2e/playwright.config.js --ui

# Run a single test file
npx playwright test --config tests/e2e/playwright.config.js specs/auth.spec.js

# Run with specific project (mobile viewport)
npx playwright test --config tests/e2e/playwright.config.js --project=iphone-se

# Run and show trace for debugging
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
- Giustificativi tests create their own test data and clean up if possible
- The test user `maddalena.massari@gmail.com` is a stable account (not a disposable test user — so read-only tests are preferred to avoid changing production data)
- For destructive tests (create/update/delete), a separate test Directus user should be considered for future

---

## 7. Test ID Convention

| Prefix | Area | Example |
|---|---|---|
| A- | Authentication | A-01 Login, A-04 Token removal redirect |
| F-, G-, DB-, IB-, IN-, PS- | Famiglie page | IB-01 IBAN save, PS-03 totals |
| CG-, IE-, AL-, EL-, SU-, RO- | Giustificativi | CG-06 Create persists, AL-03 PDF magic bytes, EL-03 Elimina |

## 8. Tagging Convention

| Tag | Description |
|---|---|
| `@smoke` | Critical path tests (login, page load) |
| `@crud` | Create/read/update/delete tests |
| `@mobile` | Mobile responsive tests |
| `@regression` | Full regression suite |

Usage in test file:
```js
test('Login success @smoke', async () => { ... })
test('Create giustificativo @crud', async () => { ... })
```
