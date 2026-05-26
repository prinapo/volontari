# Appsmith Migration Map Document

**Version:** 2.0.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — mapped Elimina (delete icon), email table, inline editing, Dati bancari expansion |
| 2026-05-25 | 2.0.0 | System | Final — added Verifica page, Migrazione page mapping, Rendicontazione mapping, role-based redirect |

---

## 1. Overview

This document maps every element of the original Appsmith application ("Portale Volontario") to its Quasar/Vue 3 equivalent. Source files:

- `source_info/Portale Volontario AppSmith.json` — Appsmith export
- `source_info/snapshot Directus.json` — Directus schema

---

## 2. Page Mapping

| Appsmith Page | Quasar Route | Description |
|---|---|---|
| Login | `/login` | Authentication (sign-in + forgot password) |
| Famiglie | `/famiglie` | Main dashboard: family info, projects, giustificativi |
| Migrazione | — | Removed; functionality moved to VerificaPage or manual admin |
| — | `/verifica` | NEW — Verification/rendicontazione dashboard for admin role |

---

## 3. Login Page — Widget Mapping

| Appsmith Widget | Type | Quasar Component | Notes |
|---|---|---|---|
| `con_login` | Container | `q-card` | Outer container |
| `img_login` | Image | Removed | Logo removed |
| `tab_auth` | Tabs (Sign In / Register) | Removed | Register removed (handled by admin) |
| `InputEmail` | Input | `q-input` type="email" | `v-model="email"`, data-testid="login-email" |
| `InputPassword` | Input | `q-input` type="password" | Show/hide visibility toggle |
| `btn_signIn` | Button | `q-btn` | `@click="handleLogin"` |
| — | — | `q-btn` (link) | "Password dimenticata?" added |
| — | — | `ForgotPasswordDialog` | Password reset dialog (q-dialog) |

## 4. Login Page — JS Logic Mapping

| Appsmith JS | Quasar Equivalent | Notes |
|---|---|---|
| `JSObject1.login()` | `auth.store.login()` | Pinia action |
| `loginAPI` | `auth.service.login()` | POST `/auth/login` |
| `appsmith.store.token` | `localStorage.getItem('access_token')` | JWT token storage |
| `appsmith.store.refresh_token` | `localStorage.getItem('refresh_token')` | Refresh token |
| — | `auth.store.initFromStorage()` | NEW — boot-time session restore |
| — | `auth.store.resolveUserRole()` | NEW — get role name from ID |
| — | `auth.store.canVerifica` | NEW — role-based route access |

---

## 5. Famiglie Page — Widget Mapping

