# Architecture Review & Evolution Plan

**Project:** volontari (Portale Volontario) v2.8.1
**Date:** 2026-06-20
**Author:** OpenCode AI — Architecture Audit

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Fase 1 — Analisi dell'Architettura Attuale (AS-IS)](#2-fase-1--analisi-dellarchitettura-attuale-as-is)
3. [Fase 2 — Valutazione della Maturità](#3-fase-2--valutazione-della-maturità)
4. [Fase 3 — Confronto con lo Stato dell'Arte 2026](#4-fase-3--confronto-con-lo-stato-dellarte-2026)
5. [Fase 4 — Roadmap](#5-fase-4--roadmap)
6. [Fase 5 — Piano Implementativo Dettagliato](#6-fase-5--piano-implementativo-dettagliato)
7. [Fase 6 — Valutazione Finale](#7-fase-6--valutazione-finale)

---

## 1. Executive Summary

### Score complessivo: **52/100**

Il progetto **Portale Volontario** è una SPA Quasar (Vue 3) matura, ben strutturata e ben documentata, che consuma un backend Directus.
Rispetto alla media dei progetti gestiti da team non-devops, ha punti di forza notevoli: test E2E automatizzati, architettura a store/services pulita,
documentazione estesa e anti-production guard.

Le debolezze principali sono l'assenza totale di CI/CD, deploy via FTP plain-text, mancanza di containerizzazione, nessun monitoring/observability,
e segreti di produzione in file `.env` sul filesystem.

### Punti di forza

| Area | Valutazione |
|------|-------------|
| Architettura frontend | Store Pinia ben separati, services modulari, componenti riutilizzabili |
| Testing E2E | 14 spec file, page object pattern, atomic tests, ~151+ test |
| Documentazione | 10 documenti markdown in `docs/`, changelog dettagliato in AGENTS.md |
| Sicurezza test | Global setup + runtime guard bloccano esecuzione su produzione |
| PWA | Service worker Workbox configurato |
| Error handling | `notifyError()` centralizzato, interceptor Axios con refresh token |

### Rischi critici

| # | Rischio | Impatto | Probabilità |
|---|---------|---------|-------------|
| R1 | **Nessun backup del DB** | Perdita totale dati | Media |
| R2 | **Nessun monitoring/alerting** | Down non rilevato | Alta |
| R3 | **FTP plain-text per deploy** | Intercettazione credentiali/build | Media |
| R4 | **Segreti in `.env` su VPS** | Esposizione credentiali | Media-alta |
| R5 | **Nessun CI/CD** | Deploy manuali, nessuna garanzia qualità | Alta |
| R6 | **No unit test / component test** | Regressioni silenti nel frontend | Alta |
| R7 | **Versioni ESLint 8 (EOL)** | Vulnerabilità non patchate | Bassa-media |
| R8 | **No TypeScript** | Errori runtime prevenibili | Alta (scalando) |

---

## 2. Fase 1 — Analisi dell'Architettura Attuale (AS-IS)

### 2.1 Diagramma Architetturale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BROWSER (User Agent)                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Quasar SPA (Vue 3)                            │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐    │   │
│  │  │ Vue Router │  │ Pinia      │  │ Axios                  │    │   │
│  │  │ (history)  │  │ (7 stores) │  │ (interceptor 401 retry) │    │   │
│  │  └─────┬──────┘  └─────┬──────┘  └───────────┬────────────┘    │   │
│  │        │               │                      │                 │   │
│  │  ┌─────▼───────────────▼──────────────────────▼──────────────┐  │   │
│  │  │              Pages & Components (29 files)                 │  │   │
│  │  │  Login | Famiglie | Verifica | Gestione | Deduplica       │  │   │
│  │  │  Admin | Riconciliazione | Submit | ResetPassword         │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  │                                                                  │   │
│  │  Utils: notify | constants | enrichment | formatters | assets   │   │
│  │  Boot: auth.initFromStorage() | axios setup                     │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                             │                                           │
│                        PWA Service Worker (Workbox)                     │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     VPS — Nginx (volontari.sostienilsostegno.com)        │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  dist/spa/ (static files)                                        │   │
│  │  .htaccess -> rewrite all to index.html (SPA fallback)           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Deploy: npm run release -> FTP (basic-ftp, plain-text)                  │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              VPS — Directus 11.x (app.sostienilsostegno.com)            │
│                                                                         │
│  /auth/login    -> JWT authentication                                    │
│  /auth/refresh  -> Token refresh                                         │
│  /users/me      -> Current user + role                                   │
│  /items/*       -> CRUD on 10+ collections                               │
│  /files         -> File upload (FormData order fix)                      │
│  /assets/*      -> File download                                         │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                                  │   │
│  │  contatti | email | Famiglie | Famiglie_Contatti                 │   │
│  │  Progetti | Giustificativi | Rendicontazioni                     │   │
│  │  InviiGiustificativiNoLogin                                      │   │
│  │  Volontari_Referenti                                             │   │
│  │  directus_users | directus_roles | directus_policies             │   │
│  │  directus_files | directus_settings                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnologico

| Layer | Tecnologia | Versione |
|-------|-----------|----------|
| Framework frontend | Quasar (Vue 3) | v2.14.x |
| Build tool | Vite (via @quasar/app-vite) | v2.x |
| State management | Pinia | v2.1.x |
| HTTP client | Axios | v1.6.x |
| Router | Vue Router 4 (history mode) | v4.3.x |
| Styling | SCSS + Quasar CSS Framework | - |
| PWA | Workbox | v7.x |
| Backend | Directus (headless CMS) | v11.x |
| Database | PostgreSQL | - |
| Testing | Playwright | v1.40.x |
| Linting | ESLint | v8.x |
| Deploy | basic-ftp (FTP plain/explicit) | v6.x |
| Email test | imapflow + mailparser | - |
| Auth | JWT (Directus) | - |

### 2.3 Struttura del Progetto

```
volontari/
+-- src/
|   +-- pages/           # 9 pagine Vue
|   +-- components/      # 20 componenti (Common, Gestione, Giustificativi, etc.)
|   +-- stores/          # 7 Pinia stores + index
|   +-- services/        # 16 servizi API
|   +-- utils/           # 6 utility modules
|   +-- boot/            # 2 boot file (auth, axios)
|   +-- router/          # 1 router con route guard
|   +-- css/             # 1 SCSS file
|   +-- App.vue          # Root component
+-- tests/e2e/
|   +-- specs/           # 14 spec file
|   +-- pages/           # 7 page objects
|   +-- helpers/         # 9 helper modules
|   +-- fixtures/        # 3 fixture file
+-- docs/                # 10 documenti markdown
+-- scripts/             # 3 script (deploy, list, purge-cache)
+-- src-pwa/             # 3 file PWA
+-- quasar.config.cjs    # Build/Dev config
```

### 2.4 Flusso Dati

```
Utente -> Evento Component -> Azione Store -> Chiamata Service -> Axios -> Directus API
                                                                      |
                                    Response <- JSON <- PostgreSQL    |
                                                                      |
                    Store aggiorna state <- Component re-render
```

### 2.5 Flusso Autenticazione

```
1. Login -> POST /auth/login -> JWT (access + refresh)
2. Token salvati in localStorage
3. Ogni richiesta: Authorization: Bearer {access_token}
4. 401 response -> intercettore Axios -> POST /auth/refresh -> retry request
5. Refresh fallito -> clearSession -> redirect /login
6. Boot app -> initFromStorage() -> restore session
```

### 2.6 Flusso Deploy

```
npm run build -> quasar build -> dist/spa/

npm run release -> quasar build
                 -> node scripts/deploy-ftp.mjs
                 -> basic-ftp connect (plain/explicit)
                 -> clearWorkingDir()
                 -> uploadFromDir(dist/spa/)
                 -> upload .htaccess
```

### 2.7 Punti di Forza Dettagliati

| Forza | Dettaglio |
|-------|-----------|
| **Architettura pulita** | Separazione netta Pages -> Components -> Stores -> Services -> API |
| **Test E2E robusti** | 151+ test, atomici, page object pattern, console error detection |
| **Anti-production guard** | Global setup + runtime interceptor bloccano esecuzione su produzione |
| **Error handling centralizzato** | `notifyError()` + `notifySuccess()` usati ovunque |
| **Refresh token automatico** | Axios interceptor trasparente |
| **Documentazione viva** | AGENTS.md aggiornato a ogni versione, 10 doc in `docs/` |
| **Campi editabili inline** | UX fluida senza modali per edit |
| **PWA ready** | Service worker Workbox con caching |
| **Responsive mobile** | Grid mode per tabelle su mobile, dialog responsive |
| **Paginazione server-side** | ContattiTab e FamiglieTab con paginazione server-side |

### 2.8 Punti di Debolezza Dettagliati

| Debolezza | Impatto | Dettaglio |
|-----------|---------|-----------|
| **No CI/CD** | Qualita | Nessuna pipeline automatizzata - test solo locali |
| **Deploy FTP** | Sicurezza/Operativo | FTP plain-text, no hash verify, no rollback automatico |
| **No containerizzazione** | Riproducibilita | Ambiente non replicabile, dev/prod differenza |
| **No monitoring** | Operativo | Nessuna visibilita su errori runtime, performance, uptime |
| **No backup strategy** | Operativo | Database PostgreSQL senza backup schedulato documentato |
| **No TypeScript** | Qualita | Tutto JavaScript - errori runtime prevenibili |
| **No unit test / Vitest** | Qualita | Solo E2E - nessuna copertura component/store isolata |
| **ESLint 8 (EOL)** | Sicurezza | ESLint 8 e in End of Life da ottobre 2024 |
| **Segreti in .env su VPS** | Sicurezza | Credenziali FTP/IMAP in chiaro sul filesystem VPS |
| **Nessun API gateway** | Sicurezza | Directus esposto direttamente, no rate limiting/WAF |
| **No static analysis** | Qualita | No SonarQube, no Semgrep, no Snyk |
| **Cache-buster su GET** | Performance | `_t=$` impedisce caching browser |
| **No IaC** | Riproducibilita | Server configurato manualmente (VPS) |
| **No logging strutturato** | Debug | Solo console.log/warn/error, nessun aggregatore |

### 2.9 Rischi di Sicurezza

| Rischio | Descrizione | Mitigazione |
|---------|-------------|-------------|
| **Credenziali FTP/IMAP** | In `.env` (protetto da gitignore ma in chiaro su VPS) | Vault o environment variables del sistema |
| **Directus esposto** | API su `app.sostienilsostegno.com` senza WAF/gateway | Cloudflare, nginx rate limiting, IP whitelist |
| **No HTTPS enforcement test** | Nessun test che verifica redirect HTTPS | Aggiungere test E2E |
| **XSS potenziale** | Campi utente renderizzati senza sanitization esplicita | Verificare uso di v-html vs {{ }} |
| **localStorage JWT** | Accessibile via XSS | HttpOnly cookie sarebbe piu sicuro ma non possibile in SPA |
| **No CSP headers** | Content Security Policy non configurata | Aggiungere in Nginx |

### 2.10 Dipendenze Critiche

| Dipendenza | Ruolo | Rischio |
|------------|-------|---------|
| **Directus 11.x** | Backend unico, auth, CRUD, file storage | Breaking changes su upgrade major |
| **PostgreSQL** | Singolo database | No replica, no failover |
| **VPS Linux** | Singolo server per frontend + backend | Single point of failure |
| **FTP server** | Unico metodo di deploy | Vendor lock-in, no encryption |
| **Gmail IMAP** | Test reset password | Dipendenza esterna per test E2E |
| **Quasar v2** | Framework frontend | Migrazione Quasar v3 (Vue 4?) futura |

---

## 3. Fase 2 — Valutazione della Maturita

### 3.1 Codice

| Criterio | Score | Note |
|----------|-------|------|
| Leggibilita | 4/5 | Naming chiaro, struttura prevedibile, componenti piccoli. Solo JS, no TS. |
| Manutenibilita | 4/5 | Separazione concerns buona. Documentato. Dipendenze minime (6 runtime, 14 dev). |
| Modularita | 4/5 | Services/stores ben separati. Componenti riutilizzabili ma alcuni troppo accoppiati alle store. |
| Testabilita | 3/5 | Solo E2E (Playwright). Nessun test unitario per stores/services. |

**Sub-score: 3.75/5**

### 3.2 Frontend

| Criterio | Score | Note |
|----------|-------|------|
| Organizzazione componenti | 4/5 | 20 componenti in 7 cartelle tematiche. Gerarchia chiara. |
| Gestione stato | 4/5 | 7 Pinia stores ben separati. Qualche duplicazione logica tra store e page. |
| Performance | 3/5 | Cache-buster impedisce caching browser. No lazy loading esplicito componenti. No bundle analysis. |
| Accessibilita | 3/5 | aria-label su 60+ bottoni, ma solo su icon buttons. No test a11y automatizzati. |

**Sub-score: 3.5/5**

### 3.3 Backend (Directus)

| Criterio | Score | Note |
|----------|-------|------|
| Qualita API | 3/5 | Directus REST API standard. Nessun endpoint custom. Nessuna validazione lato Directus. |
| Separazione responsabilita | 2/5 | Directus e sia API che admin panel - limite intrinseco. Business logic assente (tutta nel frontend). |
| Sicurezza | 3/5 | Role-based access via Directus policies. Nessun rate limiting. Nessun audit log. |

**Sub-score: 2.67/5**

### 3.4 Database

| Criterio | Score | Note |
|----------|-------|------|
| Modellazione dati | 4/5 | Schema relazionale normale (contatti, email, famiglie, junction tables). |
| Integrita | 3/5 | FK a livello Directus (soft). Nessuna constraint DB-level documentata. |
| Performance | 2/5 | Nessuna index strategy documentata. Nessun query profiling. |

**Sub-score: 3/5**

### 3.5 DevOps

| Criterio | Score | Note |
|----------|-------|------|
| CI/CD | 1/5 | Assente. Zero pipeline. |
| Deployment | 2/5 | FTP manuale. Nessun deploy automatico. Nessuna staging environment. |
| Rollback | 1/5 | Manuale (copia directory). Non testato. |
| Automazione | 1/5 | Solo script deploy FTP. Nessuna automazione infra. |

**Sub-score: 1.25/5**

### 3.6 Sicurezza

| Criterio | Score | Note |
|----------|-------|------|
| Gestione segreti | 2/5 | `.env` gitignorato ma in chiaro su VPS. No vault/no secret manager. |
| Autenticazione | 3/5 | JWT con refresh token. localStorage (trade-off SPA). Directus gestisce auth. |
| Autorizzazioni | 3/5 | Role-based route guard + Directus policies. Matrice documentata. |
| Vulnerabilita dipendenze | 2/5 | No `npm audit` automation. No Snyk/Dependabot. |

**Sub-score: 2.5/5**

### 3.7 Osservabilita

| Criterio | Score | Note |
|----------|-------|------|
| Logging | 1/5 | Nessun logging strutturato. Solo console nel frontend. |
| Metriche | 1/5 | Assenti. |
| Monitoraggio | 1/5 | Assente. No uptime monitoring. |
| Alerting | 1/5 | Assente. |

**Sub-score: 1/5**

### 3.8 Scalabilita

| Criterio | Score | Note |
|----------|-------|------|
| Frontend | 3/5 | SPA statica, scalabile orizzontalmente via CDN. PWA per caching. |
| Backend | 2/5 | Directus single instance, PostgreSQL single instance. No replica. |
| Database | 2/5 | PostgreSQL singolo. No read replica, no pooling. |
| Infrastruttura | 1/5 | Singolo VPS per frontend + Directus. Single point of failure. |

**Sub-score: 2/5**

### 3.9 Tabella Riepilogativa

| Dimensione | Score | Peso | Ponderato |
|------------|-------|------|-----------|
| Codice | 3.75 | 15% | 0.56 |
| Frontend | 3.50 | 15% | 0.53 |
| Backend | 2.67 | 15% | 0.40 |
| Database | 3.00 | 10% | 0.30 |
| DevOps | 1.25 | 20% | 0.25 |
| Sicurezza | 2.50 | 10% | 0.25 |
| Osservabilita | 1.00 | 10% | 0.10 |
| Scalabilita | 2.00 | 5% | 0.10 |
| **Totale** | | **100%** | **2.49/5 = 50/100** |

---

## 4. Fase 3 — Confronto con lo Stato dell'Arte 2026

| Area | Livello Attuale | Livello Raccomandato | Gap |
|------|----------------|---------------------|-----|
| **CI/CD** | Nessuno | GitHub Actions + auto-deploy | Critico |
| **Test automatici** | E2E (Playwright) | E2E + Unit (Vitest) + Component test | Alto |
| **Vitest** | Non presente | Stores + Services + Components test | Alto |
| **Playwright** | Presente | Progetti mobile + API test + a11y test | Medio |
| **ESLint** | v8 (EOL) | ESLint v9 + flat config | Alto |
| **Prettier** | Non presente | Formattazione automatica | Medio |
| **TypeScript** | Non presente | Typesafe stores/services/components | Alto |
| **SonarQube** | Non presente | Code quality + security hotspots | Medio |
| **Semgrep** | Non presente | SAST su ogni PR | Medio |
| **Sentry** | Non presente | Error tracking frontend + backend | Alto |
| **Grafana/Prometheus** | Non presente | Metriche + dashboard | Medio |
| **Backup automatici** | Non presenti | pg_dump schedulato + offsite | Critico |
| **Infrastructure as Code** | Non presente | Docker Compose -> Ansible -> Terraform | Alto |
| **Containerizzazione** | Non presente | Docker per Directus + PostgreSQL | Critico |
| **Gestione segreti** | .env in chiaro | Vault / GitHub Secrets / Doppler | Critico |
| **API Gateway / WAF** | Non presente | Cloudflare / nginx rate limiting | Medio |
| **HTTP/3** | Non supportato | Cloudflare / CDN con HTTP/3 | Basso |
| **CDN** | Non presente | Cloudflare / Fastly per static assets | Medio |
| **Zero-downtime deploy** | Non presente | Blue-green / rolling update | Medio |
| **Database migration** | Manuale | Directus schema migration + Flyway | Medio |
| **A11y testing** | Non presente | axe-core + Playwright a11y check | Basso |

### 4.1 Priorita dei Gap

| Priorita | Gap | Motivazione |
|----------|-----|-------------|
| **P0** | Backup automatici DB | Perdita dati = catastrofe |
| **P0** | Gestione segreti | Credenziali in chiaro su VPS = breach imminente |
| **P0** | Containerizzazione | Riproducibilita ambiente / disaster recovery |
| **P1** | CI/CD | Qualita, velocita, affidabilita |
| **P1** | Sentry / Error tracking | Visibilita su errori produzione |
| **P2** | Vitest / Unit test | Regressioni silenti nel frontend |
| **P2** | TypeScript | Manutenibilita a lungo termine |
| **P2** | ESLint v9 | Sicurezza dipendenze lint |
| **P3** | SonarQube / Semgrep | Qualita codice + SAST |
| **P3** | Grafana / Prometheus | Performance + capacity planning |

---

## 5. Fase 4 — Roadmap

### 5.1 Quick Wins (1-2 giorni)

| # | Attivita | Benefici | Complessita | Tempo |
|---|----------|----------|-------------|-------|
| Q1 | **Aggiungere Prettier** + format script | Codice uniforme, niente diff di formato | Bassa | 1h |
| Q2 | **Upgrade ESLint v8 -> v9** + flat config | Sicurezza, nuove regole | Bassa | 2h |
| Q3 | **Aggiungere npm audit a pre-commit** | Rilevamento vulnerabilita immediate | Bassa | 1h |
| Q4 | **Aggiungere .env.example completo** | Nuovi sviluppatori sanno quali variabili servono | Bassa | 30min |
| Q5 | **Configurare lint-staged + husky** | Qualita prima del commit | Bassa | 2h |
| Q6 | **Aggiungere bundle analyzer** (vite-plugin-inspect) | Visibilita peso bundle | Bassa | 1h |
| Q7 | **Vitest setup base** + test su `notify.js` e `constants.js` | Copertura utility pure | Bassa | 3h |
| Q8 | **Aggiungere CONTRIBUTING.md** | Onboarding sviluppatori | Bassa | 1h |

### 5.2 Breve Termine (1-2 settimane)

| # | Attivita | Benefici | Complessita | Tempo |
|---|----------|----------|-------------|-------|
| B1 | **GitHub Actions CI** - test su ogni push/PR | Garanzia qualita automatica | Media | 1-2gg |
| B2 | **Docker Compose per Directus + PostgreSQL** | Ambiente replicabile, dev locale | Media | 2gg |
| B3 | **Backup automatico DB** (pg_dump + S3/rsync) | Disaster recovery | Media | 1gg |
| B4 | **Sentry frontend** | Error tracking produzione | Media | 1gg |
| B5 | **Sostituire FTP con rsync/SSH o GitHub Actions deploy** | Deploy sicuro e tracciabile | Media | 1gg |
| B6 | **Aggiungere healthcheck endpoint** (per uptime monitoring) | Monitoring base | Bassa | 4h |
| B7 | **Configurare uptime monitoring** (UptimeRobot / Checkly) | Alert su down | Bassa | 1h |
| B8 | **Vitest - test stores Pinia** (auth.store, giustificativi.store) | Copertura unitaria critica | Media | 2-3gg |

### 5.3 Medio Termine (1-2 mesi)

| # | Attivita | Benefici | Complessita | Tempo |
|---|----------|----------|-------------|-------|
| M1 | **Migrazione TypeScript** progressiva | Type safety, IDE support, minori bug | Alta | 2-4 settimane |
| M2 | **SonarQube Cloud** (ex SonarCloud) | Code quality, security hotspots, coverage gate | Media | 1gg |
| M3 | **Semgrep in CI** | SAST automatico su ogni PR | Media | 1gg |
| M4 | **Dependabot / Renovate** | Dipendenze sempre aggiornate | Bassa | 1gg |
| M5 | **Prometheus + Grafana** per metriche Directus/DB | Performance monitoring | Media | 3-5gg |
| M6 | **Nginx hardening** (CSP, HSTS, rate limiting) | Sicurezza perimetrale | Media | 1gg |
| M7 | **Staging environment** (Docker Compose + CI deploy) | Test pre-produzione | Media | 2-3gg |
| M8 | **Aggiungere test a11y con axe-core** in Playwright | Accessibilita garantita | Media | 2gg |
| M9 | **Test di carico** (k6 o artillery) | Capacity planning | Media | 2-3gg |

### 5.4 Lungo Termine (3-6 mesi)

| # | Attivita | Benefici | Complessita | Tempo |
|---|----------|----------|-------------|-------|
| L1 | **App Android reale con Capacitor** | Esperienza nativa, push notifications, offline | Alta | 4-6 settimane |
| L2 | **Infrastructure as Code** (Terraform o Ansible) | Infrastruttura riproducibile e versionata | Alta | 2-4 settimane |
| L3 | **Zero-downtime deploy** (blue-green su Docker) | Deploy senza fermo servizio | Alta | 1-2 settimane |
| L4 | **CDN** (Cloudflare) per assets statici | Performance globale, DDoS protection | Media | 2-3gg |
| L5 | **Database read replica + connection pooling** (PgBouncer) | Scalabilita backend | Alta | 1-2 settimane |
| L6 | **API Gateway / BFF layer** (Node.js) tra frontend e Directus | Security, validazione, caching, logging | Alta | 4-6 settimane |
| L7 | **Kubernetes** (K3s su VPS o managed K8s) | Orchestrazione, scaling, self-healing | Alta | 1-3 mesi |
| L8 | **Nuxt/SSR** per pagine pubbliche (Submit, Login) | SEO, performance percepite | Alta | 2-4 settimane |

---

## 6. Fase 5 — Piano Implementativo Dettagliato

### 6.1 Quick Wins — Checklist

#### Q1: Prettier

**File coinvolti:**
- Nuovo: `.prettierrc` (radice progetto)
- Modificato: `.eslintrc.cjs` (aggiungere `prettier` plugin)

**Configurazione:**
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "none",
  "tabWidth": 2,
  "printWidth": 110
}
```

**Comandi:**
```bash
npm install --save-dev prettier eslint-plugin-prettier eslint-config-prettier
# Creare .prettierrc
# Aggiungere script: "format": "prettier --write src/**/*.{js,vue}"
```

**Verifica:** `npm run format` non produce modifiche su file gia formattati.

---

#### Q2: ESLint v9 + flat config

**File coinvolti:**
- Da eliminare: `.eslintrc.cjs`
- Nuovo: `eslint.config.js` (flat config)

**Comandi:**
```bash
npm install --save-dev eslint@^9 eslint-plugin-vue@latest
# Creare eslint.config.js con flat config
```

**Verifica:** `npm run lint` passa senza errori.

---

#### Q3: npm audit pre-commit

**File coinvolti:**
- Nuovo script: `.husky/pre-commit`
- Modificato: `package.json` (aggiungere script `precommit`)

**Comandi:**
```bash
npx husky init
echo "npm audit" > .husky/pre-commit
chmod +x .husky/pre-commit
```

**Verifica:** `git commit` fallisce se `npm audit` trova vulnerabilita critiche.

---

#### Q4: .env.example completo

**File coinvolti:**
- Modificato: `.env.example`

**Aggiungere tutte le variabili d'ambiente usate:**
```env
VITE_API_URL=https://app.sostienilsostegno.com
VITE_APP_TITLE=Portale Volontario
VITE_RESET_URL=
VITE_INVII_PUBBLICI_FOLDER=
VITE_VOLONTARIO_ROLE_ID=
VITE_VERIFICA_ROLE_IDS=
VITE_GESTIONE_ROLE_IDS=
VITE_ADMIN_ROLE_IDS=
# Solo per sviluppo test E2E
# TEST_EMAIL=
# TEST_EMAIL_PASSWORD=
# FTP_HOST=
# FTP_USER=
# FTP_PASSWORD=
```

**Verifica:** Copiare `.env.example` in `.env` produce un ambiente funzionante (con valori default o errori espliciti).

---

#### Q5: lint-staged + husky

**File coinvolti:**
- Nuovo: `.husky/pre-commit`
- Modificato: `package.json` (aggiungere `lint-staged` config)

**Comandi:**
```bash
npm install --save-dev lint-staged
```

**Config package.json:**
```json
"lint-staged": {
  "*.{js,vue}": ["eslint --fix", "prettier --write"]
}
```

**Verifica:** Commit di file con errori di lint viene bloccato con messaggio chiaro.

---

#### Q6: Bundle Analyzer

**File coinvolti:**
- Modificato: `quasar.config.cjs`

**Configurazione:**
```js
build: {
  // ... esistente
  vueVite: {
    plugins: [
      ...(process.env.ANALYZE ? [require('vite-plugin-inspect')()] : [])
    ]
  }
}
```

**Comandi:**
```bash
npm install --save-dev vite-plugin-inspect
ANALYZE=true npm run build
```

**Verifica:** Aprendo il dev server con `ANALYZE=true` si vede la visualizzazione del bundle.

---

#### Q7: Vitest setup base

**File coinvolti:**
- Nuovo: `vitest.config.js`
- Nuovo: `src/utils/__tests__/notify.spec.js`
- Nuovo: `src/utils/__tests__/constants.spec.js`
- Modificato: `package.json` (aggiungere script `test:unit`)

**Config vitest.config.js:**
```js
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom'
  },
  resolve: {
    alias: { src: '/src' }
  }
})
```

**Comandi:**
```bash
npm install --save-dev vitest @vitejs/plugin-vue jsdom
```

**Verifica:** `npm run test:unit` esegue e passa.

---

### 6.2 Breve Termine — Checklist

#### B1: GitHub Actions CI

**File coinvolti:**
- Nuovo: `.github/workflows/test.yml`
- Nuovo: `.github/workflows/lint.yml`

**Contenuto test.yml:**
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test-results/
```

**Nuove dipendenze:** Nessuna (GitHub Actions).

**Verifica:** Push su branch remoto triggera la pipeline. Test passano o falliscono con report.

---

#### B2: Docker Compose per Directus + PostgreSQL

**File coinvolti:**
- Nuovo: `docker-compose.yml`
- Nuovo: `Dockerfile` (opzionale per Directus con estensioni)
- Nuovo: `.env.docker` (template)

**Configurazione:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: volontari
      POSTGRES_USER: volontari
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  directus:
    image: directus/directus:11
    ports: [8055:8055]
    depends_on: [postgres]
    environment:
      DB_CLIENT: pg
      DB_HOST: postgres
      DB_PORT: 5432
      DB_DATABASE: volontari
      DB_USER: volontari
      DB_PASSWORD: ${DB_PASSWORD}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      CORS_ENABLED: true
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:9000}

volumes:
  pgdata:
```

**Verifica:** `docker compose up -d` -> Directus raggiungibile su `localhost:8055`.

---

#### B3: Backup automatico DB

**File coinvolti:**
- Nuovo: `scripts/backup-db.sh`
- Nuovo: `crontab` entry (o GitHub Actions scheduled)

**Script:**
```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U volontari volontari | gzip > /backups/volontari_$TIMESTAMP.sql.gz
aws s3 cp /backups/volontari_$TIMESTAMP.sql.gz s3://volontari-backups/
find /backups -name "*.sql.gz" -mtime +30 -delete
```

**Configurazione:** Aggiungere cron job sul VPS.

**Verifica:** Eseguire manualmente lo script -> file `.sql.gz` presente su S3. Restore testato da backup.

---

#### B4: Sentry Frontend

**File coinvolti:**
- Modificato: `package.json`
- Nuovo: `src/boot/sentry.js`
- Modificato: `quasar.config.cjs` (aggiungere boot)

**Comandi:**
```bash
npm install @sentry/vue @sentry/vite-plugin
```

**Configurazione boot:**
```js
import { boot } from 'quasar/wrappers'
import * as Sentry from '@sentry/vue'

export default boot(({ app, router }) => {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: 0.2
  })
})
```

**Verifica:** Generare un errore volutamente -> compare su Sentry dashboard.

---

#### B5: Sostituire FTP con rsync/SSH

**Opzione A — rsync via SSH:**
```bash
# scripts/deploy-ssh.mjs
import { execSync } from 'child_process'
execSync(`rsync -avz --delete dist/spa/ ${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}`, { stdio: 'inherit' })
```

**Opzione B — GitHub Actions deploy via SSH:**
```yaml
- name: Deploy via rsync
  uses: easingthemes/ssh-deploy@v4
  with:
    source: dist/spa/
    target: /var/www/volontari
