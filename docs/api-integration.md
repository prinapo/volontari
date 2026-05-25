# API Integration Document

**Version:** 1.1.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — added email table endpoints, 403 resolution notes |

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
| GET | `/users/me` | `auth.service.getMe()` | — |
| GET | `/items/contatti` | `contatti.service.getByUserId(id)` | `filter[user_id][_eq]={id}` |
| PATCH | `/items/contatti/{id}` | `contatti.service.update(id, data)` | — |

### 3.2 Families

| Method | Path | Service | Params |
|---|---|---|---|
| GET | `/items/Famiglie_Contatti` | `famiglie.service.getFamiglieByVolontario(contattoId)` | `filter[Ruolo_nella_Famiglia][_eq]=Volontario&filter[Contatto][_eq]={id}` |
| GET | `/items/Famiglie/{id}` | `famiglie.service.getById(id)` | `fields=id_famiglia,Nome_Famiglia,Progetti.*,IBAN,Intestatario_CC` |
| PATCH | `/items/Famiglie/{id}` | `famiglie.service.update(id, data)` | Body: `{IBAN, Intestatario_CC}` |

### 3.3 Projects

Projects are fetched inline with the family via the `fields` parameter (Progetti.*)

### 3.4 Giustificativi

| Method | Path | Service | Params |
|---|---|---|---|
| GET | `/items/Giustificativi` | `giustificativi.service.getByProgetto(progettoId)` | `filter[Progetto][_eq]={id}` |
| POST | `/items/Giustificativi` | `giustificativi.service.create(data)` | Body: full giustificativo |
| PATCH | `/items/Giustificativi/{id}` | `giustificativi.service.update(id, data)` | Body: fields to update |
| PATCH | `/items/Giustificativi/{id}` | `giustificativi.service.submit(id)` | Body: `{Stato: "Inviato"}` |

### 3.5 Files

| Method | Path | Service | Notes |
|---|---|---|---|
| POST | `/files` | `files.service.upload(file)` | Multipart FormData |
| PATCH | `/files/{id}` | `files.service.updateMeta(id, meta)` | Update title, filename_download, folder |
| GET | `/files/{id}` | Direct URL | Access file via Directus |

### 3.6 Admin Endpoints (Migrazione)

| Method | Path | Service | Notes |
|---|---|---|---|
| GET | `/roles` | `admin.service.getVolontarioRole()` | Filter by name "Volontario" |
| POST | `/users` | `admin.service.createUser(data)` | Requires admin role |
| GET | `/items/email` | `admin.service.getEmailContatti()` | `limit=-1` for all |
| GET | `/items/Famiglie_Contatti` | `admin.service.getVolontari()` | With fields for Contatto.* |

---

## 4. Request/Response Formats

### GET Request Example
```
GET /items/Giustificativi?filter[Progetto][_eq]=proj-123
Headers:
  Authorization: Bearer eyJhbGciOi...
```

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

### POST Request Example (File Upload)
```
POST /files
Headers:
  Authorization: Bearer eyJhbGciOi...
Content-Type: multipart/form-data

Body (FormData):
  file: (binary file data)
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
| 401 | Unauthorized | Attempt token refresh; if fails, redirect to login |
| 403 | Forbidden | Show "access denied" notification |
| 404 | Not found | Show "resource not found" |
| 422 | Validation error | Show field-level validation messages |
| 429 | Rate limited | Wait and retry with backoff |
| 5xx | Server error | Show generic "server error" notification |

All errors are caught by the Axios response interceptor in `src/boot/axios.js`.

---

## 6. CORS Configuration

Directus CORS must allow:
- `https://volontari.sostienilsostegno.com` (production)
- `http://localhost:9000` (development)

---

## 7. Axios Instance Configuration

```js
const api = axios.create({
  baseURL: 'https://app.sostienilsostegno.com',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})
```
