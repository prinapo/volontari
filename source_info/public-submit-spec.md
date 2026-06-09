# Form Pubblico Senza Login — Specifiche Funzionali

**Version:** 1.0.0
**Last Updated:** 2026-05-28
**Status:** Final

---

## 1. Overview

Un form pubblico accessibile senza autenticazione permette a famiglie senza volontario di inviare giustificativi. Le submission vengono riconciliate automaticamente se i dati corrispondono, altrimenti finiscono in una coda di riconciliazione manuale gestita dal verificatore.

---

## 2. Nuova Collection Directus: `InviiGiustificativiNoLogin`

| Campo | Tipo | Note |
|---|---|---|
| `id` | PK auto | — |
| `email` | string | Email del mittente |
| `iban` | string | IBAN dichiarato |
| `intestatario` | string | Intestatario CC dichiarato |
| `nome_richiedente` | string | Nome del genitore/richiedente |
| `cognome_richiedente` | string | Cognome del genitore/richiedente |
| `nome_beneficiario` | string | Nome del beneficiario del progetto |
| `cognome_beneficiario` | string | Cognome del beneficiario |
| `descrizione` | string | Descrizione del giustificativo |
| `importo` | decimal | Importo in euro |
| `data` | date | Data del giustificativo |
| `allegato` | file (FK directus_files) | File caricato |
| `stato` | enum | `in_attesa` / `riconciliato` / `scartato` |
| `famiglia_riconciliata` | FK → Famiglie (nullable) | Compilato dopo riconciliazione |
| `progetto_riconciliato` | FK → Progetti (nullable) | Compilato dopo riconciliazione |
| `giustificativo_creato` | FK → Giustificativi (nullable) | Creato dopo riconciliazione |
| `data_invio` | datetime | Timestamp invio form |
| `note_riconciliazione` | text (nullable) | Note del verificatore |

---

## 3. Route Pubblica

```
/submit → SubmitPage.vue (public: true, no auth required)
```

Accessibile senza login. Non appare nella sidebar. Da aggiungere in `src/router/index.js` con `meta: { public: true }`.

---

## 4. Form Pubblico (SubmitPage.vue)

### 4.1 Campi

**Sezione "Chi sei":**
- Nome richiedente (required)
- Cognome richiedente (required)
- Email (required)
- IBAN (required)
- Intestatario CC (required)

**Sezione "Beneficiario":**
- Nome beneficiario (required)
- Cognome beneficiario (required)

**Sezione "Giustificativo":**
- Descrizione (required)
- Importo (required, numeric)
- Data (required, date picker)
- Allegato (required, PDF/JPG/PNG max 5MB — riutilizzare `FileUploader.vue`)

### 4.2 Flusso Submit

1. Upload allegato → `POST /files` (accesso pubblico, folder dedicata)
2. `POST /items/InviiGiustificativiNoLogin` con tutti i campi + `stato: "in_attesa"` + `data_invio: now()`
3. Tentativo riconciliazione automatica (vedi sezione 5)
4. Mostra messaggio di conferma: "Grazie! Il tuo giustificativo è stato ricevuto. Verrà verificato al più presto."
5. Form si resetta per permettere invii multipli

### 4.3 UX

- Design semplice e mobile-friendly, coerente con il portale
- Nessun login richiesto
- Validazione client-side su tutti i campi required
- Loading state durante l'upload e il submit
- Messaggio di errore generico in caso di fallimento API

---

## 5. Coda di Riconciliazione in VerificaPage

### 6.1 Nuova tab "Da riconciliare"

Aggiungere tab **"Da riconciliare"** in VerificaPage, visibile solo se `canVerifica`.

Badge sul tab con count delle submission `in_attesa`:
```js
// verifica.store.js
submissionsInAttesa: []   // GET /items/InviiGiustificativiNoLogin?filter[stato][_eq]=in_attesa
```

### 6.2 Tabella submission in attesa

