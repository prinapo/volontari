# State Management Document

**Version:** 2.0.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — added email query in famiglie.store, genitori mapping |
| 2026-05-25 | 2.0.0 | System | Final — added verifica.store, updated auth.store with initFromStorage/canVerifica, giustificativi.store with invalidate/ensureRendicontazione |

---

## 1. Overview

State management uses Pinia (official Vue 3 store). Four stores manage the application state.

---

## 2. Auth Store (`src/stores/auth.store.js`)

### State Shape

```js
state: () => ({
  token: localStorage.getItem('access_token') || null,
  refreshToken: localStorage.getItem('refresh_token') || null,
  user: null,                 // Directus user object
  contatto: null,             // Contatto record linked to user
  hasFamiglieAccess: false,   // Whether user is linked to a family as Volontario
  loading: false,
  error: null,
  initialized: false          // Set to true after boot-time initFromStorage()
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
  famiglieContatti: [],         // Array from Famiglie_Contatti
  famiglia: null,               // Current family detail
  selectedProgettoId: null,     // Currently selected project ID
  loading: false,
  saving: false,
  contattiLoading: false,       // Loading state for genitori/email
  genitoriList: [],             // Array of { id_contatto, Nome, Cognome, Numero_di_cellulare, Numero_di_telefono, Email }
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
  items: [],                    // Giustificativi for selected project
  loading: false,
  saving: false,
  editingItem: null,            // Item currently being edited inline
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
    // Find existing rendicontazione by Famiglia+Progetto+Tranche
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
  rows: [],        // Normalized projects with tranche aggregation
  loading: false,
  error: null
})
```

### Constants

```js
TRANCHE = [
  { value: 'luglio',    label: 'Luglio',    month: 7 },
  { value: 'settembre', label: 'Settembre',  month: 9 },
  { value: 'novembre',  label: 'Novembre',   month: 11 },
  { value: 'febbraio',  label: 'Febbraio',   month: 2 }
]
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
    // 1. Parallel: GET /items/Progetti (limit:-1) + GET /items/Giustificativi (limit:-1)
    // 2. Normalize projects: create rows with empty tranche buckets
    // 3. Filter giustificativi: exclude Invalidato, only submitted (Inviato/approvato)
    // 4. Aggregate by project + tranche: sum Importo * 0.8 for rimborsabile
    // 5. Cap rimborsabile at Allocato per project
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
  giustificativi: [],
  tranche: {
    luglio:    { rendicontato: 0, rimborsabile: 0, count: 0, allegati: 0 },
    settembre: { rendicontato: 0, rimborsabile: 0, count: 0, allegati: 0 },
    novembre:  { rendicontato: 0, rimborsabile: 0, count: 0, allegati: 0 },
    febbraio:  { rendicontato: 0, rimborsabile: 0, count: 0, allegati: 0 }
  }
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
│  user        │                │  genitori[]  │                    │  Rows with   │
│  contatto    │                │  selectedId  │                    │  tranche     │
│  canVerifica │                └──────┬───────┘                    │  aggregation │
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
- On logout: stores are reset individually (auth.store handles its own reset)
