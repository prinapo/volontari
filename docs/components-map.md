# Components Map Document

**Version:** 2.0.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — added Dati bancari expansion, Elimina button, Apri/Scarica labels |
| 2026-05-25 | 2.0.0 | System | Final — added AppLayout with sidebar, VerificaPage, ConfirmDialog, FileUploader, genitori section, InlineEditableField date type, GiustificativoForm Tranche/Stato |

---

## 1. Component Hierarchy

```
App.vue
  └── <router-view>
      ├── LoginPage.vue (public)
      │   ├── Login form (q-card)
      │   │   ├── q-input (email)
      │   │   ├── q-input (password + toggle visibility)
      │   │   ├── q-btn (Accedi, submit)
      │   │   └── q-btn (Password dimenticata?)
      │   └── ForgotPasswordDialog.vue (q-dialog)
      │       ├── q-input (email)
      │       └── q-btn (Invia link)
      │
      ├── AppLayout.vue (requiresAuth)
      │   ├── QHeader
      │   │   ├── User display name (app header)
      │   │   └── QBtnDropdown
      │   │       ├── q-item (Cambia password)
      │   │       └── q-item (Esci / logout)
      │   ├── QDrawer sidebar
      │   │   ├── q-item (Famiglie, icon home)
      │   │   └── q-item (Verifica, icon fact_check) [if canVerifica]
      │   └── QPageContainer
      │       └── <router-view>
      │           ├── FamigliePage.vue
      │           │   ├── q-card (family welcome + info) → FamigliaInfoCard
      │           │   │   ├── text (Nome_Famiglia, h6)
      │           │   │   ├── genitori section (if genitoriList.length > 0)
      │           │   │   │   ├── text (Nome Cognome)
      │           │   │   │   ├── a[href^="mailto:"] (Email, text-primary)
      │           │   │   │   └── a[href^="tel:"] (Cellulare/Telefono, text-primary)
      │           │   │   └── q-expansion-item (Dati bancari, icon account_balance)
      │           │   │       ├── InlineEditableField (IBAN, label="IBAN")
      │           │   │       └── InlineEditableField (Intestatario_CC, label="Intestatario")
      │           │   ├── ProgettoSelector (q-select, outlined)
      │           │   │   └── options format: "AnnoBando — Cognome Beneficiario (Età anni) — € Allocato"
      │           │   ├── q-card (totali summary)
      │           │   │   ├── text "Totale Giustificativi" + text-h6 primary
      │           │   │   ├── text "Totale Rimborsabile" + text-h6 positive
      │           │   │   └── text "80% dei giustificativi fino a €Allocato"
      │           │   └── GiustificativoList
      │           │       ├── heading "Giustificativi"
      │           │       ├── q-btn (Aggiungi, icon add)
      │           │       ├── GiustificativoCard (q-card per item)
      │           │       │   ├── q-badge (Stato: Bozza orange / Inviato blue)
      │           │       │   ├── q-badge (Tranche, if present)
      │           │       │   ├── InlineEditableField (Descrizione, type text)
      │           │       │   ├── InlineEditableField (Importo, type text, format "€ X,XX")
      │           │       │   ├── InlineEditableField (Data, type text, format "DD/MM/YYYY")
      │           │       │   ├── a (Apri, icon open_in_new, if Allegato)
      │           │       │   ├── a (Scarica, icon download, if Allegato)
      │           │       │   ├── q-btn (Cambia file, icon cloud_upload, if draft + Allegato)
      │           │       │   ├── q-btn (Elimina, icon delete, red, if draft)
      │           │       │   ├── q-btn (Invia, icon send, if draft)
      │           │       │   └── text "Nessun allegato" (if no Allegato)
      │           │       └── GiustificativoForm (q-dialog, fullscreen on mobile)
      │           │           ├── q-input (Descrizione)
      │           │           ├── q-input (Importo, type number, step 0.01)
      │           │           ├── q-date (Data, mask="YYYY-MM-DD")
      │           │           ├── q-select (Tranche: Luglio/Settembre/Novembre/Febbraio)
      │           │           ├── q-select (Stato: draft/Inviato)
      │           │           ├── FileUploader (q-file, accept .pdf/.jpg/.png)
      │           │           ├── q-btn (Annulla, data-testid="form-annulla")
      │           │           └── q-btn (Salva, color primary)
      │           │
      │           └── VerificaPage.vue (requiredRole: Verifica)
      │               ├── Filtri row
      │               │   ├── q-select (Tranche: Luglio/Settembre/Novembre/Febbraio)
      │               │   ├── q-select (Anno bando, filtered from data)
      │               │   ├── q-select (Rendicontazione: con importi/tutte/mancanti)
      │               │   └── q-input (Cerca famiglia o beneficiario)
      │               ├── Summary grid (4 cards)
      │               │   ├── Famiglie/progetti count
      │               │   ├── Rendicontato tranche (primary)
      │               │   ├── Rimborsabile 80% (positive)
      │               │   └── Pronte per ASPI count
      │               └── q-table (flat, bordered, custom body cells)
      │                   ├── Famiglia (nome + ID)
      │                   ├── Beneficiario (nome + ambito/titolo)
      │                   ├── Dati bancari (badge Completi/Da completare + IBAN)
      │                   ├── Rendicontato [tranche] (importo + count)
      │                   ├── Rimborsabile (importo)
      │                   ├── Totali (totale rendicontato + rimborsabile)
      │                   ├── Stato (badge color based on completamento)
      │                   └── Actions (copy ASPI line)
```

---

## 2. Component Specifications

### 2.1 AppLayout.vue

| Prop | Type | Description |
|---|---|---|
| — | — | Shell layout with QHeader + QDrawer + QPageContainer |

