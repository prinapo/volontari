# Test Cases Document

**Version:** 1.1.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — mapped to actual test IDs (A-01 to RO-02); added Elimina, Allegato, Inline Edit cases |

---

## Test User

> **Nota:** Le credenziali sono contenute in `tests/e2e/fixtures/auth.json` (escluso dal repository pubblico).

| Field | Value |
|---|---|
| Email | Volontario test |
| Password | Volontario test |
| Role | Volontario |

---

## TC-01: Login Success

| Field | Value |
|---|---|
| ID | TC-01 |
| Title | Login Success |
| Tags | `@smoke` |
| Precondition | User has valid credentials |
| Steps | 1. Navigate to `/login` |
| | 2. Enter email `maddalena.massari@gmail.com` |
| | 3. Enter password `mongolfiera26!` |
| | 4. Click "Sign In" button |
| Expected | URL changes to `/famiglie` |
| | `localStorage` contains `access_token` and `refresh_token` |
| | Welcome text with family name is visible |

---

## TC-02: Token Persistence

| Field | Value |
|---|---|
| ID | TC-02 |
| Title | Token Persistence Across Page Reload |
| Tags | `@smoke` |
| Precondition | TC-01 completed |
| Steps | 1. Reload the page |
| | 2. Wait for page to load |
| Expected | URL remains `/famiglie` (not redirected to `/login`) |
| | API calls succeed (200) |

---

## TC-03: Famiglie Page Loads

| Field | Value |
|---|---|
| ID | TC-03 |
| Title | Famiglie Page Loads with Data |
| Tags | `@smoke` |
| Precondition | Logged in |
| Steps | 1. Navigate to `/famiglie` |
| Expected | Family name is visible |
| | Project selector (`q-select`) is populated with projects |
| | IBAN and Intestatario fields are displayed |
| | Giustificativi list is visible (may be empty) |

---

## TC-04: Project Selection

| Field | Value |
|---|---|
| ID | TC-04 |
| Title | Project Selection Filters Giustificativi |
| Tags | `@smoke` |
| Precondition | Logged in, family has multiple projects |
| Steps | 1. Select first project from dropdown |
| | 2. Note the giustificativi shown |
| | 3. Select a different project from dropdown |
| Expected | Giustificativi list updates to show items for the selected project only |

---

## TC-05: IBAN Inline Edit

| Field | Value |
|---|---|
| ID | TC-05 |
| Title | IBAN Inline Edit |
| Tags | `@crud` |
| Precondition | Logged in |
| Steps | 1. Click on IBAN display field |
| | 2. Assert text transforms to input |
| | 3. Type a new IBAN value |
| | 4. Press Enter or click save checkmark |
| Expected | IBAN display updates to new value |
| | API call: PATCH `/items/Famiglie/:id` with `{IBAN: "newvalue"}` |
| | Toast notification "Dati aggiornati" |

---

## TC-06: Intestatario CC Inline Edit

| Field | Value |
|---|---|
| ID | TC-06 |
| Title | Intestatario CC Inline Edit |
| Tags | `@crud` |
| Precondition | Logged in |
| Steps | 1. Click on Intestatario_CC display field |
| | 2. Type a new name |
| | 3. Press Enter |
| Expected | Display updates |
| | API call updates `Intestatario_CC` |

---

## TC-07: Add Giustificativo

| Field | Value |
|---|---|
| ID | TC-07 |
| Title | Add New Giustificativo |
| Tags | `@crud` |
| Precondition | Logged in, project selected |
| Steps | 1. Click "Add Giustificativo" button |
| | 2. Fill Descrizione |
| | 3. Fill Importo |
| | 4. Select Data |
| | 5. Select Stato ("draft") |
| | 6. Attach a file (image or PDF) |
| | 7. Click "Save" |
| Expected | New item appears in giustificativi list |
| | Fields display correct values |
| | Toast notification "Giustificativo creato" |

---

## TC-08: Edit Giustificativo Value (Inline)

| Field | Value |
|---|---|
| ID | TC-08 |
| Title | Edit Giustificativo Descrizione/Importo Inline |
| Tags | `@crud` |
| Precondition | Logged in, project has a draft giustificativo |
| Steps | 1. Click on Descrizione text of a draft item |
| | 2. Modify the description |
| | 3. Press Enter |
| | 4. Click on Importo text |
| | 5. Modify the amount |
| | 6. Press Enter |
| Expected | Values update in the list |
| | API call: PATCH `/items/Giustificativi/:id` |

---

## TC-09: Edit Giustificativo Attachment

| Field | Value |
|---|---|
| ID | TC-09 |
| Title | Edit Giustificativo Attachment (Image) |
| Tags | `@crud` |
| Precondition | Logged in, project has a draft giustificativo |
| Steps | 1. Click attachment area of a draft item |
| | 2. Select a new image file |
| | 3. Confirm |
| Expected | New attachment replaces old one |
| | API calls: POST `/files` → PATCH `/items/Giustificativi/:id` |

---

## TC-10: Submit Giustificativo (Invia)

| Field | Value |
|---|---|
| ID | TC-10 |
| Title | Submit Giustificativo Changes Stato to Inviato |
| Tags | `@crud` |
| Precondition | Logged in, project has a draft giustificativo |
| Steps | 1. Click "Invia" button on a draft item |
| | 2. Confirm in dialog |
| Expected | Stato badge changes from "draft" to "Inviato" |
| | Badge color changes (draft=orange, inviato=blue) |
| | Edit controls disappear / become disabled |

---

## TC-11: Cannot Edit Submitted Giustificativo

| Field | Value |
|---|---|
| ID | TC-11 |
| Title | Submitted Giustificativo is Read-Only |
| Tags | `@crud` |
| Precondition | TC-10 completed |
| Steps | 1. Click on Descrizione of the submitted item |
| Expected | No edit input appears |
| | Inline editing is disabled for this item |
| | "Invia" button is hidden |

---

## TC-12: Logout

| Field | Value |
|---|---|
| ID | TC-12 |
| Title | Logout Clears Session |
| Tags | `@smoke` |
| Precondition | Logged in |
| Steps | 1. Click user menu → "Logout" |
| Expected | Redirected to `/login` |
| | localStorage cleared of tokens |
| | Navigating to `/famiglie` redirects back to `/login` |

---

## TC-13: API Failure Handling

| Field | Value |
|---|---|
| ID | TC-13 |
| Title | API Failure Shows Error Notification |
| Tags | `@regression` |
| Precondition | Logged in |
| Steps | 1. Use Playwright route interception to make API return 500 |
| | 2. Trigger an API call (e.g., click select project) |
| Expected | Error notification is displayed |
| | App does not crash (white screen) |
| | User can retry |

---

## TC-14: Mobile Responsiveness

| Field | Value |
|---|---|
| ID | TC-14 |
| Title | Mobile Viewport — All Functionality Accessible |
| Tags | `@mobile` |
| Precondition | Logged in |
| Steps | 1. Set viewport to 375x667 (iPhone SE) |
| | 2. Navigate to `/famiglie` |
| | 3. Perform TC-04, TC-05, TC-08 |
| Expected | Layout adjusts to single-column |
| | All elements visible and tappable |
| | No horizontal scroll |
| | Dropdown, inline editing, buttons all work |