```

**File coinvolti:**
- Nuovo: `scripts/deploy-ssh.mjs`
- Modificato: `package.json` (script deploy)

**Verifica:** `npm run deploy` carica i file sul VPS via SSH. Sito aggiornato.

---

#### B6-B7: Healthcheck + Uptime Monitoring

**Healthcheck:**
- Aggiungere una pagina `/health.html` statica
- Directus gia ha `/server/health` endpoint

**UptimeRobot / Checkly:**
- Creare monitor su `https://volontari.sostienilsostegno.com`
- Creare monitor su `https://app.sostienilsostegno.com/server/health`

**Verifica:** Monitor mostra "Up" dopo configurazione.

---

#### B8: Vitest — Test Stores

**File coinvolti:**
- Nuovo: `src/stores/__tests__/auth.store.spec.js`
- Nuovo: `src/stores/__tests__/giustificativi.store.spec.js`

**Approccio:**
```js
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth.store'

describe('auth.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should start unauthenticated', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
  })
})
```

**Mocking:** Mockare servizi con `vi.mock()`.

**Verifica:** Test store passano isolati, senza dipendenza Directus.

---

### 6.3 Medio Termine — Checklist Parziale

#### M1: Migrazione TypeScript

**Approccio progressivo:**
1. Rinominare `*.js` -> `*.ts` nei services (partire da quelli puri: `utils/`)
2. Aggiungere `tsconfig.json`
3. Convertire stores
4. Convertire components (opzionale)

