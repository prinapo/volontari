# Architecture Document

**Version:** 3.0.0
**Last Updated:** 2026-10-09
**Status:** Current

> Fonti di verità primarie: `AGENTS.md` (convenzioni e layer),
> `docs/usecases-catalog.md` (azioni di business → entry point),
> `docs/state-management.md` (store e macchine a stati).

---

## 1. Overview

**Portale Volontario** è una SPA Quasar (Vue 3) che consuma un backend Directus
11.x. Nata come migrazione da Appsmith, gestisce il ciclo di vita dei rimborsi
volontari: famiglie/progetti, giustificativi, verifica, rendicontazione,
pagamenti, riconciliazione del modulo libero, comunicazioni email e
amministrazione.

- **Target:** `https://volontari.sostienilsostegno.com`
- **Backend API:** `https://app.sostienilsostegno.com` (dev: `development…`)
- **Archivio estensioni Directus:** `directus-extensions/` (comunicazioni, fuori
  dal bundle SPA).

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        BROWSER                                │
│  Quasar SPA (Vue 3)                                           │
│  ┌────────┐  ┌────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Router │  │ Pinia  │  │ Axios    │  │  Pages/Components  │  │
│  │ (guard)│  │ Stores │  │ (refresh)│  │                    │  │
│  └───┬────┘  └───┬────┘  └────┬─────┘  └─────────┬─────────┘  │
│      │           │            │                  │            │
│      │      usecases/  ← orchestrazione + side-effect         │
│      │           │            │                  │            │
│      │      services/  ← sole chiamate Directus REST          │
│      └───────────┴────────────┴──────────────────┘            │
└────────────────────────────────┬─────────────────────────────┘
                                 │ HTTPS (Bearer/cookie JWT)
                                 ▼
┌──────────────────────────────────────────────────────────────┐
│  Directus 11.x  →  PostgreSQL                                 │
│  /auth /users/me /roles /items/* /files /assets/*             │
│  + estensioni endpoint (/communications, /sync/prod)          │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer            | Tecnologia                                           |
| ---------------- | ---------------------------------------------------- |
| Framework        | Quasar v2 (Vue 3, Composition API, `<script setup>`) |
| Build            | Vite (`@quasar/app-vite`)                            |
| State management | Pinia                                                |
| HTTP client      | Axios (istanza unica in `src/services/api.js`)       |
| Router           | Vue Router (history mode) + route guard              |
| State machine    | `@xstate/fsm` (solo validazione transizioni)         |
| Export Excel     | `exceljs` (+ `exportFile`/`writeSheet`)              |
| Grafici          | `echarts` / `vue-echarts`                            |
| Styling          | SCSS + Quasar                                        |
| Test             | Vitest (unit) + Playwright (E2E)                     |
| Qualità          | ESLint · Prettier · Stylelint · knip · Husky         |
| Backend          | Directus 11.x + PostgreSQL                           |

---

## 4. Layered architecture (regola fondamentale)

Ogni richiesta segue il flusso a strati definito in `AGENTS.md`:

```
Component/Page (presentazione)
      ↓
Store Pinia (adapter UI: stato + chiamata allo use case)
      ↓
src/usecases/ (validazioni/guardie → scrittura → side-effect obbligatori)
      ↓
src/services/ (una funzione = una chiamata Directus; nessuna logica)
      ↓
Directus REST API
```

Regole chiave:

- **Un'azione di business = un solo use case**, invocata da ogni entry point
  (volontario, manager, modulo libero, admin). Catalogo: `docs/usecases-catalog.md`.
- I componenti **non** chiamano mai `services/` direttamente (i residui noti sono
  elencati come debito tecnico, non come pattern da imitare).
- I **valori derivati** (stati riga, totali, erogabile) sono funzioni pure in
  `src/utils/`; gli **stati persistiti** si scrivono solo via
  `src/usecases/stato/transita.js`.
- Gli errori UI usano l'helper unico `apiErrorMessage` (`src/utils/errors.js`).

---

## 5. Page / route map

Route protette sotto `AppLayout` (`meta.requiresAuth`), con ruolo richiesto:

| Path               | Page                       | Ruolo                    |
| ------------------ | -------------------------- | ------------------------ |
| `/login`           | LoginPage                  | pubblico                 |
| `/reset-password`  | ResetPasswordPage          | pubblico                 |
| `/submit`          | SubmitPage (modulo libero) | pubblico (anche loggati) |
| `/famiglie`        | FamigliePage               | volontario               |
| `/dashboard`       | DashboardPage              | manager                  |
| `/verifica`        | VerificaPage               | manager                  |
| `/pagamenti`       | PagamentiPage              | manager                  |
| `/riconciliazione` | RiconciliazionePage        | manager                  |
| `/comunicazioni`   | ComunicazioniPage          | manager                  |
| `/gestione`        | GestionePage               | manager                  |
| `/impostazioni`    | ImpostazioniPage           | autenticato              |
| `/admin`           | AdminPage                  | admin                    |
| `/progetti/crea`   | CreaProgettoPage           | admin                    |

`/` e il fallback `*` reindirizzano a `/dashboard` (manager) o `/famiglie`
(volontario).

---

## 6. Store Pinia

Gli store sono **adapter UI**, non contengono logica di business duplicata:

`auth`, `famiglie`, `giustificativi`, `verifica`, `pagamenti`, `gestione`,
`admin`, `dashboard`, `comunicazioni`, `note`, `submit`, `error-log`.

Regole di stato asincrono (da `AGENTS.md`): `{ data/data_*, loading, error }`,
naming azioni `verb+entity`, nessun ritorno booleano. Dettaglio e macchine a
stati in `docs/state-management.md`.

---

## 7. Key design decisions

| Decisione                                                                    | Motivazione                                                     |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| SPA cache-buster su GET (`_t`)                                               | Evita caching delle risposte API                                |
| JWT + refresh su 401 (interceptor)                                           | Sessione trasparente; logica solo in `services/api.js`          |
| Layer `usecases/`                                                            | Una sola implementazione per azione, side-effect deterministici |
| Macchine a stati (`@xstate/fsm`)                                             | Unico scrittore degli stati persistiti; ESLint lo impone        |
| Export Excel centralizzato (`utils/verificaExport` + `utils/xlsxExport`)     | Nessuna logica export nei componenti                            |
| Helper condivisi (`errors`, `formatters`, `number`, `relations`, `password`) | Eliminare duplicazioni tra store/componenti                     |
| Estensioni Directus fuori dal frontend                                       | API key/segreti mai nel bundle                                  |

---

## 8. Nota storica

Le versioni precedenti di questo documento citavano una UI a 2 pagine
(famiglie/verifica) e 4 store. L'applicazione è cresciuta fino alla mappa
attuale; fare riferimento a codice e `AGENTS.md` per l'elenco aggiornato di
store, use case e componenti.
