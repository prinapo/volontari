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

## Unit testing (Vitest)

- Run: `npm run test:unit` (240 tests, no backend needed)
- Coverage: `npm run test:unit:coverage`
- Path: `tests/unit/`
- Utils coverage: 100%, Stores: 82%, Services: 78%

## E2E testing (Playwright)

- Run: `npm run test:e2e` (needs Directus accessible)
- 16 spec files, 151+ tests, 27 test files
- Tags: `@smoke` (critical path), `@crud` (data persistence), `@regression` (edge cases), `@visual` (screenshots)
- Page Object Model in `tests/e2e/pages/`
- Two projects in Playwright: `chromium` (desktop) and `mobile` (Pixel 6)
- Screenshot tests: update baseline with `PLAYWRIGHT_UPDATE_SNAPSHOTS=1 npm run test:e2e`
- Visual tests (`@visual`) verify UI consistency across commits
- CI/CD: `.github/workflows/ci.yml` — quality (lint+build) → e2e (playwright)