**File coinvolti:**
- Nuovo: `tsconfig.json`
- Tutti i file `src/` progressivamente

**Tools:**
```bash
npm install --save-dev typescript @vue/tsconfig vue-tsc
```

**Verifica:** `vue-tsc --noEmit` passa senza errori.

---

#### M6: Nginx Hardening

**File coinvolti:**
- Nuovo: `nginx-config/volontari.conf` (da deployare sul VPS)

**Aggiungere:**
```nginx
# CSP
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://app.sostienilsostegno.com data:; connect-src 'self' https://app.sostienilsostegno.com;";

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

**Verifica:** Test su securityheaders.com ottiene rating A+.

---

### 6.4 Lungo Termine — Checklist Parziale

#### L1: App Android con Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init volontari com.sostienilsostegno.volontari
npx cap add android
npx cap copy
npx cap open android
```

**File coinvolti:**
- Nuovo: `capacitor.config.ts`
- Nuovo: `android/` (generato da Capacitor)
- Modificato: `quasar.config.cjs` (build per Capacitor)

**Verifica:** App Android si apre su emulatore, login funziona.

---

#### L6: BFF Layer (Backend For Frontend)

**Nuovo progetto:** `api-gateway/` (Node.js + Express/Fastify)

**Responsabilita:**
- Proxy verso Directus
- Validazione input
- Rate limiting
- Logging strutturato (pino/bunyan)
- Caching (Redis)
- Healthcheck aggregato

