# Gestione Contatti — Specifiche Funzionali

**Version:** 1.0.0
**Last Updated:** 2026-05-27
**Status:** Final

---

## 1. Overview

La pagina **Gestione Contatti** (`/gestione`) permette ai Gestori Volontari di amministrare volontari, genitori e famiglie senza accedere a Directus admin. È organizzata in tre tab: Volontari, Genitori, Famiglie.

**Ruolo richiesto:** `Gestore Volontari` (o policy equivalente)  
**Visibilità in sidebar:** solo se `canGestione === true`

---

## 2. Ruoli e Permessi

### Struttura ruoli Directus

| Ruolo | Accesso |
|---|---|
| Volontario | `/famiglie` — solo le sue famiglie |
| Verificatore | `/famiglie` + `/verifica` — tutte le famiglie |
| Gestore Volontari | `/famiglie` + `/gestione` — gestione volontari/genitori/famiglie |
| Administrator | Tutto |

### Policy additiva "Verifica"

Un Gestore Volontari che deve anche verificare i giustificativi riceve la **policy Verifica** aggiunta al suo account in Directus admin. Non esiste un ruolo "Gestore + Verificatore" — i ruoli restano 4, i permessi si estendono via policy.

### Getter `canGestione` (auth.store)

```js
canGestione: (state) => {
  // Controlla GESTIONE_ROLE_NAMES e GESTIONE_ROLE_IDS
  // Stesso pattern di canVerifica
}
```

### Aggiornamento AppLayout sidebar

```
├── Famiglie (sempre visibile se autenticato)
├── Verifica (se canVerifica)
└── Gestione (se canGestione)
```

---

## 3. Struttura Pagina

### Route
```
/gestione → GestionePage.vue (requiresAuth + requiredRole: Gestione)
```

### Layout
- **3 tab** orizzontali: Volontari | Genitori | Famiglie
- Ogni tab ha: barra di ricerca + pulsante "Aggiungi" + lista/tabella
- Dialog modale per aggiungere/modificare (stile coerente con il resto del portale)

---

## 4. Tab Volontari

### 4.1 Lista

Tabella con colonne:
- Nome e Cognome
- Email
- Famiglie assegnate (badge con count, espandibile)
- Stato account (Attivo / Disattivato)
- Azioni (Modifica | Famiglie | Disattiva)

Filtri:
- Ricerca testuale per nome/email
- Filtro stato (Tutti / Attivi / Disattivati)

### 4.2 Aggiungere un nuovo volontario

**Trigger:** pulsante "Aggiungi Volontario"

**Dialog — campi:**
- Nome (required)
- Cognome (required)
- Email (required, unique)
- Numero di cellulare (optional)
- Numero di telefono (optional)
- Checkbox "Invia mail di benvenuto" (default: checked)

**Flusso backend:**
1. `POST /users` — crea utente Directus con ruolo Volontario e password temporanea auto-generata
2. `POST /items/contatti` — crea contatto con `user_id` collegato
3. Se checkbox attiva → `POST /auth/password/request` con `reset_url` per forzare reset password al primo accesso
4. Refresh lista

