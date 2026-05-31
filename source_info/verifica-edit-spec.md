# Miglioramenti VerificaPage e FamigliePage — Specifiche Funzionali

**Version:** 1.0.0
**Last Updated:** 2026-05-28
**Status:** Final

---

## 1. Modifica Campi da Verificatore (VE-EDIT)

### 1.1 Overview

Il verificatore può modificare inline i campi di un giustificativo direttamente dalla VerificaPage, senza doverlo rimandare al volontario per correzioni materiali (es. importo digitato male).

### 1.2 Comportamento

Nella riga espansa di VerificaPage, per ogni giustificativo in stato `Inviato`, i seguenti campi diventano editabili inline con lo stesso pattern `InlineEditableField` già usato in FamigliePage:

| Campo | Tipo | Note |
|---|---|---|
| `Importo` | number | Formato € X,XX |
| `Descrizione` | text | Testo libero |
| `Data` | date | Formato DD/MM/YYYY |

**Regole:**
- Editabili solo se stato = `Inviato` (non su `Verificato` o `Rifiutato`)
- Solo utenti con `canVerifica === true` vedono i campi come editabili
- Volontari vedono sempre i campi in sola lettura
- Salvataggio via `PATCH /items/Giustificativi/{id}` già esistente
- Dopo il salvataggio i totali di riga si ricalcolano localmente via `recalculateRowTotals()`

### 1.3 UX

- Click sul campo → entra in edit mode con `InlineEditableField`
- ✓ salva → PATCH + aggiorna stato locale
- ✗ annulla → torna al valore precedente
- Loading spinner sul campo durante il salvataggio
- I pulsanti Verifica/Rifiuta restano visibili e funzionanti durante l'editing

### 1.4 Modifiche ai componenti esistenti

**VerificaPage.vue** — nella slot `#body` della riga espansa:
- Sostituire testo statico di Importo, Descrizione, Data con `InlineEditableField`
- Prop `readonly` condizionale: `!canVerifica || item.Stato !== 'Inviato'`

**verifica.store.js** — aggiungere action:
```js
async updateGiustificativoField(progettoId, giustId, field, value) {
  // PATCH /items/Giustificativi/{id} { [field]: value }
  // update local state
  // recalculateRowTotals(progettoId)
}
```

---

## 2. Verificatore Aggiunge Giustificativi per una Famiglia (VE-ADD)

### 2.1 Overview

Il verificatore può aggiungere giustificativi direttamente su qualsiasi famiglia dalla VerificaPage. Utile per famiglie senza volontario o in casi di emergenza dove la famiglia invia i documenti via mail.

### 2.2 Comportamento

Nella colonna Actions di ogni riga famiglia/progetto in VerificaPage, aggiungere un pulsante **"Aggiungi giustificativo"** (icona `add_circle`, colore secondary).

Il pulsante apre il `GiustificativoForm` già esistente, pre-compilato con:
- `progettoId` dalla riga selezionata
- `famigliaId` dalla riga selezionata
- `annoBando` dalla riga selezionata

La logica di creazione è identica a quella di FamigliePage — stesso store action `giustificativi.store.createGiustificativo()`, stessa `ensureRendicontazione()`.

Dopo la creazione, `verifica.store.fetchAll()` aggiorna la tabella.

### 2.3 Modifiche ai componenti esistenti

**VerificaPage.vue:**
- Aggiungere pulsante "Aggiungi giustificativo" nella colonna Actions
- Aggiungere stato locale `addingForRow: null` per tracciare quale riga ha il dialog aperto
- Riutilizzare `GiustificativoForm` già esistente

**Nota:** il giustificativo creato dal verificatore nasce sempre in stato `draft`, modificabile prima di verificarlo.

---

## 3. Referenti Famiglia nella Vista Volontario (FAM-CONTACTS)

### 3.1 Overview

Nella FamigliePage, sotto il nome della famiglia, aggiungere una sezione che mostra i **altri volontari assegnati alla stessa famiglia**, in modo che ogni volontario sappia con chi collabora.

### 3.2 Comportamento

Nella `FamigliaInfoCard.vue`, dopo la sezione genitori, aggiungere una sezione **"Volontari"** che mostra gli altri volontari assegnati alla famiglia (escluso l'utente corrente).

**Dati mostrati per ogni volontario:**
- Nome e Cognome
- Email (link `mailto:`)
- Cellulare (link `tel:`, se presente)

**Logica di fetch:**
- I volontari sono già parzialmente disponibili tramite `Famiglie_Contatti` con `Ruolo_nella_Famiglia === "Volontario"`
- Estendere `famiglie.store.loadGenitori()` (o creare `loadVolontari()`) per caricare anche i contatti con ruolo Volontario
- Escludere dalla lista il contatto dell'utente corrente (`authStore.contattoId`)

### 3.3 API

```
GET /items/Famiglie_Contatti
  ?filter[Famiglia][_eq]={famigliaId}
  &filter[Ruolo_nella_Famiglia][_eq]=Volontario
  &fields=id,Contatto.*
```

Poi batch fetch email:
```
GET /items/email
  ?filter[Contatto_Relation][_in]={ids}
  &filter[Primary][_eq]=true
```

Stesso pattern già usato per i genitori.

### 3.4 Modifiche ai componenti esistenti

**famiglie.store.js** — aggiungere:
```js
state: {
  altriVolontari: []   // Volontari della famiglia escluso l'utente corrente
}

async loadVolontari(famigliaId) {
  // GET Famiglie_Contatti (ruolo Volontario)
  // Escludi contattoId corrente
  // Batch fetch email
  // Merge in altriVolontari[]
}
```

**FamigliaInfoCard.vue:**
- Aggiungere sezione "Volontari" dopo la sezione "Genitori"
- Stessa struttura grafica della sezione genitori (nome, mailto, tel)
- Sezione visibile solo se `altriVolontari.length > 0`
- Label sezione: "Altri volontari" (per distinguere da "Genitori")

---

## 4. Riepilogo Modifiche File

| File | Modifica |
|---|---|
| `src/pages/VerificaPage.vue` | VE-EDIT: InlineEditableField su campi giustificativo; VE-ADD: pulsante aggiungi + GiustificativoForm |
| `src/stores/verifica.store.js` | VE-EDIT: action `updateGiustificativoField()` |
| `src/stores/famiglie.store.js` | FAM-CONTACTS: state `altriVolontari[]` + action `loadVolontari()` |
| `src/components/FamigliaInfoCard.vue` | FAM-CONTACTS: sezione "Altri volontari" |

