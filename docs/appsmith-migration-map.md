# Appsmith Migration Map Document

**Version:** 1.1.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — mapped Elimina (delete icon), email table, inline editing, Dati bancari expansion |

---

## 1. Overview

This document maps every element of the original Appsmith application ("Portale Volontario") to its Quasar/Vue 3 equivalent. Source files:

- `source_info/Portale Volontario AppSmith.json` — Appsmith export
- `source_info/snapshot Directus.json` — Directus schema

---

## 2. Page Mapping

| Appsmith Page | Quasar Route | Description |
|---|---|---|
| Login | `/login` | Authentication (sign in) |
| Famiglie | `/famiglie` | Main dashboard: family info, projects, giustificativi |
| Migrazione | `/migrazione` | Admin: create user accounts from contacts |

---

## 3. Login Page — Widget Mapping

| Appsmith Widget | Type | Quasar Component | Notes |
|---|---|---|---|
| `con_login` | Container | `q-card` | Outer container |
| `img_login` | Image | `q-img` | Logo, removed if not needed |
| `tab_auth` | Tabs (Sign In / Register) | Not migrated | Register removed (handled by admin) |
| `InputEmail` | Input | `q-input` type="email" | `v-model="email"` |
| `InputPassword` | Input | `q-input` type="password" | `v-model="password"` |
| `btn_signIn` | Button | `q-btn` | `@click="handleLogin"` |
| — | — | `q-btn` (link) | "Forgot password?" added |

## 4. Login Page — JS Logic Mapping

| Appsmith JS | Quasar Equivalent | Notes |
|---|---|---|
| `JSObject1.login()` | `auth.store.login()` | Pinia action |
| `loginAPI` | `auth.service.login()` | POST `/auth/login` |
| `appsmith.store.token` | `localStorage.getItem('access_token')` | JWT token storage |
| `appsmith.store.refresh_token` | `localStorage.getItem('refresh_token')` | Refresh token |

---

## 5. Famiglie Page — Widget Mapping

| Appsmith Widget | Type | Quasar Component | Notes |
|---|---|---|---|
| `Select1` | Select | `ProgettoSelector.vue` (`q-select`) | Project dropdown |
| `Text1` | Text | `q-card-section` | Family name display |
| `Text14/15/16` | Labels | `q-item-label` | Labels for IBAN, Intestatario, etc. |
| — | Genitori | `q-item` | Genitori section with clickable Email (`mailto:`) and Telefoni (`tel:`) |
| — | Email | Separate query | Email fetched from `email` table (not o2m on contatti) |
| `IBAN` | Text | `InlineEditableField.vue` | Click-to-edit IBAN |
| `Intestatario` | Text | `InlineEditableField.vue` | Click-to-edit Intestatario_CC |
| `Button8` | Button | `q-btn` | Edit IBAN → removed, now inline |
| `modalModificaIBAN` | Modal | Removed | Replaced by inline editing |
| `inputIBAN` | Input | Removed | Replaced by inline editing |
| `inputIntestAtario` | Input | Removed | Replaced by inline editing |
| `Button9/10` | Buttons | Removed | Replaced by inline save/cancel |
| `Giustificativi` | List | `GiustificativoList.vue` | List of giustificativi |
| `Container1` | Container | `GiustificativoCard.vue` | Per-item card |
| `Button3` | Button | `q-btn` | "Add Giustificativo" |
| `Button7` | Button | `q-btn` | Edit → now inline |
| `ButtonGroup1` | Button Group | `q-btn` + `q-menu` | Submit/actions per item |
| `modalAggiungiGiustificativo` | Modal | `GiustificativoForm.vue` in `q-dialog` | Add form (kept as dialog) |
| `modalModificaGiustificativo` | Modal | Removed | Replaced by inline editing |
| `inputDescrizione` | Input | `q-input` | In add dialog |
| `inputImporto` | Input | `q-input` type="number" | In add dialog |
| `inputModificaImporto` | Input | `InlineEditableField.vue` | Inline on card |
| `inputModificaDescrizione` | Input | `InlineEditableField.vue` | Inline on card |
| `datePicker` / `datePickerModifica` | Date Picker | `q-date` | In add dialog |
| `filePicker` / `filePickerModifica` | File Picker | `FileUploader.vue` | Accepts images + PDFs |
| `selectStato` | Select | `q-select` | Status selector in add dialog |

