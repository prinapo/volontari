# State Management Document

**Version:** 1.1.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — added email query in famiglie.store, genitori mapping |

---

## 1. Overview

State management uses Pinia (official Vue 3 store). Three stores manage the application state.

---

## 2. Auth Store (`src/stores/auth.store.js`)

### State Shape

```js
state: () => ({
  token: localStorage.getItem('access_token') || null,
  refreshToken: localStorage.getItem('refresh_token') || null,
  user: null,         // Directus user object
  contatto: null,     // Contatto record linked to user
  loading: false,
  error: null
})
```

### Getters

```js
getters: {
  isAuthenticated: (state) => !!state.token,
  userName: (state) => {
    if (state.contatto) return `${state.contatto.Nome} ${state.contatto.Cognome}`
    if (state.user) return state.user.first_name
    return ''
  },
  userId: (state) => state.user?.id,
  contattoId: (state) => state.contatto?.id_contatto
}
```

### Actions

```js
actions: {
  async login(email, password) {
    // POST /auth/login → store tokens → getMe() → getContatto()
  },
  async getMe() {
    // GET /users/me
  },
  async getContatto() {
    // GET /items/contatti?filter[user_id][_eq]=userId
  },
  async refresh() {
    // POST /auth/refresh with refresh_token
  },
  async requestPasswordReset(email) {
    // POST /auth/password/request
  },
  async changePassword(newPassword) {
    // PATCH /users/me { password }
  },
  logout() {
    // Clear localStorage → reset state → navigate to /login
  },
  async init() {
    // Boot: check token → getMe → getContatto
  }
}
```

---

## 3. Famiglie Store (`src/stores/famiglie.store.js`)

### State Shape

```js
state: () => ({
  famiglieContatti: [],      // Array from Famiglie_Contatti
  famiglia: null,            // Current family detail
  selectedProgettoId: null,  // Currently selected project ID
  loading: false,
  saving: false,
  error: null
})
```

### Getters

```js
getters: {
  progetti: (state) => state.famiglia?.Progetti || [],
  selectedProgetto: (state) => {
    if (!state.progetti || !state.selectedProgettoId) return null
    return state.progetti.find(p => p.id_progetto === state.selectedProgettoId)
  },
  famigliaName: (state) => state.famiglia?.Nome_Famiglia || '',
  iban: (state) => state.famiglia?.IBAN || '',
  intestatarioCC: (state) => state.famiglia?.Intestatario_CC || ''
}
```

### Actions

```js
actions: {
  async init() {
    // Chain: getFamiglieByVolontario(contattoId) → getById(famigliaId) → loadGenitori()
    // Auto-select first project
  },
  async getFamiglieByVolontario(contattoId) {
    // GET /items/Famiglie_Contatti?filter[Ruolo_nella_Famiglia][_eq]=Volontario&filter[Contatto][_eq]=...
  },
  async getById(famigliaId) {
    // GET /items/Famiglie/:id with fields
  },
  async loadGenitori() {
    // GET /items/Famiglie_Contatti?filter[Famiglia][_eq]=... + filtered by Genitore role
    // Collect contatto IDs → batch GET /items/email?filter[Contatto_Relation][_in]=...
    // Map back to genitoriList with Email, Numero_di_cellulare, Numero_di_telefono
  },
  async updateIBAN(iban, intestatario) {
    // PATCH /items/Famiglie/:id
  },
  selectProgetto(progettoId) {
    // Set selectedProgettoId → trigger giustificativi fetch
  }
}
```

---

## 4. Giustificativi Store (`src/stores/giustificativi.store.js`)

### State Shape

```js
state: () => ({
  items: [],            // Giustificativi for selected project
  loading: false,
  saving: false,
  editingItem: null,    // Item currently being edited inline (null = display mode)
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
    // GET /items/Giustificativi?filter[Progetto][_eq]=progettoId
  },
  async createGiustificativo(data, file) {
    // 1. Upload file → POST /files
    // 2. Update file meta → PATCH /files/:id
    // 3. Create giustificativo → POST /items/Giustificativi
    // 4. Refresh list
  },
  async updateGiustificativo(id, data, newFile) {
    // If newFile: upload → update meta
    // PATCH /items/Giustificativi/:id
    // Refresh list
  },
  async submitGiustificativo(id) {
    // PATCH /items/Giustificativi/:id { Stato: "Inviato" }
    // Refresh list
  },
  startInlineEdit(item) {
    // Set editingItem to the item being edited
  },
  cancelInlineEdit() {
    // Clear editingItem
  },
  async saveInlineEdit(id, field, value) {
    // PATCH /items/Giustificativi/:id { [field]: value }
    // Update local state
  }
}
```

---

## 5. Data Flow Diagram

```
LoginPage.vue                    FamigliePage.vue
     │                                │
     │ login()                        │ init()
     ▼                                ▼
┌───────────┐                  ┌────────────┐
│ auth.store │                  │famiglie.store│
│  token     │                  │  famiglia   │──── progetti[]
│  user      │                  │  progetti[] │
│  contatto  │                  │  selectedId │
└───────────┘                  └──────┬───────┘
                                      │ selectProgetto()
                                      ▼
                               ┌────────────────┐
                               │giustificativi   │
                               │.store           │
                               │  items[]        │
                               │  editingItem    │
                               └────────────────┘
```

---

## 6. Store Interaction Rules

- **auth.store** is loaded in `App.vue`'s `setup()` or as a Quasar boot file
- **famiglie.store.init()** is called when entering `/famiglie` route (in `onBeforeRouteEnter` or component `onMounted`)
- **giustificativi.store.fetchByProgetto()** is called whenever `selectedProgettoId` changes (via `watch`)
- All stores are independent (no cross-store imports) — auth info is passed to service functions as needed
- On logout: all stores are reset via their `$reset()` method
