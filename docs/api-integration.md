# API Integration Document

**Version:** 2.1.0
**Last Updated:** 2026-05-26
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — added email table endpoints, 403 resolution notes |
| 2026-05-25 | 2.0.0 | System | Final — added Verifica/Rendicontazione endpoints, refresh token interceptor, cache-buster, role resolution |

---

## 1. Base URL

```
Production: https://app.sostienilsostegno.com
Development: http://localhost:9000 → proxy → https://app.sostienilsostegno.com
```

---

## 2. Authentication Endpoints

| Method | Path | Service | Purpose |
|---|---|---|---|
| POST | `/auth/login` | `auth.service.login()` | Authenticate user, get tokens |
| POST | `/auth/refresh` | `auth.service.refresh()` | Refresh access token |
| POST | `/auth/logout` | `auth.service.logout()` | Invalidate refresh token |
| POST | `/auth/password/request` | `auth.service.requestReset()` | Request password reset email |
| POST | `/auth/password/reset` | `auth.service.resetPassword()` | Reset password with token |
| PATCH | `/users/me` | `auth.service.changePassword()` | Change current user password |
| GET | `/roles/:id` | `auth.service.getRole()` | Get role name by ID (for permission resolution) |

### Auth Response Shape

```json
{
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "expires": 900000
  }
}
```

---

## 3. Data Endpoints

### 3.1 Users & Contacts

| Method | Path | Service | Params |
|---|---|---|---|
| GET | `/users/me` | `auth.service.getMe()` | `fields=id,email,first_name,last_name,role,role.*` |
| GET | `/items/contatti` | `contatti.service.getByUserId(id)` | `filter[user_id][_eq]={id}` |
| PATCH | `/items/contatti/{id}` | `contatti.service.update(id, data)` | — |

### 3.2 Families

| Method | Path | Service | Params |
|---|---|---|---|
| GET | `/items/Famiglie_Contatti` | `famiglie.service.getFamiglieByVolontario(contattoId)` | `filter[Ruolo_nella_Famiglia][_eq]=Volontario&filter[Contatto][_eq]={id}` |
| GET | `/items/Famiglie_Contatti` | `famiglie.service.getGenitoriByFamiglia(famigliaId)` | `filter[Famiglia][_eq]={famigliaId}&filter[Ruolo_nella_Famiglia][_eq]=Genitore&fields=id,Contatto.*` |
| GET | `/items/Famiglie/{id}` | `famiglie.service.getById(id)` | `fields=id_famiglia,Nome_Famiglia,Progetti.*,IBAN,Intestatario_CC` |
| PATCH | `/items/Famiglie/{id}` | `famiglie.service.update(id, data)` | Body: `{IBAN, Intestatario_CC}` |
| GET | `/items/email` | `famiglie.service.getEmailByContatto(contattoIds)` | `filter[Contatto_Relation][_in]={ids}&filter[Primary][_eq]=true` |

### 3.3 Projects

| Method | Path | Service | Params |
|---|---|---|---|
| GET | `/items/Progetti/{id}` | `progetti.service.getById(id)` | — |
| GET | `/items/Progetti` | `verifica.service.getProgetti()` | `limit=-1, sort=Famiglia,AnnoBando,Cognome_e__Nome_Beneficiario, fields=...Famiglia.*` |

Projects are also fetched inline with the family via the `fields` parameter (Progetti.*).

### 3.4 Giustificativi

| Method | Path | Service | Params |
|---|---|---|---|
| GET | `/items/Giustificativi` | `giustificativi.service.getByProgetto(progettoId)` | `filter[Progetto][_eq]={id}&fields=*,Rendicontazione.*` |
| GET | `/items/Giustificativi` | `verifica.service.getGiustificativi()` | `limit=-1, sort=Data, fields=*,Rendicontazione.*` |
| POST | `/items/Giustificativi` | `giustificativi.service.create(data)` | Body: full giustificativo |
| PATCH | `/items/Giustificativi/{id}` | `giustificativi.service.update(id, data)` | Body: fields to update |
| PATCH | `/items/Giustificativi/{id}` | `giustificativi.service.submit(id)` | Body: `{Stato: "Inviato"}` |
| PATCH | `/items/Giustificativi/{id}` | `giustificativi.service.invalidate(id)` | Body: `{Invalidato: true}` |
| PATCH | `/items/Giustificativi/{id}` | `giustificativi.service.verify(id)` | Body: `{Stato: "Verificato"}` |
| PATCH | `/items/Giustificativi/{id}` | `giustificativi.service.reject(id, nota)` | Body: `{Stato: "Rifiutato", NotaRifiuto: "..."}` |
| PATCH | `/items/Giustificativi/{id}` | `giustificativi.service.update(id, data)` | Usato per inline edit: `{Descrizione, Importo, Data}` |