| Appsmith Widget | Type | Quasar Component | Notes |
|---|---|---|---|
| `Select1` | Select | `ProgettoSelector.vue` (`q-select`) | Project dropdown with formatted options |
| `Text1` | Text | `q-card-section` | Family name display |
| `Text14/15/16` | Labels | `q-item-label` | Labels for IBAN, Intestatario, etc. |
| — | Genitori | `q-item` | NEW — genitori section with clickable Email/Telefoni |
| — | Email | Separate query | Email fetched from `email` table (not o2m on contatti) |
| `IBAN` | Text | `InlineEditableField.vue` | Click-to-edit IBAN (inside Dati bancari expansion) |
| `Intestatario` | Text | `InlineEditableField.vue` | Click-to-edit Intestatario_CC (inside Dati bancari expansion) |
| `Button8` | Button | Removed | Edit IBAN → replaced by inline editing |
| `modalModificaIBAN` | Modal | Removed | Replaced by inline editing |
| `inputIBAN` | Input | Removed | Replaced by inline editing |
| `inputIntestAtario` | Input | Removed | Replaced by inline editing |
| `Button9/10` | Buttons | Removed | Replaced by inline save (✓) / cancel (✗) |
| `Giustificativi` | List | `GiustificativoList.vue` | List of giustificativi with heading + Add button |
| `Container1` | Container | `GiustificativoCard.vue` | Per-item card |
| `Button3` | Button | `q-btn` | "Aggiungi" (add giustificativo) |
| `ButtonModifica` | Button | Inline editing | Edit → now inline (click field to edit) |
| `ButtonGroup1` | Button Group | `q-btn` + `q-menu` | Submit/actions per item |
| `modalAggiungiGiustificativo` | Modal | `GiustificativoForm.vue` (q-dialog) | Add form with Tranche, Stato |
| `modalModificaGiustificativo` | Modal | Removed | Replaced by inline editing |
| `inputDescrizione` | Input | `q-input` | In add dialog |
| `inputImporto` | Input | `q-input` type="number" | In add dialog |
| `inputModificaImporto` | Input | `InlineEditableField.vue` | Inline on card |
| `inputModificaDescrizione` | Input | `InlineEditableField.vue` | Inline on card |
| `datePicker` / `datePickerModifica` | Date Picker | `q-date` + InlineEditableField | In add dialog + inline |
| `filePicker` / `filePickerModifica` | File Picker | `FileUploader.vue` + inline Cambia file | Accepts images + PDFs |
| `selectStato` | Select | `q-select` (Stato) | Status selector in add dialog |
| — | Tranche | `q-select` (Tranche) | NEW — Tranche selector in add dialog |
| `ButtonInvalida` | Button | `q-btn` (Elimina, icon delete) | Soft-delete with confirmation dialog |
| `ButtonAllegato` | Link | `a` (Apri / Scarica) | Separate open and download links with labels |
| — | Dati bancari | `q-expansion-item` | NEW — collapsible section for IBAN/Intestatario |

---

## 6. Famiglie Page — Query Mapping

| Appsmith Query | Quasar Service Method | Directus Endpoint |
|---|---|---|
| `getMeAPI` | `auth.service.getMe()` | GET `/users/me?fields=id,email,role.*` |
| `getContattoAPI` | `contatti.service.getByUserId(userId)` | GET `/items/contatti?filter[user_id][_eq]=` |
| `getFamiglieVolontarioAPI` | `famiglie.service.getFamiglieByVolontario(contattoId)` | GET `/items/Famiglie_Contatti?filter[Ruolo_nella_Famiglia][_eq]=Volontario&filter[Contatto][_eq]=` |
| `getFamiglieDettaglioAPI` | `famiglie.service.getById(famigliaId)` | GET `/items/Famiglie/:id?fields=...Progetti.*...` |
| `getGiustificativiAPI` | `giustificativi.service.getByProgetto(progettoId)` | GET `/items/Giustificativi?filter[Progetto][_eq]=&fields=*,Rendicontazione.*` |
| `createGiustificativoAPI` | `giustificativi.service.create(data)` | POST `/items/Giustificativi` |
| `modificaGiustificativoAPI` | `giustificativi.service.update(id, data)` | PATCH `/items/Giustificativi/:id` |
| `inviaGiustificativoAPI` | `giustificativi.service.submit(id)` | PATCH `/items/Giustificativi/:id` (Stato: "Inviato") |
| `uploadFileAPI` | `files.service.upload(file, folder)` | POST `/files` (multipart FormData) |
| `updateFileMetaAPI` | `files.service.updateMeta(id, meta)` | PATCH `/files/:id` |
| `aggiornaFamigliaAPI` | `famiglie.service.update(id, data)` | PATCH `/items/Famiglie/:id` |
| — | `famiglie.service.getGenitoriByFamiglia(id)` | NEW — GET `/items/Famiglie_Contatti` (Genitore role) |
| — | `famiglie.service.getEmailByContatto(ids)` | NEW — GET `/items/email?filter[Contatto_Relation][_in]=` |
| — | `giustificativi.service.invalidate(id)` | NEW — PATCH `/items/Giustificativi/:id` {Invalidato: true} |
| — | `rendicontazioni.service.findByProjectAndTranche()` | NEW — GET `/items/Rendicontazioni` with filters |
| — | `rendicontazioni.service.create(data)` | NEW — POST `/items/Rendicontazioni` |
| — | `verifica.service.getProgetti()` | NEW — GET `/items/Progetti?limit=-1` |
| — | `verifica.service.getGiustificativi()` | NEW — GET `/items/Giustificativi?limit=-1` |
| — | `progetti.service.getById(id)` | NEW — GET `/items/Progetti/:id` |