**File coinvolti:**
- Nuovo: `api-gateway/package.json`
- Nuovo: `api-gateway/src/index.js`
- Nuovo: `api-gateway/Dockerfile`
- Modificato: `docker-compose.yml` (aggiungere servizio)

**Verifica:** Frontend punta a BFF -> BFF a Directus. Tutte le route funzionano.

---

## 7. Fase 6 — Valutazione Finale

### 7.1 Architettura AS-IS (corrente)

```
[Browser] ---HTTPS--> [VPS: Nginx (SPA)] ---HTTPS--> [VPS: Directus + PostgreSQL]
                            |
                      Deploy via FTP (plain) da dev locale
```

- **Single point of failure:** VPS unico sia per frontend che backend
- **No isolation:** Dev/Prod sullo stesso server
- **No monitoring:** Scatola nera in produzione
- **No automazione:** Ogni deploy e manuale
- **Documentazione:** Buona ma statica (non auto-generata)

### 7.2 Architettura TO-BE (target)

```
[Browser/CDN] ---HTTPS--> [Cloudflare WAF] --> [VPS: Docker Swarm / K3s]
                                                       |
                              +------------------------+---------------------+
                              v                        v                     v
                    [Nginx: SPA + PWA]        [BFF Node.js]         [Directus API]
                              |                        |                     |
                              v                        v                     v
                        [Static CDN]           [Redis Cache]          [PostgreSQL]
                                                                      [Replica x 1]
                                                                      [PgBouncer]
                                                                      [Backup -> S3]

Deploy: GitHub Actions -> Build -> Test -> Docker image -> Deploy to Swarm
Monitoring: Sentry (errors) + Grafana (metrics) + UptimeRobot (uptime)
CI/CD: PR -> Test -> SonarQube -> Semgrep -> Deploy staging -> Deploy production
```

