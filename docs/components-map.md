# Components Map Document

**Version:** 1.1.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — added Dati bancari expansion, Elimina button, Apri/Scarica labels |

---

## 1. Component Hierarchy

```
App.vue
└── AppLayout.vue
    ├── AppHeader.vue
    │   ├── User display name
    │   ├── Change password (q-item/q-menu)
    │   └── Logout button (q-btn)
    │
    └── <router-view>
        │
        ├── LoginPage.vue
        │   ├── Login form (q-card)
        │   │   ├── q-input (email)
        │   │   ├── q-input (password)
        │   │   ├── q-btn (sign in)
        │   │   └── q-btn (forgot password link)
        │   └── ForgotPasswordDialog.vue (q-dialog)
        │       ├── q-input (email)
        │       └── q-btn (send reset link)
        │
        ├── FamigliePage.vue
        │   ├── q-card (family welcome + info)
        │   │   ├── text (Nome_Famiglia)
        │   │   ├── InlineEditableField.vue (IBAN)
        │   │   └── InlineEditableField.vue (Intestatario_CC)
        │   ├── ProgettoSelector.vue (q-select)
        │   ├── GiustificativoList.vue
        │   │   ├── GiustificativoCard.vue (q-card per item)
        │   │   │   ├── text/InlineEditableField (Descrizione)
        │   │   │   ├── text/InlineEditableField (Importo)
        │   │   │   ├── text (Data)
        │   │   │   ├── q-badge (Stato)
        │   │   │   ├── q-btn (edit, if draft)
        │   │   │   ├── q-btn (invia, if draft)
        │   │   │   └── a (allegato link/thumbnail)
        │   │   └── GiustificativoForm.vue (q-dialog for add)
        │   │       ├── q-input (Descrizione)
        │   │       ├── q-input (Importo, number)
        │   │       ├── q-date (Data)
        │   │       ├── FileUploader.vue (q-file)
        │   │       └── q-btn (save)
        │   └── ConfirmDialog.vue (q-dialog for submit confirmation)
        │
        └── MigrazionePage.vue (admin only)
            ├── q-table (volontari list)
            ├── q-btn (crea utente per row)
            └── q-badge (stato: creato / da creare)
```

---

## 2. Component Specifications

### 2.1 InlineEditableField.vue

| Prop | Type | Default | Description |
|---|---|---|---|
| modelValue | String | — | Current value |
| label | String | — | Field label |
| readonly | Boolean | false | Disable editing entirely |
| type | String | "text" | Input type (text, number) |
| rules | Array | [] | Validation rules |

| Event | Payload | Description |
|---|---|---|
| update:modelValue | String | Emitted on save |
| save | String | Emitted when user confirms edit |
| cancel | — | Emitted when user cancels edit |

**States:**
- **Display mode:** Shows value as plain text, clickable to enter edit mode
- **Edit mode:** Shows `q-input`, save checkmark, cancel X icons
- **Saving:** Shows loading spinner, input disabled
- **Read-only:** Value shown as plain text, non-clickable

### 2.2 GiustificativoCard.vue

| Prop | Type | Description |
|---|---|---|
| item | Object | Giustificativo data |
| editable | Boolean | Whether inline editing is allowed |

| Event | Description |
|---|---|
| edit | Emitted when user starts editing |
| save | Emitted with updated fields |
| submit | Emitted when user clicks "Invia" |
| download | Emitted when user clicks attachment |

### 2.3 FileUploader.vue

| Prop | Type | Default | Description |
|---|---|---|---|
| accept | String | ".jpg,.jpeg,.png,.pdf" | Accepted file types |
| maxSize | Number | 5242880 | Max file size in bytes (5MB) |
| label | String | "Allega file" | Label text |

| Event | Description |
|---|---|
| file-selected | Emitted with File object |

### 2.4 ProgettoSelector.vue

| Prop | Type | Description |
|---|---|---|
| progetti | Array | List of Progetti objects |
| modelValue | String | Selected progetto id |

| Event | Description |
|---|---|
| update:modelValue | Emitted on selection change |

---

## 3. Shared State (Pinia Stores)

See [state-management.md](./state-management.md)
