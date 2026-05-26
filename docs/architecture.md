# Architecture Document

**Version:** 2.0.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — test suite 43/46 ✅; fixed email query, Dati bancari expansion, Elimina button |
| 2026-05-25 | 2.0.0 | System | Final — added Verifica/Rendicontazione page, AppLayout with sidebar, role-based routing, initFromStorage boot flow |

---

## 1. Overview

This document describes the architecture of the **Portale Volontario** application, a Quasar (Vue 3) SPA that consumes a Directus backend. The application was migrated from Appsmith.

**Target domain:** `https://volontari.sostienilsostegno.com`
**Backend API:** `https://app.sostienilsostegno.com`

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        BROWSER                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │               Quasar SPA (Vue 3)                     │    │
│  │                                                      │    │
│  │  ┌──────────┐  ┌────────┐  ┌────────────────────┐  │    │
│  │  │  Router   │  │  Pinia │  │ Axios Interceptor  │  │    │
│  │  │ (Vue-Rtr) │  │ Stores │  │ (auto-refresh 401) │  │    │
│  │  └────┬─────┘  └────────┘  └──────┬─────────────┘  │    │
│  │       │                            │                │    │
│  │  ┌────▼────────────────────────────▼─────────────┐  │    │
│  │  │         Pages & Components                     │  │    │
│  │  │  Login | Famiglie | Verifica                  │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  └──────────────────────────┬──────────────────────────┘    │
└─────────────────────────────┼──────────────────────────────┘
                               │ HTTPS
                               ▼
┌──────────────────────────────────────────────────────────────┐
│              Directus Backend (API)                           │
│         https://app.sostienilsostegno.com                     │
│                                                              │
│  /auth            → Authentication & token refresh           │
│  /users/me        → Current user info                        │
│  /roles/:id       → Role details                             │
│  /items/*         → CRUD on collections                      │
│  /files           → File upload/management                   │
│  /assets/*        → File download/serve                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              PostgreSQL Database                    │     │
│  │  contatti | Famiglie | Famiglie_Contatti           │     │
│  │  Progetti | Giustificativi | email                 │     │
│  │  Rendicontazioni | directus_users | directus_files │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Quasar v2 (Vue 3 Composition API) |
| Build tool | Vite |
| State management | Pinia |
| HTTP client | Axios |
| Router | Vue Router 4 (history mode) |
| Styling | SCSS + Quasar CSS framework |
| Testing | Playwright (e2e, 46 tests) |
| Linting | ESLint + Prettier |
| Backend | Directus 11.17.4 |
| Database | PostgreSQL |

---

## 4. Data Flow

```
User Action → Component Event → Pinia Store Action → Service Method → Axios → Directus API
                                                    │
                                            Response ← JSON ← Database
                                                    │
                              Store updates state → Component re-renders
```

### Authentication Flow (Detailed)

See [auth-flow.md](./auth-flow.md)

---

## 5. Component Tree

```
App.vue
└── <router-view>
    ├── LoginPage.vue (public)
    │   ├── Login form (q-card)
    │   └── ForgotPasswordDialog (q-dialog)
    │
    ├── AppLayout.vue (protected)
    │   ├── AppHeader (q-header)
    │   │   ├── User display name + dropdown
    │   │   ├── Change password (q-dialog)
    │   │   └── Logout button
    │   ├── QDrawer sidebar
    │   │   ├── Famiglie link
    │   │   └── Verifica link (if canVerifica)
    │   └── QPageContainer
    │       └── <router-view>
    │           ├── FamigliePage.vue
    │           │   ├── FamigliaInfoCard.vue
    │           │   │   ├── text (Nome_Famiglia)
    │           │   │   ├── genitori section (Nome, Email mailto:, Telefono tel:)
    │           │   │   └── q-expansion-item (Dati bancari)
    │           │   │       ├── InlineEditableField.vue (IBAN)
    │           │   │       └── InlineEditableField.vue (Intestatario_CC)
    │           │   ├── ProgettoSelector.vue (q-select)
    │           │   ├── Card totali (Totale Giustificativi, Totale Rimborsabile)
    │           │   └── GiustificativoList.vue
    │           │       ├── GiustificativoCard.vue (per item)
    │           │       │   ├── q-badge (Stato: Bozza/Inviato)
    │           │       │   ├── InlineEditableField.vue (Descrizione, if draft)
    │           │       │   ├── InlineEditableField.vue (Importo, if draft)
    │           │       │   ├── InlineEditableField.vue (Data, if draft)
    │           │       │   ├── a (Apri, allegato link)
    │           │       │   ├── a (Scarica, allegato download)
    │           │       │   ├── q-btn (Cambia file, if draft)
    │           │       │   ├── q-btn (Elimina, if draft)
    │           │       │   └── q-btn (Invia, if draft)
    │           │       └── GiustificativoForm.vue (q-dialog for add)
    │           │           ├── q-input (Descrizione)
    │           │           ├── q-input (Importo, number)
    │           │           ├── q-date (Data)
    │           │           ├── q-select (Tranche)
    │           │           ├── q-select (Stato)
    │           │           ├── FileUploader.vue (q-file)
    │           │           └── q-btn (Salva)
    │           │
    │           └── VerificaPage.vue (admin/verifica role only)
    │               ├── Filtri (Tranche, AnnoBando, Rendicontazione, Cerca)
    │               ├── Summary grid (count, rendicontato, rimborsabile, ASPI ready)
    │               └── q-table (progetti con colonne personalizzate)
```

---

## 6. Routing Strategy

```
/login          → LoginPage.vue        (public)
/               → redirect → /famiglie
/famiglie       → FamigliePage.vue     (requiresAuth)
/verifica       → VerificaPage.vue     (requiresAuth + requiredRole: Verifica)
/:pathMatch*    → redirect → /famiglie
```

**Route guard logic:**
1. Logged-in user on `/login` → redirect to `/famiglie` (or `/verifica` if `canVerifica`)
2. Unauthenticated user on protected route → redirect to `/login`
3. Non-Verifica user on `/verifica` → redirect to `/famiglie`

See [auth-flow.md](./auth-flow.md) for detailed route guard code.

---

## 7. Key Design Decisions

| Decision | Rationale |
|---|---|
| SPA (no SSR) | Simpler deployment, Directus handles auth via JWT |
| Pinia over Vuex | Official recommendation for Vue 3 |
| Inline editing over modals | Better UX, direct manipulation, less context switching |
| No backend proxy layer | Directus REST API is sufficient; CORS configured directly |
| localStorage for JWT | SPA limitation; refresh token mitigates risk |
| Boot-time auth restore | `auth.store.initFromStorage()` in boot file restores session before mount |
| Role-based routing | `canVerifica` getter determines visible routes (Famiglie vs Verifica) |
| Separate email query | Email fetched from `email` table via `_in` filter (not o2m on contatti) to avoid 403 |
| Axios interceptor for refresh | Automatically catches 401, attempts refresh, retries original request |
| Cache-buster on GET | `_t=${Date.now()}` param prevents browser caching of API responses |
