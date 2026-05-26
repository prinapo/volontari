# Portale Volontario

Quasar (Vue 3) SPA per la gestione dei rimborsi volontari, migrata da Appsmith a Directus backend.

## Stack

- **Frontend:** Quasar v2 + Vue 3 + Pinia + Axios
- **Backend:** Directus 11.x (PostgreSQL)
- **Testing:** Playwright (46 test e2e)
- **Build:** Vite

## Setup

```bash
npm install
npx quasar dev          # Sviluppo su localhost:9000
npm run test:e2e        # Test e2e
npx quasar build        # Build produzione (dist/spa/)
```

## Documentazione

Tutta la documentazione è in `docs/`:

| File | Contenuto |
|---|---|
| `architecture.md` | Architettura, component tree, data flow |
| `api-integration.md` | Endpoint Directus, error handling |
| `auth-flow.md` | Login, token refresh, route guard |
| `components-map.md` | Gerarchia componenti, props/events |
| `appsmith-migration-map.md` | Mapping Appsmith → Quasar |
| `state-management.md` | Store Pinia, state/getters/actions |
| `testing-plan.md` | Strategia test, ID reference |
| `test-cases.md` | Design pattern dei test |
| `deployment-guide.md` | Build, deploy, CORS, permissioni |

## Ambiente

Crea `.env` dal template:

```bash
cp .env.example .env
```

## Struttura

```
src/
├── boot/           # Axios + auth init
├── components/     # Layout, Famiglia, Giustificativi, Common
├── pages/          # LoginPage, FamigliePage, VerificaPage
├── router/         # Vue Router + route guard
├── services/       # Axios chiamate API
├── stores/         # Pinia (auth, famiglie, giustificativi, verifica)
└── utils/          # Constants, formatters
```

## Repo

Repository privato: `https://github.com/prinapo/volontari`