**Password temporanea:** auto-generata (non mostrata all'utente), la mail di invito contiene il link di reset.

### 4.3 Modificare un volontario

**Dialog — campi modificabili:**
- Nome, Cognome
- Numero di cellulare, Numero di telefono
- (Email non modificabile per evitare problemi di accesso — solo da Directus admin)

**Flusso backend:**
- `PATCH /items/contatti/{id}` — aggiorna i campi

### 4.4 Gestione famiglie assegnate

**Dialog "Famiglie di [Nome]":**
- Lista famiglie attualmente assegnate (con pulsante Rimuovi per ognuna)
- Dropdown per aggiungere una nuova famiglia (cerca per nome)
- Alla selezione: `POST /items/Famiglie_Contatti` con `{Famiglia: id, Contatto: id, Ruolo_nella_Famiglia: "Volontario"}`
- Rimozione: `DELETE /items/Famiglie_Contatti/{id}`

### 4.5 Disattivare un account

- Conferma dialog "Disattivare l'account di [Nome]?"
- `PATCH /users/{id}` con `{status: "suspended"}`
- Il contatto rimane in `contatti`, le associazioni familiari restano
- Badge stato diventa "Disattivato" nella lista
- Riattivazione: stesso flusso con `{status: "active"}`

---

## 5. Tab Genitori

### 5.1 Lista

Tabella con colonne:
- Nome e Cognome
- Email
- Cellulare
- Famiglie assegnate (badge count)
- Account volontario (Sì / No)
- Azioni (Modifica | Famiglie | Promuovi a Volontario)

Filtri:
- Ricerca testuale per nome/email

### 5.2 Aggiungere un nuovo genitore

**Dialog — campi:**
- Nome (required)
- Cognome (required)
- Email (optional)
- Numero di cellulare (optional)
- Numero di telefono (optional)

**Flusso backend:**
1. `POST /items/contatti` — crea contatto senza `user_id`
2. Refresh lista

### 5.3 Modificare un genitore

Stesso pattern del volontario — `PATCH /items/contatti/{id}`.

### 5.4 Gestione famiglie assegnate

Stesso pattern del volontario ma con `Ruolo_nella_Famiglia: "Genitore"`.

### 5.5 Promuovere un genitore a volontario

**Trigger:** pulsante "Promuovi a Volontario" sulla riga

**Dialog di conferma:**
- Mostra nome, cognome, email del genitore
- Checkbox "Invia mail di benvenuto" (default: checked)
- Pulsante "Promuovi"

**Flusso backend:**
1. `POST /users` — crea utente Directus con ruolo Volontario e password temporanea
2. `PATCH /items/contatti/{id}` — aggiunge `user_id` all'esistente contatto
3. Se checkbox attiva → `POST /auth/password/request` con `reset_url`
4. Il contatto ora appare in entrambe le tab (Volontari e Genitori) se ha ancora associazioni come Genitore
5. Refresh lista

**Nota:** il contatto non viene duplicato. Lo stesso record `contatti` acquisisce un `user_id`. Le sue associazioni come Genitore in `Famiglie_Contatti` restano invariate.

---

## 6. Tab Famiglie

### 6.1 Lista

Tabella con colonne:
- Nome Famiglia
- IBAN (troncato, es. IT60...1234)
- Intestatario CC
- Volontari assegnati (badge count)
- Genitori assegnati (badge count)
- Progetti (badge count)
- Azioni (Modifica | Contatti)

Filtri:
- Ricerca testuale per nome famiglia

### 6.2 Creare una nuova famiglia

**Dialog — campi:**
- Nome Famiglia (required)
- IBAN (optional)
- Intestatario CC (optional)

**Flusso backend:**
1. `POST /items/Famiglie` — crea famiglia
2. Refresh lista

### 6.3 Modificare una famiglia

**Dialog — campi modificabili:**
- Nome Famiglia
- IBAN
- Intestatario CC

**Flusso backend:**
- `PATCH /items/Famiglie/{id}`

### 6.4 Gestione contatti della famiglia

**Dialog "Contatti di [Nome Famiglia]":**

Due sezioni:

**Volontari assegnati:**
- Lista volontari con pulsante Rimuovi
- Dropdown per aggiungere (cerca per nome tra i volontari esistenti)
- `POST /items/Famiglie_Contatti` con `Ruolo_nella_Famiglia: "Volontario"`

**Genitori assegnati:**
- Lista genitori con pulsante Rimuovi
- Dropdown per aggiungere (cerca per nome tra tutti i contatti)
- `POST /items/Famiglie_Contatti` con `Ruolo_nella_Famiglia: "Genitore"`

---

## 7. Mail di Invito

### Trigger
- Creazione nuovo volontario (se checkbox attiva)
- Promozione genitore a volontario (se checkbox attiva)
- Pulsante "Reinvia invito" sulla riga del volontario (sempre disponibile)

### Meccanismo
Directus gestisce l'invio via `POST /auth/password/request` con `reset_url`:

```json
{
  "email": "volontario@example.com",
  "reset_url": "https://volontari.sostienilsostegno.com/reset-password"
}
```

Il volontario riceve una mail con il link per impostare la propria password. Non viene mai mostrata o trasmessa una password in chiaro.

### Testo mail
Gestito dal template email di Directus (configurabile in Settings → Email Templates).

---

## 8. Gestione Store (`src/stores/gestione.store.js`)

### State Shape

```js
state: () => ({
  volontari: [],          // Contatti con user_id valorizzato
  genitori: [],           // Contatti senza user_id (o con ruolo Genitore)
  famiglie: [],           // Tutte le famiglie
  loading: false,
  saving: false,
  error: null
})
```

### Actions principali

```js
actions: {
  async fetchAll(),                          // Carica volontari + genitori + famiglie in parallelo
  async createVolontario(data, sendMail),    // Crea utente + contatto + opzionale invio mail
  async updateContatto(id, data),            // PATCH contatto
  async disableUser(userId),                 // PATCH user status: suspended
  async enableUser(userId),                  // PATCH user status: active
  async promoteToVolontario(contattoId, sendMail), // Crea user + collega contatto
  async createGenitore(data),               // POST contatto senza user
  async createFamiglia(data),               // POST famiglia
  async updateFamiglia(id, data),           // PATCH famiglia
  async assignToFamiglia(contattoId, famigliaId, ruolo), // POST Famiglie_Contatti
  async removeFromFamiglia(famiglie_contattiId),          // DELETE Famiglie_Contatti
  async sendInvite(email),                  // POST /auth/password/request
}
```

---

## 9. Nuovi Endpoint API

| Method | Path | Scopo |
|---|---|---|
| GET | `/items/contatti?filter[user_id][_nnull]=true` | Lista volontari (contatti con account) |
| GET | `/items/contatti?filter[user_id][_null]=true` | Lista genitori puri (senza account) |
| POST | `/users` | Crea utente Directus |
| PATCH | `/users/{id}` | Modifica stato utente (suspend/active) |
| DELETE | `/items/Famiglie_Contatti/{id}` | Rimuove associazione famiglia-contatto |
| POST | `/items/Famiglie` | Crea nuova famiglia |

---

## 10. Permessi Directus — Ruolo Gestore Volontari

Il ruolo Gestore Volontari deve avere accesso in lettura/scrittura a:

| Collection | Permessi | Note |
|---|---|---|
| `contatti` | CRUD | Gestione anagrafica |
| `Famiglie` | CRUD | Creazione e modifica famiglie |
| `Famiglie_Contatti` | CRUD | Gestione associazioni |
| `directus_users` | Create + Read + Edit (status) | Solo campi necessari, non password altrui |
| `directus_roles` | Read | Per assegnare ruolo Volontario |
| `Progetti` | Read | Per visualizzare progetti nelle famiglie |

---

## 11. Componenti

| Componente | Descrizione |
|---|---|
| `GestionePage.vue` | Pagina principale con 3 tab |
| `VolontariTab.vue` | Tab gestione volontari |
| `GenitoriTab.vue` | Tab gestione genitori |
| `FamiglieTab.vue` | Tab gestione famiglie |
| `VolontarioDialog.vue` | Dialog crea/modifica volontario |
| `GenitoreDialog.vue` | Dialog crea/modifica genitore |
| `FamigliaDialog.vue` | Dialog crea/modifica famiglia |
| `AssegnaFamigliaDialog.vue` | Dialog gestione famiglie di un contatto |
| `ContattiDialog.vue` | Dialog gestione contatti di una famiglia |
| `PromoteDialog.vue` | Dialog promozione genitore a volontario |

---

## 12. Casi Edge

| Caso | Comportamento |
|---|---|
| Email già esistente in Directus | Errore "Email già in uso" al momento della creazione |
| Genitore promosso: email mancante | Blocca la promozione, richiede email prima di procedere |
| Volontario disattivato assegnato a famiglia | L'associazione resta, ma il login è bloccato |
| Rimozione volontario da famiglia con giustificativi attivi | Warning "Questo volontario ha giustificativi in corso", conferma richiesta |
| Famiglia senza IBAN assegnata a progetto | Permesso, ma badge "Dati bancari mancanti" visibile in VerificaPage |

