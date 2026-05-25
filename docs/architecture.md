# Architecture Document

**Version:** 1.1.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — test suite 43/46 ✅; fixed email query, Dati bancari expansion, Elimina button |

---

## 1. Overview

This document describes the architecture of the Portale Volontario application, a Quasar (Vue 3) frontend that consumes a Directus backend. The application is a migration from an existing Appsmith application.

**Target domain:** `https://volontari.sostienilsostegno.com`
**Backend API:** `https://app.sostienilsostegno.com`

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────┐
│                    BROWSER                            │
│  ┌──────────────────────────────────────────────┐    │
│  │            Quasar SPA (Vue 3)                 │    │
│  │                                                │    │
│  │  ┌──────────┐  ┌────────┐  ┌──────────────┐  │    │
│  │  │  Router   │  │  Pinia │  │  Axios Layer │  │    │
│  │  │ (Vue-Rtr) │  │ Stores │  │ (interceptor)│  │    │
│  │  └────┬─────┘  └────────┘  └──────┬───────┘  │    │
│  │       │                            │          │    │
│  │  ┌────▼────────────────────────────▼───────┐  │    │
│  │  │         Pages & Components               │  │    │
│  │  │  Login | Famiglie | Migrazione          │  │    │
│  │  └─────────────────────────────────────────┘  │    │
│  └──────────────────────────┬───────────────────┘    │
└─────────────────────────────┼────────────────────────┘
                              │ HTTPS
                              ▼
┌──────────────────────────────────────────────────────┐
│              Directus Backend (API)                   │
│         https://app.sostienilsostegno.com              │
│                                                        │
│  /auth          → Authentication                       │
│  /auth/refresh  → Token refresh                       │
│  /auth/logout   → Logout                              │
│  /users/me      → Current user info                    │
│  /items/*       → CRUD on collections                  │
│  /files         → File upload/management               │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │              PostgreSQL Database              │     │
│  │  contatti | Famiglie | Famiglie_Contatti     │     │
│  │  Progetti | Giustificativi | email           │     │
│  │  directus_users | directus_files             │     │
│  └──────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Quasar v2 (Vue 3 Composition API) |
| Build tool | Vite |
| State management | Pinia |
| HTTP client | Axios |
| Router | Vue Router 4 |
| Styling | SCSS + Quasar CSS framework |
| Testing | Playwright (e2e) |
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
└── AppLayout.vue
    ├── AppHeader.vue (user info, logout, change password)
    └── <router-view>
        ├── LoginPage.vue
        │   ├── LoginForm (q-card)
        │   └── ForgotPasswordDialog (q-dialog)
        │
        ├── FamigliePage.vue
        │   ├── FamigliaInfoCard.vue
        │   │   └── InlineEditableField.vue (IBAN, Intestatario_CC)
        │   ├── ProgettoSelector.vue (q-select)
        │   └── GiustificativoList.vue
        │       ├── GiustificativoCard.vue (per item)
        │       │   └── InlineEditableField.vue (if draft)
        │       ├── GiustificativoForm.vue (add)
        │       └── FileUploader.vue
        │
        └── MigrazionePage.vue (admin utility)
```

---

## 6. Routing Strategy

```
/login          → LoginPage.vue        (public)
/famiglie       → FamigliePage.vue     (protected)
/migrazione     → MigrazionePage.vue   (protected, admin)
```

Route guard logic: see [auth-flow.md](./auth-flow.md)

---

## 7. Key Design Decisions

| Decision | Rationale |
|---|---|
| SPA (no SSR) | Simpler deployment, Directus handles auth via JWT |
| Pinia over Vuex | Official recommendation for Vue 3 |
| Inline editing over modals | Better UX, direct manipulation, less context switching |
| No backend layer | Directus REST API is sufficient |
| localStorage for JWT | SPA limitation; refresh token mitigates risk |
| Directus SDK not used | Custom Axios layer gives full control and simpler error handling |
