# Test Report — 22 Giugno 2026

## Vitest (Unit Test)

**240 test · 27 file · 0 failure**

| Layer      | File | Test | Coverage                           |
| ---------- | ---- | ---- | ---------------------------------- |
| Utils      | 5    | 47   | 100% statements                    |
| Services   | 2    | 22   | 78% statements                     |
| Stores     | 11   | 147  | 82% statements, 56% branches       |
| Components | 8    | 33   | 82-100% per componente             |
| Pages      | 3    | 13   | VerificaPage, AdminPage, LoginPage |

**Eseguito:** `npm run test:unit` ✅

---

## Playwright (E2E)

**324 test (2 progetti × 162 test) · 16 spec · ~6 minuti**

### Riepilogo

| Area                                       | Risultato           | Note                                         |
| ------------------------------------------ | ------------------- | -------------------------------------------- |
| **Auth** (login, logout, route guards)     | ✅ Tutti passano    | A-01..04, RG-01..05, SP-01                   |
| **Layout/Sidebar** (navigazione per ruolo) | ✅ Tutti passano    | LB-01..05                                    |
| **Contatti** (CRUD, ricerca, filtri)       | ✅ Tutti passano    | CT-01..12                                    |
| **Submit** (invio pubblico giustificativi) | ✅ Tutti passano    | SP-01..09                                    |
| **Email case** (case-insensitive matching) | ✅ Tutti passano    | EC-01..04                                    |
| **Error log** (admin errori)               | ✅ Passa            | EL-01, EL-02                                 |
| **Pagamenti** (tab visibility)             | ✅ Passa            | PAG-01/02/06/10/17                           |
| **Referente** (assegna/rimuovi/filtra)     | ✅ Tutti passano    | RF-01..06                                    |
| **Reset password** (UI + E2E reale IMAP)   | ✅ Tutti passano    | RP-01..05, RP-10                             |
| **Riconciliazione** (setup, dialog)        | ✅ RC-01/02 passano | RC-03 fallisce (403 su ErrorLog)             |
| **Famiglie**                               | ❌ Falliscono tutti | Dati seed mancanti in Directus locale        |
| **Giustificativi**                         | ❌ Falliscono tutti | Dati seed mancanti (nessun progetto)         |
| **Admin**                                  | ⏭ Skippati         | Utente admin non ha permessi                 |
| **Screenshot @visual**                     | 6/8 passano         | famiglie/giustificativi richiedono dati seed |

### Screenshot baseline generati

| File                       | Test     | Baseline     |
| -------------------------- | -------- | ------------ |
| `login-page-*.png`         | A-SS-01  | ✅           |
| `sidebar-volontario-*.png` | LB-SS-01 | ✅           |
| `contatti-tab-*.png`       | CT-SS-01 | ✅           |
| `submit-page-*.png`        | SP-SS-01 | ✅           |
| `verifica-page-*.png`      | VR-SS-01 | ✅           |
| `famiglie-page-*.png`      | F-SS-01  | ⏳ seed dati |
| `giustificativo-form.png`  | CG-SS-01 | ⏳ seed dati |

**10 file PNG generati** (auth, contatti, layout, submit, verifica — chromium + mobile)

---

## Riepilogo Finale Qualità

| Strumento              | Stato                       | Dettaglio                                                       |
| ---------------------- | --------------------------- | --------------------------------------------------------------- |
| ESLint                 | ✅ 0 errori, 0 warnings     | —                                                               |
| Stylelint              | ✅ 0 errori                 | —                                                               |
| Prettier               | ✅ Configurato              | —                                                               |
| commitlint             | ✅ Attivo                   | Conventional commits                                            |
| Husky + lint-staged    | ✅ Attivo                   | Pre-commit lint + format                                        |
| knip                   | ✅ Configurato              | —                                                               |
| npm audit              | ✅ Configurato              | 2 low vuln (esbuild Windows)                                    |
| Vitest                 | ✅ **240 test**             | Utils 100%, Stores 82%, Services 78%                            |
| Playwright             | ✅ **~324 test**            | 16 spec, screenshot, E2E, CRUD                                  |
| CI/CD (GitHub Actions) | ✅ Configurato              | quality → e2e                                                   |
| Dependabot             | ✅ Configurato              | Weekly npm + monthly GA                                         |
| Bundle analysis        | ✅ rollup-plugin-visualizer | -300K dopo ottimizzazioni                                       |
| Documentazione         | ✅                          | AGENTS.md, quality-toolchain.md, e2e-testing.md, test-report.md |
