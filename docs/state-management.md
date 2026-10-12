# State Management Document

**Version:** 3.0.0
**Last Updated:** 2026-10-09
**Status:** Current (per le macchine a stati); le sezioni per-store "storiche" restano indicative

> ⚠️ **Nota.** Lo stato asincrono canonico è `{ data/data_*, loading, error }`
> (vedi `AGENTS.md`). Lo strato **macchine a stati** (§8) è il riferimento
> autorevole. Le descrizioni puntuali dei primi store sono state scritte a inizio
> progetto e possono non riflettere ogni campo attuale: in caso di dubbio fare
> riferimento al codice. `src/usecases/` è la sede delle azioni di business.

---

## 1. Overview

Lo stato globale usa **Pinia**. Gli store attuali sono:

| Store            | Responsabilità                                               |
| ---------------- | ------------------------------------------------------------ |
| `auth`           | Sessione (login/logout/refresh, `canManager`, `canAdmin`)    |
| `famiglie`       | Famiglia selezionata, genitori/volontari, erogazioni         |
| `giustificativi` | Giustificativi del progetto selezionato (flusso volontario)  |
| `verifica`       | Righe Verifica/Rendicontazione, submission e riconciliazione |
| `pagamenti`      | Proposte, pagamenti, batch e liste                           |
| `gestione`       | Famiglie/contatti (CRUD), referenti, utenti                  |
| `admin`          | Utenti/ruoli, consistenza, impersonation                     |
| `dashboard`      | Aggregati KPI                                                |
| `comunicazioni`  | Wizard email 1-a-1 e storico                                 |
| `note`           | Note progetto (append-only)                                  |
| `submit`         | Modulo libero (submission)                                   |
| `error-log`      | Log errori applicativi                                       |

---

## 2. Auth Store (`src/stores/auth.store.js`)

### State Shape

```js
state: () => ({
  token: localStorage.getItem('access_token') || null,
  refreshToken: localStorage.getItem('refresh_token') || null,
  user: null, // Directus user object
  contatto: null, // Contatto record linked to user
  hasFamiglieAccess: false, // Whether user is linked to a family as Volontario
  loading: false,
  error: null,
  initialized: false // Set to true after boot-time initFromStorage()
})
```

### Getters

```js
getters: {
  isAuthenticated: (state) => !!state.token,
  roleName: (state) => normalizeRoleName(state.user?.role),
  hasRole: (state) => (roleName) => { /* check normalized role name */ },
  canVerifica: (state) => {
    // Checks VERIFICA_ROLE_NAMES and VERIFICA_ROLE_IDS
  },
  userName: (state) => {
    if (state.contatto) return `${state.contatto.Nome} ${state.contatto.Cognome}`
    if (state.user) return state.user.first_name || state.user.email
    return ''
  },
  userId: (state) => state.user?.id,
  contattoId: (state) => state.contatto?.id_contatto
}
```

### Actions

```js
actions: {
  async initFromStorage() {
    // Boot-time: check localStorage for tokens → fetchUserData() → initialized = true
  },
  async login(email, password) {
    // POST /auth/login → store tokens → fetchUserData() → return success
  },
  async fetchUserData() {
    // GET /users/me → resolveUserRole() → GET /items/contatti → resolveFamiglieAccess()
  },
  async resolveUserRole() {
    // Decode JWT payload for role ID → GET /roles/:id → set user.role
  },
  async resolveFamiglieAccess() {
    // GET /items/Famiglie_Contatti → set hasFamiglieAccess
  },
  async logout() {
    // POST /auth/logout → clear localStorage → reset all state
  }
}
```

---

## 3. Famiglie Store (`src/stores/famiglie.store.js`)

### State Shape

```js
state: () => ({
  famiglieContatti: [], // Array from Famiglie_Contatti
  famiglia: null, // Current family detail
  selectedProgettoId: null, // Currently selected project ID
  loading: false,
  saving: false,
  contattiLoading: false, // Loading state for genitori/email
  genitoriList: [], // Array of { id_contatto, Nome, Cognome, Numero_di_cellulare, Numero_di_telefono, Email }
  error: null
})
```

### Getters

```js
getters: {
  progetti: (state) => state.famiglia?.Progetti || [],
  selectedProgetto: (state) => { /* find project by selectedProgettoId */ },
  famigliaName: (state) => state.famiglia?.Nome_Famiglia || '',
  iban: (state) => state.famiglia?.IBAN || '',
  intestatarioCC: (state) => state.famiglia?.Intestatario_CC || '',
  genitori: (state) => state.genitoriList
}
```