| Colonna | Contenuto |
|---|---|
| Data invio | Timestamp formattato |
| Richiedente | Nome + Cognome + Email |
| Beneficiario | Nome + Cognome |
| IBAN dichiarato | Troncato (es. IT60...1234) |
| Importo | € X,XX |
| Allegato | Link Apri / Scarica |
| Azioni | Riconcilia / Scarta |

### 6.3 Dialog "Riconcilia"

- Mostra riepilogo completo della submission (tutti i campi)
- Dropdown **Seleziona Famiglia** (ricerca per nome, mostra IBAN attuale per confronto visivo)
- Dropdown **Seleziona Progetto** (filtrato per famiglia selezionata)
- Campo note (opzionale)
- Pulsante "Crea giustificativo"

**Flusso:**
1. Verificatore seleziona famiglia e progetto
2. Sistema crea `Giustificativo` con dati submission (stato `draft`)
3. `PATCH InviiGiustificativiNoLogin/{id}`: `stato: "riconciliato"` + FK compilate
4. Submission sparisce dalla coda

### 6.4 Dialog "Scarta"

- Campo note obbligatorio (motivo dello scarto)
- `PATCH /items/InviiGiustificativiNoLogin/{id}`: `stato: "scartato"` + `note_riconciliazione`
- La submission sparisce dalla coda ma resta nel database per audit trail

---

## 7. Accesso Pubblico alle API Directus

Il form pubblico non ha un token utente. Configurare il ruolo **Public** di Directus con permessi minimi:
- `CREATE` su `InviiGiustificativiNoLogin`
- `CREATE` su `directus_files` (limitato alla folder dedicata)

Il ruolo Public di Directus è pensato esattamente per questo caso d'uso.

**Folder dedicata per allegati form pubblico:** da creare in Directus Files, UUID da aggiungere come costante in `SubmitPage.vue`.

---

## 8. Nuovi Endpoint API

| Method | Path | Scopo |
|---|---|---|
| POST | `/items/InviiGiustificativiNoLogin` | Crea submission (pubblico) |
| GET | `/items/InviiGiustificativiNoLogin?filter[stato][_eq]=in_attesa` | Lista coda riconciliazione |
| PATCH | `/items/InviiGiustificativiNoLogin/{id}` | Aggiorna stato riconciliazione |
| POST | `/files` | Upload allegato (pubblico, folder dedicata) |
| GET | `/items/Famiglie?filter[IBAN][_eq]=...` | Match automatico per IBAN |
| GET | `/items/Progetti?filter[Famiglia][_eq]=...&filter[Cognome_e__Nome_Beneficiario][_contains]=...` | Match automatico per beneficiario |

---

## 9. Nuovi Componenti

| Componente | Descrizione |
|---|---|
| `SubmitPage.vue` | Form pubblico senza login |
| `RiconciliazioneTab.vue` | Tab coda riconciliazione in VerificaPage |
| `RiconciliaDialog.vue` | Dialog selezione famiglia/progetto per riconciliazione manuale |

---

## 10. Modifiche ai File Esistenti

| File | Modifica |
|---|---|
| `src/router/index.js` | Aggiungere route `/submit` con `meta: { public: true }` |
| `src/pages/VerificaPage.vue` | Aggiungere tab "Da riconciliare" con badge count |
| `src/stores/verifica.store.js` | Aggiungere `submissionsInAttesa[]`, `fetchSubmissionsInAttesa()`, `reconcileSubmission()`, `scartaSubmission()` |

---

## 11. Note Implementative

- Il giustificativo creato da riconciliazione (automatica o manuale) nasce in stato `draft` — il verificatore può modificarlo prima di verificarlo
- Le submission `scartate` restano nel database per audit trail, non vengono mai cancellate
- La riconciliazione automatica usa matching case-insensitive con trim per robustezza su typo minori
- Se in futuro si aggiunge un form di presentazione progetto, la collection `InviiGiustificativiNoLogin` rimane separata e distinta