**Campi Directus aggiunti alla tabella `Giustificativi`:**
| Campo | Type | Descrizione |
|---|---|---|
| `NotaRifiuto` | text (nullable) | Nota inserita dal verificatore quando rifiuta il giustificativo |
| `NotaVolontario` | text (nullable) | Nota opzionale inserita dal volontario durante la creazione |

### 3.5 Files

| Method | Path | Service | Notes |
|---|---|---|---|
| POST | `/files` | `files.service.upload(file, folder)` | Multipart FormData |
| PATCH | `/files/{id}` | `files.service.updateMeta(id, meta)` | Update title, filename_download, folder |
| GET | `/assets/{id}` | Direct URL | Serve file (with `?access_token=` and optional `?download=1`) |

File folder UUID for giustificativi: `91a9c958-206f-4e1c-8143-e67f85398d0c`

**File rename conventions:**
| Event | Action | Prefix |
|---|---|---|
| File sostituito (cambia file) | `filesService.updateMeta(fileId, { title })` | `OBSOLETE_<data>_<nuovo_filename>` |
| Giustificativo rifiutato | `filesService.updateMeta(fileId, { title })` | `RIFIUTATO_<data>` |

### 3.6 Rendicontazioni

| Method | Path | Service | Params |
|---|---|---|---|
| GET | `/items/Rendicontazioni` | `rendicontazioni.service.findByProjectAndTranche()` | `filter[Famiglia][_eq]={id}&filter[Progetto][_eq]={id}&filter[Tranche][_eq]={tranche}` |
| POST | `/items/Rendicontazioni` | `rendicontazioni.service.create(data)` | Body: `{Famiglia, Progetto, AnnoBando, Tranche, Stato, Data_Ricezione}` |

---

## 4. Request/Response Formats

### GET Request Example
```
GET /items/Giustificativi?filter[Progetto][_eq]=proj-123&_t=1748123456789
Headers:
  Authorization: Bearer eyJhbGciOi...
```

Note: GET requests automatically include a `_t` cache-buster timestamp.

### POST Request Example (JSON)
```json
POST /items/Giustificativi
Headers:
  Authorization: Bearer eyJhbGciOi...
  Content-Type: application/json
Body:
{
  "Progetto": "proj-123",
  "Descrizione": "Spese materiale scolastico",
  "Importo": 150.00,
  "Data": "2026-05-20",
  "Stato": "draft",
  "Allegato": "uuid-of-file"
}
```

### PATCH Request Example
```json
PATCH /items/Famiglie/fam-456
Headers:
  Authorization: Bearer eyJhbGciOi...
Body:
{
  "IBAN": "IT60X0542811101000000123456",
  "Intestatario_CC": "Mario Rossi"
}
```

### Standard Error Response
```json
{
  "errors": [
    {
      "message": "Validation failed",
      "extensions": {
        "code": "VALIDATION_ERROR",
        "field": "Importo"
      }
    }
  ]
}
```

---

## 5. Error Handling Strategy

| HTTP Status | Meaning | Frontend Action |
|---|---|---|
| 200 | Success | Parse data |
| 204 | Success (no content) | Treat as success |
| 401 | Unauthorized | **Axios interceptor**: attempt token refresh via `/auth/refresh`; if success, retry original request; if fail, `clearSessionAndRedirectToLogin()` |
| 403 | Forbidden | Show "access denied" notification |
| 404 | Not found | Show "resource not found" |
| 422 | Validation error | Show field-level validation messages |
| 429 | Rate limited | Wait and retry with backoff |
| 5xx | Server error | Show generic "server error" notification |

All errors are caught by the Axios response interceptor in `src/services/api.js`. The interceptor:
1. Detects invalid token errors (status 401, "token invalid", "jwt", "invalid_payload", etc.)
2. Sets `_retry` flag to avoid infinite loops
3. Creates a **fresh axios instance** (not the `api` instance) to POST `/auth/refresh`
4. On success: stores new token, retries original request with updated Authorization header
5. On failure: calls `clearSessionAndRedirectToLogin()` which wipes localStorage and navigates to `/login`

---

## 6. CORS Configuration

Directus CORS must allow:
- `https://volontari.sostienilsostegno.com` (production)
- `http://localhost:9000` (development)

```
CORS_ENABLED=true
CORS_ORIGIN=https://volontari.sostienilsostegno.com,http://localhost:9000
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PATCH,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization
```

---

## 7. Axios Instance Configuration

```js
const api = axios.create({
  baseURL: 'https://app.sostienilsostegno.com',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})
```

### Request Interceptor
- Attaches `Authorization: Bearer <token>` from localStorage
- Adds `_t=${Date.now()}` cache-buster param to GET requests