---

## 6. Famiglie Page — Query Mapping

| Appsmith Query | Quasar Service Method | Directus Endpoint |
|---|---|---|
| `getMeAPI` | `auth.service.getMe()` | GET `/users/me` |
| `getContattoAPI` | `contatti.service.getByUserId(userId)` | GET `/items/contatti?filter[user_id][_eq]=` |
| `getFamiglieVolontarioAPI` | `famiglie.service.getFamiglieByVolontario(contattoId)` | GET `/items/Famiglie_Contatti?filter[Ruolo_nella_Famiglia][_eq]=Volontario&filter[Contatto][_eq]=` |
| `getFamiglieDettaglioAPI` | `famiglie.service.getById(famigliaId)` | GET `/items/Famiglie/:id?fields=...` |
| `getGiustificativiAPI` | `giustificativi.service.getByProgetto(progettoId)` | GET `/items/Giustificativi?filter[Progetto][_eq]=` |
| `createGiustificativoAPI` | `giustificativi.service.create(data)` | POST `/items/Giustificativi` |
| `modificaGiustificativoAPI` | `giustificativi.service.update(id, data)` | PATCH `/items/Giustificativi/:id` |
| `inviaGiustificativoAPI` | `giustificativi.service.submit(id)` | PATCH `/items/Giustificativi/:id` (Stato: "Inviato") |
| `uploadFileAPI` | `files.service.upload(file)` | POST `/files` |
| `updateFileMetaAPI` | `files.service.updateMeta(id, meta)` | PATCH `/files/:id` |
| `aggiornaFamigliaAPI` | `famiglie.service.update(id, data)` | PATCH `/items/Famiglie/:id` |

---

## 7. Famiglie Page — JS Logic Mapping

| Appsmith JS Function | Quasar Equivalent | Logic |
|---|---|---|
| `OnLoad.init()` | `famiglie.store.init()` | Chain: getMe → getContatto → getFamiglieVolontario → getFamiglieDettaglio → getGiustificativi |
| `OnLoad.selectedProject()` | `famiglie.store.selectedProgetto` (computed) | Find project by id |
| `OnLoad.saveGiustificativo()` | `giustificativi.store.createGiustificativo()` | Validate → upload file → update meta → create item → refresh list → close dialog |
| `OnLoad.salvaModifica()` | `giustificativi.store.updateGiustificativo()` | If new file: upload → update meta → PATCH item → refresh |
| `OnLoad.inviaGiustificativo()` | `giustificativi.store.submitGiustificativo(id)` | PATCH stato → refresh list |
| `OnLoad.apriModifica()` | (inline) | Activation of inline edit mode on card |

---

## 8. Migrazione Page — Mapping

| Appsmith | Quasar | Notes |
|---|---|---|
| `Table1` | `q-table` | List of volontari without user |
| `getVolontariAPI` | `admin.service.getVolontari()` | Fetch all volunteers |
| `getEmailContattiAPI` | `admin.service.getEmailContatti()` | Fetch email contacts |
| `creaUtenteAPI` | `admin.service.createUser()` | POST `/users` |
| `collegaUtenteContattoAPI` | `admin.service.linkUser()` | PATCH `/items/contatti/:id` |
| `Migrazione.init()` | — | Merges volontari + email data |

---

## 9. Database Entity Mapping

| Appsmith Context | Directus Collection | PK | Notes |
|---|---|---|---|
| Volontario | `contatti` | `id_contatto` | User profile data |
| — | `Famiglie` | `id_famiglia` | Family group |
| Ruolo | `Famiglie_Contatti` | `id` (auto) | Junction: Volontario/Genitore/Tutore |
| Progetto | `Progetti` | `id_progetto` | Individual project |
| Giustificativo | `Giustificativi` | `id` (auto) | Expense report |
| — | `email` | `id` (auto) | Email addresses |
| — | `directus_users` | `id` (uuid) | System users |
| Allegato | `directus_files` | `id` (uuid) | Uploaded files |