| State | Description |
|---|---|
| `userName` | From authStore.userName getter |
| `canVerifica` | From authStore.canVerifica (shows Verifica in sidebar) |
| `changePasswordDialog` | Boolean, toggle change password dialog |

**Features:**
- Responsive QDrawer (collapsible on mobile)
- User dropdown in header with Cambia password / Esci
- Change password dialog with q-input (new password) + Salva button

### 2.2 InlineEditableField.vue

| Prop | Type | Default | Description |
|---|---|---|---|
| modelValue | String | — | Current value |
| label | String | — | Field label |
| readonly | Boolean | false | Disable editing entirely |
| type | String | "text" | Input type (text, number, date) |
| rules | Array | [] | Validation rules |

| Event | Payload | Description |
|---|---|---|
| update:modelValue | String | Emitted on save |
| save | String | Emitted when user confirms edit |
| cancel | — | Emitted when user cancels edit |

**States:**
- **Display mode:** Shows value as plain text (formatted: € for currency, DD/MM/YYYY for date), clickable to enter edit mode
- **Edit mode:** Shows `q-input`, save checkmark (`[data-testid="inline-save"]`), cancel X (`[data-testid="inline-cancel"]`)
- **Saving:** Shows loading spinner, input disabled
- **Read-only:** Value shown as plain text, non-clickable

### 2.3 GiustificativoCard.vue

| Prop | Type | Description |
|---|---|---|
| item | Object | Giustificativo data (id, Descrizione, Importo, Data, Stato, Allegato, Rendicontazione, Invalidato) |
| editable | Boolean | Whether inline editing is allowed (true if Stato === 'draft') |

| Event | Description |
|---|---|
| save | Emitted with `{ id, field, value }` when inline edit saved |
| submit | Emitted with id when user clicks "Invia" |
| invalida | Emitted with id when user clicks "Elimina" |
| file-change | Emitted with `{ id, file }` when user changes attachment |

**Features:**
- Attachment URLs constructed as: `{API_URL}/assets/{fileId}?access_token={token}` (open) and `{API_URL}/assets/{fileId}?download=1&access_token={token}` (download)
- "Elimina" button triggers a **ConfirmDialog** with message "Eliminare giustificativo?"
- "Cambia file" only visible for draft items

### 2.4 GiustificativoForm.vue

| Prop | Type | Description |
|---|---|---|
| progettoId | String | Selected project ID |
| famigliaId | String | Current family ID |
| annoBando | String | Project's year (for rendicontazione) |

| Event | Description |
|---|---|
| create | Emitted with `{ data, file }` when form submitted |
| close | Emitted when dialog is closed |

**Validation rules:**
- Descrizione: required
- Importo: required, numeric
- File: required

### 2.5 GiustificativoList.vue

| Prop | Type | Description |
|---|---|---|
| progettoId | String | Selected project ID |
| famigliaId | String | Current family ID |
| annoBando | String | Anno bando for rendicontazione |

**Features:**
- Fetches giustificativi via `giustificativiStore.fetchByProgetto(progettoId)` on mount and watch
- Manages GiustificativoForm dialog visibility
- Handles all CRUD events from GiustificativoCard

### 2.6 FamigliaInfoCard.vue

| Prop | Type | Description |
|---|---|---|
| famigliaName | String | Nome_Famiglia |
| iban | String | IBAN value |
| intestatarioCc | String | Intestatario_CC value |
| saving | Boolean | Loading state for save |

**Features:**
- Uses `useFamiglieStore()` to access genitori list
- Genitori section: shows each parent's Nome/Cognome, Email (mailto: link), Cellulare (tel: link), Telefono (tel: link)
- Dati bancari in `q-expansion-item` (collapsed by default, expand/collapse on click)

### 2.7 ProgettoSelector.vue

| Prop | Type | Description |
|---|---|---|
| modelValue | String | Selected progetto id |
| options | Array | List of Progetti objects (id_progetto, AnnoBando, Cognome_e__Nome_Beneficiario, Eta, Allocato) |

| Event | Description |
|---|---|
| update:modelValue | Emitted on selection change |

**Option format:** `"{AnnoBando} — {Beneficiario} ({Età} anni) — €{Allocato}"`

### 2.8 VerificaPage.vue

| Prop | Type | Description |
|---|---|---|
| — | — | Uses `useVerificaStore()` |

**Computed totals:**
- `totaleRendicontato`: sum of all rendered giustificativi for selected tranche
- `totaleRimborsabile`: 80% of rendicontato (capped at allocato)
- `aspiRows`: projects ready for ASPI export (dati bancari completi + importi)

### 2.9 ConfirmDialog.vue

| Prop | Type | Default | Description |
|---|---|---|---|
| icon | String | "warning" | Dialog icon |
| title | String | "Conferma" | Dialog title |
| message | String | "" | Dialog message |
| cancelLabel | String | "Annulla" | Cancel button text |
| confirmLabel | String | "Conferma" | Confirm button text |
| loading | Boolean | false | Loading state on confirm button |

| Event | Description |
|---|---|
| confirm | Emitted when user clicks confirm |
| cancel | Emitted when user clicks cancel or closes dialog |

### 2.10 FileUploader.vue

| Prop | Type | Default | Description |
|---|---|---|---|
| accept | String | ".jpg,.jpeg,.png,.pdf" | Accepted file types |
| maxSize | Number | 5242880 | Max file size in bytes (5MB) |
| label | String | "Allega file" | Label text |

| Event | Description |
|---|---|
| file-selected | Emitted with File object |
| file-removed | Emitted when file is removed |

---

## 3. Shared State (Pinia Stores)

See [state-management.md](./state-management.md)