### Actions

```js
actions: {
  async init(contattoId) {
    // getFamiglieByVolontario → loadFamiglia() → auto-select first project
  },
  async checkAccess(contattoId) {
    // Quick check: GET /items/Famiglie_Contatti → return boolean
  },
  async loadFamiglia(famigliaId) {
    // GET /items/Famiglie/:id → set famiglia + selectedProgettoId → loadGenitori()
  },
  async loadGenitori(famigliaId) {
    // GET /items/Famiglie_Contatti (Genitore role) → extract contattoIds
    // → batch GET /items/email with _in filter and Primary=true
    // → merge email addresses into genitoriList
  },
  selectProgetto(progettoId) {
    // Set selectedProgettoId → triggers giustificativi fetch (watch)
  },
  async updateIBAN(iban, intestatario) {
    // PATCH /items/Famiglie/:id → merge selectivo (preserves Progetti)
  }
}
```

---

## 4. Giustificativi Store (`src/stores/giustificativi.store.js`)

### State Shape

```js
state: () => ({
  items: [], // Giustificativi for selected project
  loading: false,
  saving: false,
  editingItem: null, // Item currently being edited inline
  error: null
})
```

### Getters

```js
getters: {
  draftItems: (state) => state.items.filter(i => i.Stato === 'draft'),
  inviatoItems: (state) => state.items.filter(i => i.Stato === 'Inviato' || i.Stato === 'approvato'),
  canEdit: (state) => (itemId) => {
    const item = state.items.find(i => i.id === itemId)
    return item && item.Stato === 'draft'
  }
}
```

### Actions

```js
actions: {
  async fetchByProgetto(progettoId) {
    // GET /items/Giustificativi?filter[Progetto][_eq]=progettoId&fields=*,Rendicontazione.*
  },
  async createGiustificativo(data, file) {
    // 1. ensureRendicontazione() → auto-create if needed
    // 2. Upload file → POST /files (folder: 91a9c958-...)
    // 3. Create giustificativo → POST /items/Giustificativi
    // 4. Refresh list
  },
    async ensureRendicontazione(data) {
    // Find existing rendicontazione by Famiglia+Progetto
    // If not found, create one with Stato:'ricevuta'
  },
  async updateGiustificativo(id, data, newFile) {
    // If newFile: mark old file as OBSOLETE, upload new one
    // PATCH /items/Giustificativi/:id → merge into local state
  },
  async submitGiustificativo(id) {
    // PATCH /items/Giustificativi/:id { Stato: "Inviato" }
  },
  async invalidateGiustificativo(id) {
    // PATCH /items/Giustificativi/:id { Invalidato: true }
    // Sets local item's Invalidato flag
  },
  async saveInlineEdit(id, field, value) {
    // PATCH /items/Giustificativi/:id { [field]: value }
    // Granular update of single field
  },
  startInlineEdit(item) { /* set editingItem */ },
  cancelInlineEdit() { /* clear editingItem */ }
}
```

---

## 5. Verifica Store (`src/stores/verifica.store.js`)

### State Shape

```js
state: () => ({
  rows: [], // Normalized projects with totals
  loading: false,
  error: null
})
```

### Getters

```js
getters: {
  anniBando: (state) => {
    // Extract unique anni bando from rows, sorted desc
  },
  totaleRendicontato: (state) => state.rows.reduce(/* sum rendicontato */),
  totaleRimborsabile: (state) => state.rows.reduce(/* sum rimborsabile */)
}
```

### Actions

```js
  actions: {
    async fetchAll() {
      // 1. Parallel: GET /items/Progetti (limit:-1) + GET /items/Giustificativi (limit:-1, sort:-Data)
      // 2. Normalize projects: create rows
      // 3. Include all non-Invalidato giustificativi in row.giustificativi[]
      // 4. Aggregate totals: only isCountedInTotals() items contribute
      // 5. Cap rimborsabile at Allocato per project
    },
    async verifyGiustificativo(progettoId, giustId) {
      // PATCH Stato: "Verificato" → update local → recalculateRowTotals()
    },
    async rejectGiustificativo(progettoId, giustId, nota) {
      // 1. PATCH Stato: "Rifiutato" + NotaRifiuto: nota
      // 2. PATCH /files/{id}: rename allegato → RIFIUTATO_<data>
      // 3. Update local → recalculateRowTotals()
      // Item excluded from totals (isCountedInTotals returns false)
    }
  }
```