---

## 7. Famiglie Page — JS Logic Mapping

| Appsmith JS Function | Quasar Equivalent | Logic |
|---|---|---|
| `OnLoad.init()` | `famiglie.store.init()` | Chain: getMe → getContatto → getFamiglieVolontario → loadFamiglia → loadGenitori |
| `OnLoad.selectedProject()` | `famiglie.store.selectedProgetto` (computed) | Find project by id |
| `OnLoad.saveGiustificativo()` | `giustificativi.store.createGiustificativo()` | Validate → ensureRendicontazione → upload file → create item → refresh |
| `OnLoad.salvaModifica()` | `giustificativi.store.updateGiustificativo()` | If new file: upload → update meta → PATCH item → refresh |
| `OnLoad.inviaGiustificativo()` | `giustificativi.store.submitGiustificativo(id)` | PATCH stato → refresh list |
| `OnLoad.apriModifica()` | Inline editing | Click field → edit mode → save/cancel |
| — | `famiglie.store.loadGenitori()` | NEW — fetch parents + email, merge into genitoriList |
| — | `giustificativi.store.invalidateGiustificativo()` | NEW — soft delete with Invalidato: true |
| — | `giustificativi.store.ensureRendicontazione()` | NEW — auto-create Rendicontazione if not exists |

---

## 8. Verifica Page — Mapping (NEW)

| Feature | Quasar | Notes |
|---|---|---|
| Dashboard | `VerificaPage.vue` | Route `/verifica` (requires Verifica role) |
| Filters | `q-select` (x3) + `q-input` | Tranche, Anno bando, Rendicontazione filter, Cerca |
| Summary | Summary grid (4 cards) | Count, rendicontato, rimborsabile, ASPI ready |
| Data table | `q-table` | Custom per-column templates |
| ASPI export | Copy-to-clipboard | Generates formatted ASPI line for each project |
| Store | `verifica.store.js` | Fetches all progetti + giustificativi, normalizes, aggregates |
| Service | `verifica.service.js` | GET /items/Progetti + GET /items/Giustificativi (limit:-1) |

---

## 9. Migrazione Page — Mapping

| Appsmith | Quasar | Status |
|---|---|---|
| `Table1` | — | **Removed** — admin user creation now done manually via Directus |
| `getVolontariAPI` | — | Removed |
| `getEmailContattiAPI` | — | Removed |
| `creaUtenteAPI` | — | Removed |
| `collegaUtenteContattoAPI` | — | Removed |
| `Migrazione.init()` | — | Removed |

---

## 10. Database Entity Mapping

| Appsmith Context | Directus Collection | PK | Notes |
|---|---|---|---|
| Volontario | `contatti` | `id_contatto` | User profile data |
| — | `Famiglie` | `id_famiglia` | Family group |
| Ruolo | `Famiglie_Contatti` | `id` (auto) | Junction: Volontario/Genitore/Tutore |
| Progetto | `Progetti` | `id_progetto` | Individual project |
| Giustificativo | `Giustificativi` | `id` (auto) | Expense report |
| — | `email` | `id` (auto) | Email addresses (linked to contatti) |
| — | `Rendicontazioni` | `id` (auto) | NEW — Rendicontazione records per tranche |
| — | `directus_users` | `id` (uuid) | System users |
| Allegato | `directus_files` | `id` (uuid) | Uploaded files |