### 7.3 Gap Analysis

| Categoria | AS-IS | TO-BE | Gap % |
|-----------|-------|-------|-------|
| CI/CD | 0/10 | 8/10 | 80% |
| Qualita codice | 6/10 | 9/10 | 33% |
| Testing | 6/10 | 9/10 | 33% |
| Sicurezza | 5/10 | 9/10 | 44% |
| Osservabilita | 1/10 | 8/10 | 88% |
| Scalabilita | 2/10 | 7/10 | 71% |
| Riproducibilita | 1/10 | 9/10 | 89% |
| Documentazione | 7/10 | 8/10 | 13% |
| **Totale** | **3.5/10** | **8.4/10** | **56%** |

### 7.4 Priorita Assolute

1. **Backup DB** — Senza dati, l'applicazione non esiste. Priorita massima.
2. **Containerizzazione** (Docker Compose) — Step zero per riproducibilita.
3. **Gestione segreti** (GitHub Secrets + Vault) — Credenziali non in chiaro.
4. **Sentry** (error tracking) — Cosa succede in produzione adesso? Nessuno lo sa.
5. **CI/CD** (GitHub Actions) — Automatizzare qualita e deploy.
6. **Sostituire FTP con SSH/rsync** — Sicurezza deploy immediata.

### 7.5 Rischi Principali