### Row Shape

```js
{
  id: project.id_progetto,
  idProgetto: project.id_progetto,
  idFamiglia: string,
  famiglia: string,
  beneficiario: string,
  annoBando: string,
  ambito: string,
  titolo: string,
  allocato: number,
  iban: string,
  intestatario: string,
  totaleRendicontato: number,
  totaleRimborsabile: number,
  residuoAllocato: number,
  giustificativi: []
}
```

---

## 6. Data Flow Diagram

```
LoginPage.vue                    FamigliePage.vue                     VerificaPage.vue
     │                                │                                    │
     │ login()                        │ init(contattoId)                    │ fetchAll()
     ▼                                ▼                                    ▼
┌─────────────┐                ┌──────────────┐                    ┌─────────────┐
│ auth.store   │                │famiglie.store│                    │verifica.store│
│  token       │                │  famiglia    │───progetti[]       │  rows[]      │
│  user        │                │  genitori[]  │                    │              │
│  contatto    │                │  selectedId  │                    │              │
│  canVerifica │                └──────┬───────┘                    │              │
│  initialized │                       │ selectProgetto()           └─────────────┘
└──────┬───────┘                       ▼
       │                       ┌───────────────────┐
       │ logout()              │giustificativi.store│
       ▼                       │  items[]           │
  ┌─────────┐                  │  editingItem       │
  │ Login   │                  └───────────────────┘
  │ Page    │
  └─────────┘
```

---

## 7. Store Interaction Rules

- **auth.store** is loaded via `src/boot/auth.js` (runs `initFromStorage()` before app mount)
- **famiglie.store.init()** is called in FamigliePage.vue when `authStore.contattoId` changes (via watch)
- **giustificativi.store.fetchByProgetto()** is called whenever `selectedProgettoId` changes (via watch in GiustificativoList)
- **verifica.store.fetchAll()** is called in VerificaPage.vue on mount
- All stores are independent (no cross-store imports) — auth info is passed to service functions as needed
- **Eccezioni note (debito tecnico):** `verifica.store` legge `auth.store`
  (`canManager`) e invoca `pagamenti.store.ricalcolaProposta`; `api.js` legge
  `auth.store`. Da spostare in use case dedicati in una pulizia futura.
- On logout: stores are reset individually (auth.store handles its own reset)

---

## 8. Macchine a stati (unico scrittore di stato)

Lo stato persistito delle entità di dominio non viene più scritto direttamente
da store/componenti/service. Tutto passa dalla primitiva
`src/usecases/stato/transita.js`:

| Stato persistito                   | Macchina                        | Eventi (esempi)                                    |
| ---------------------------------- | ------------------------------- | -------------------------------------------------- |
| `Giustificativi.Stato`             | `state-machines/giustificativo` | `INVIA`, `VERIFICA`, `RIFIUTA`, `RICALCOLA_PAGATO` |
| `Pagamenti.Stato`                  | `state-machines/pagamento`      | `IN_PAGAMENTO`, `PAGA`, `FALLISCI`, `ANNULLA`      |
| `Progetti.StatoProgetto`           | `state-machines/progetto`       | `CHIUDI`, `RIAPRI`, `RICALCOLA_*`                  |
| `InviiGiustificativiNoLogin.stato` | `state-machines/submission`     | `SCARTA`, `RIPRISTINA`, `RICONCILIA`               |

API della primitiva:

- `transita({ machine, campo, statoCorrente, evento, extra, scrivi })` — valida
  la transizione (evento dichiarato per lo stato corrente) e scrive la patch.
  Evento non valido → `TransizioneNonValidaError`.
- `creaConStato` / `creaConStatoIniziale` — creazione con stato dichiarato.

Le macchine (`@xstate/fsm`) non fanno I/O e non persistono: la fonte di verità
resta Directus. I fetch/read e i **valori derivati** (`statoRiga`,
`calcolaStatoRendicontazione`, totali/erogabile) restano funzioni pure di
lettura. `StatoRendicontazione` è persistito ma non editabile in UI.

**Enforcement**: ESLint `no-restricted-syntax` vieta i literal `Stato` /
`StatoProgetto` in oggetti fuori da `src/state-machines/` e
`src/usecases/stato/`. Test: `tests/unit/state-machines/`.
