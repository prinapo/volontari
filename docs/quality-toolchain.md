# Quality Toolchain

## Overview

This document describes the software quality stack adopted for the volontari project. Every tool is free and open-source.

## Tools

### 1. ESLint (Static Analysis — JS/Vue)

**Version:** 8.x  
**Config:** `.eslintrc.cjs`  
**Ignored:** `tests/`, `scripts/`, `*.config.cjs`, `dist/`, `.quasar/`

**Plugins added:**

| Plugin | Purpose |
|---|---|
| `eslint-plugin-vue` | Vue 3 recommended rules |
| `eslint-plugin-import` | Import ordering, unresolved path detection |
| `eslint-plugin-unicorn` | Modern JS best practices |
| `eslint-plugin-sonarjs` | Cognitive complexity, duplication, bug patterns |
| `eslint-plugin-security` | Detect insecure patterns (eval, regex DoS, etc.) |
| `eslint-plugin-promise` | Proper promise/async handling |
| `eslint-config-prettier` | Disables ESLint rules that conflict with Prettier |

**Key rules overridden:**
- `vue/multi-word-component-names: off` (Quasar convention)
- `vue/require-default-prop: off`
- `no-console: warn` (only `warn` and `error` allowed)
- `no-unused-vars: warn` (with `^_` ignore pattern)
- `import/order: warn` (alphabetized within groups)
- `sonarjs/cognitive-complexity: [warn, 25]`
- `unicorn/catch-error-name: error` (must use `error`, not `err`)
- `unicorn/prefer-number-properties: error` (use `Number.parseFloat`, `Number.isNaN`)
- `unicorn/prefer-string-replace-all: error` (use `replaceAll` over `replace` with regex)

**Commands:**
```bash
npm run lint                 # Lint src/
npm run lint -- --fix        # Auto-fix
```

### 2. Prettier (Formatting)

**Version:** 3.x  
**Config:** `.prettierrc`  
**Rules:** `semi: false`, `singleQuote: true`, `trailingComma: "none"`, `printWidth: 120`, `arrowParens: "avoid"`

**Command:**
```bash
npm run format
```

### 3. Stylelint (SCSS Linting)

**Version:** 16.x  
**Config:** `.stylelintrc.cjs`  
**Standard config:** `stylelint-config-standard-scss`

**Command:**
```bash
npm run lint:css             # Lint src/**/*.scss
npm run lint:css -- --fix    # Auto-fix
```

### 4. commitlint (Commit Convention)

**Version:** 19.x  
**Config:** `commitlint.config.cjs`  
**Standard:** `@commitlint/config-conventional`

**Allowed types:** `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`

**Format:** `type(scope): description`

**Examples:**
```
feat: add export CSV button
fix(verifica): prevent duplicate rows on sort
chore(deps): update axios to 1.7
```

Enforced via Husky `commit-msg` hook.

### 5. Husky + lint-staged (Pre-commit)

**Husky version:** 9.x  
**lint-staged version:** 17.x

**Hooks:**
| Hook | Action |
|---|---|
| `pre-commit` | Runs lint-staged |
| `commit-msg` | Runs commitlint |

**lint-staged rules:**

| Pattern | Actions |
|---|---|
| `*.js` | ESLint --fix → Prettier --write |
| `*.vue` | ESLint --fix |
| `*.scss` | Stylelint --fix → Prettier --write |
| `*.json`, `*.md` | Prettier --write |

### 6. knip (Dead Code Detection)

**Version:** 5.x  
**Config:** In `package.json` under `"knip"` key

**Command:**
```bash
npm run knip
```

**Note:** knip will report Vue components as "unused" because they are loaded dynamically by Vue Router / Quasar. Verify each result before deleting.

### 7. npm audit (Security)

**Commands:**
```bash
npm run audit            # Show vulnerabilities (high+)
npm run audit:fix        # Auto-fix vulnerabilities
```

Dependabot is configured in `.github/dependabot.yml` to open automatic PRs for dependency updates.

### 8. Playwright (E2E Tests)

**Version:** 1.40+  
**Config:** `tests/e2e/playwright.config.js`  
**Test dir:** `tests/e2e/specs/`

**Commands:**
```bash
npm run test:e2e              # Headless
npm run test:e2e:ui           # Interactive UI mode
npx playwright test --grep @smoke  # Run smoke tests only
```

**Projects:** `chromium` (Desktop Chrome), `mobile` (emulated Pixel 6)

**Tags:** `@smoke` (critical path), `@crud` (data persistence), `@regression` (edge cases)

### 9. GitHub Actions (CI/CD)

**Config:** `.github/workflows/ci.yml`

**Jobs:**

1. **quality** (runs on push/PR to main)
   - Lint (ESLint + Stylelint)
   - Build

2. **e2e** (runs after quality)
   - Build
   - Run Playwright tests
   - Upload test results as artifact

**Dependabot** runs weekly for npm, monthly for GitHub Actions.

## Environment Consistency

| File | Purpose |
|---|---|
| `.editorconfig` | Editor settings (indent, charset, line ending) |
| `.nvmrc` | Node.js version pinning (20) |
| `.env.example` | Environment variable template |

## Reference: Remaining Warnings

After the initial setup, these warnings remain (all non-blocking):

| File | Warning | Severity |
|---|---|---|
| `src/stores/verifica.store.js` | Cognitive complexity 27/45/32 (3 functions) | Refactoring needed |
| `src/stores/auth.store.js` | Cognitive complexity 26 | Refactoring needed |
| `src/stores/gestione.store.js` | Cognitive complexity 29 | Refactoring needed |
| `src/components/Gestione/ContattoDialog.vue` | Cognitive complexity 35 | Refactoring needed |
| `src/stores/pagamenti.store.js` | Unused import `contattiService` | Can be removed |
| `src/services/contatti.service.js` | Duplicate string literal 8x | Extract constant |
| `src/services/gestione.service.js` | Duplicate string literal 8x | Extract constant |

## Recommended Workflow

```bash
# 1. Before committing
npm run lint:all
npm run build

# 2. For new features
npm run test:e2e -- --grep @smoke   # Smoke test first
npm run test:e2e                     # Full suite

# 3. Weekly maintenance
npm run audit                        # Check vulnerabilities
npm run knip                         # Check for dead code
```