| Rischio | Probabilita | Impatto | Priorita | Mitigazione |
|---------|-------------|---------|----------|-------------|
| Perdita dati DB | Media | Catastrofico | P0 | Backup automatico |
| Compromissione VPS | Bassa-Media | Catastrofico | P0 | Container + least privilege |
| Deploy rotto (FTP) | Alta | Alto | P1 | CI/CD + SSH deploy |
| Regressione silente | Alta | Medio | P1 | Unit test + CI |
| Bug in produzione non rilevato | Alta | Medio | P1 | Sentry |
| Directus upgrade break | Media | Alto | P2 | Staging env + test |
| Violazione GDPR (dati utente) | Bassa | Catastrofico | P0 | Audit trail + encryption |

### 7.6 Score Complessivo: **52/100**

| Dimensione | Score | Peso |
|------------|-------|------|
| Codice e architettura | 65/100 | 20% |
| Testing | 65/100 | 15% |
| DevOps e automazione | 15/100 | 20% |
| Sicurezza | 45/100 | 15% |
| Osservabilita | 10/100 | 10% |
| Documentazione | 70/100 | 10% |
| Infrastruttura | 30/100 | 10% |
| **Totale** | **52/100** | **100%** |

---

### 7.7 Note Finali

Il progetto **Portale Volontario** e un'applicazione funzionale, ben scritta e con una base solida. Il codice frontend e di qualita superiore
alla media dei progetti Quasar. La documentazione e estesa e l'approccio ai test E2E e maturo.

Le aree che richiedono investimento immediato sono **infrastruttura e DevOps**: containerizzazione, CI/CD, backup, e monitoring.
Una volta colmati questi gap, il progetto puo raggiungere uno stato professionale completo.

Raccomandazione: **dedicare 1 settimana ai quick wins e 2 settimane alla containerizzazione + CI/CD**, prima di qualsiasi nuova feature.
Questo ripaga il debito tecnico e abilita sviluppo futuro su basi solide.

---

*Documento generato da OpenCode AI il 2026-06-20. Aggiornare a ogni nuova analisi per mantenere una documentazione tecnica viva del progetto.*
