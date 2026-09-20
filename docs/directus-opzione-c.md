# Directus — modifiche Opzione C (stati pagamento giustificativi)

Istruzioni per applicare **da interfaccia grafica Directus** le modifiche necessarie
alla release **4.0.8**. Su **dev sono già applicate**; queste istruzioni servono per
**produzione** (e per riprodurre dev da zero).

> Applicare lo **schema** (sezione 1) e la **migrazione dati** (sezione 2) **prima**
> di deployare il frontend 4.0.8: l'app scrive i nuovi campi e i nuovi stati.
> Non sono necessarie modifiche ai ruoli/permessi (sezione 3).

---

## 1. Schema — Collezione `Giustificativi`

### 1a. Nuovo campo `Pagamento` (Many to One → `Pagamenti`)

1. Impostazioni → Data Model → collezione **`Giustificativi`**.
2. **Create Field** → seleziona **Many to One**.
3. Compila:
   - **Key**: `Pagamento`
   - **Related Collection**: `Pagamenti`
   - **On Delete**: `Set Null` (importante: cancellando un pagamento il riferimento si azzera)
   - **Type**: `Integer` (precompilato)
4. In **Advanced / Field options**:
   - **Interface**: `Select Dropdown (M2O)`
   - **Display**: `Related Values`
   - **Template**: `{{id}}`
   - **Width**: `Half`
5. **Save**.

### 1b. Nuovo campo `DataVerifica` (datetime)

1. Data Model → `Giustificativi` → **Create Field** → **Timestamp** (o `DateTime`).
2. Compila:
   - **Key**: `DataVerifica`
   - **Interface**: `Datetime`
   - **Width**: `Half`
   - **Required**: no
3. **Save**.

### 1c. Nuovo campo `DataPagamento` (datetime)

Ripeti come 1b con **Key**: `DataPagamento`.

### 1d. Aggiorna le scelte di `Stato`

1. Data Model → `Giustificativi` → campo **`Stato`**.
2. Interface: **Select Dropdown** (`select-dropdown`).
3. **Choices** (sostituisci quelle esistenti e disabilita "Allow Other"):
   | Text         | Value          |
   | ------------ | -------------- |
   | Bozza        | `draft`        |
   | Inviato      | `inviato`      |
   | Verificato   | `verificato`   |
   | Rifiutato    | `rifiutato`    |
   | In pagamento | `in_pagamento` |
   | Pagato       | `pagato`       |
4. **Allow Other**: **off**.
5. **Save**.

---

## 2. Schema + dati — Collezione `InviiGiustificativiNoLogin`

### 2a. Aggiorna le scelte di `stato`

1. Data Model → `InviiGiustificativiNoLogin` → campo **`stato`**.
2. **Choices**:
   | Text     | Value      |
   | -------- | ---------- |
   | Inserito | `inserito` |
   | Inviato  | `inviato`  |
   | Scartato | `scartato` |
3. **Save**.

### 2b. Migrazione dati (bulk da GUI)

Obiettivo: `in_attesa` → `inserito`, `riconciliato` → `inviato` (`scartato` invariato).

**Metodo A — batch edit (se disponibile nel tuo Directus):**

1. Vai su Content → **`InviiGiustificativiNoLogin`**.
2. Filtra per `stato` = `in_attesa`.
3. Seleziona tutte le righe (checkbox in testata) → **Edit** (matita) → imposta
   `stato` = `inserito` → **Save**.
4. Ripeti con filtro `stato` = `riconciliato` → imposta `stato` = `inviato`.

**Metodo B — modifica riga per riga (se il batch edit non è disponibile):**

1. Filtra `stato` = `in_attesa`, apri ogni riga e cambia `stato` in `inserito`.
2. Filtra `stato` = `riconciliato`, cambia in `inviato`.

> Volumi tipici (dev): 52 `in_attesa`, 263 `riconciliato`. In prod i numeri possono
> essere diversi: alla fine verifica che non restino valori `in_attesa`/`riconciliato`.

---

## 3. Permessi / ruoli

**Nessuna modifica necessaria** per far funzionare la 4.0.8.

Nota (hardening opzionale, non richiesto): sulle policy di `Giustificativi` il
**Volontario** ha `update: ['*']`, quindi via API potrebbe scrivere `pagato`.
L'UI non lo espone; se vuoi restringerlo, va valutata a parte una policy
field-scoped (es. consentire solo `Descrizione,Importo,Data,NotaVolontario,Stato=inviato/draft,Allegato`).

---

## 4. Verifica post-applicazione

1. `Giustificativi` mostra i nuovi campi `Pagamento`, `DataVerifica`, `DataPagamento`.
2. In Content → `InviiGiustificativiNoLogin` non esistono più valori
   `in_attesa` o `riconciliato`.
3. Il frontend 4.0.8 può essere deployato.

## 5. Backfill stati pagamento (opzionale, da app)

Dopo il deploy, per allineare i giustificativi storici agli stati `in_pagamento`/`pagato`:

- Admin → **Consistenza** → sezione **"Sincronizza stati pagamento giustificativi"**:
  1. **Anteprima** (dry-run): mostra quanti giustificativi verrebbero aggiornati.
  2. **Applica**: esegue la sincronizzazione (idempotente, riusabile dopo un sync prod→dev).
