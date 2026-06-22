# Gestione Pagamenti — Specifiche Funzionali

**Version:** 1.0.0
**Last Updated:** 2026-06-15
**Status:** Final

---

## 1. Introduzione — Come funzionerà la gestione dei pagamenti

Questa sezione descrive il processo in linguaggio semplice, per chi dovrà usarlo operativamente.

**1. Lista bonifici da fare**
Chi si occupa dei pagamenti vede una tabella con l'importo da pagare per ogni famiglia, aggiornata automaticamente man mano che i giustificativi vengono verificati.

**2. Creare un gruppo di pagamento**
Quando chi si occupa di comunicare i bonifici al tesoriere vuole procedere con un pagamento, sceglie quale associazione effettuerà i bonifici (Sostieni il Sostegno o La Mongolfiera), seleziona le righe dalla lista, dà un nome al gruppo (es. "Tranche Luglio 2026") e conferma. Le righe selezionate escono dalla lista bonifici da fare ed entrano nella lista da inviare al tesoriere, esportabile in un file. Il sistema non permette di selezionare più di quanto resta disponibile per quell'associazione.

**3. Il riscontro dei bonifici**
Quando arriva l'esito dei bonifici dal tesoriere, chi gestisce i pagamenti torna sulla lista, filtra per il nome del gruppo, e per ogni riga segna l'esito. Ci sono tre casi:
- **Pagato** — il bonifico è andato a buon fine, la riga si chiude.
- **Fallito** — il bonifico non è andato a buon fine (di solito IBAN o intestazione sbagliati). La riga resta aperta, i dati si possono correggere e la riga viene rimessa in un nuovo gruppo quando pronta, anche con un'associazione diversa.
- **Annullato** — si usa quando il pagamento non si potrà mai fare (famiglia irraggiungibile, rinuncia). L'importo torna disponibile, la riga resta solo per memoria.

**4. La chiusura del progetto**
Un progetto si chiude da solo quando ha ricevuto tutto l'importo assegnato. Oppure si chiude a mano, in qualsiasi momento, quando chi gestisce i pagamenti decide che non ci saranno altre richieste.

---

## 2. Overview Tecnico

Il sistema introduce due nuove collection Directus (`Pagamenti` e `BatchPagamenti`), una logica di calcolo incrementale dell'erogabile per progetto, un vincolo di capienza per associazione finanziatrice, e nuovi campi su `Progetti` e `Famiglie`.

---

## 3. Costanti di Sistema

```js
// src/utils/constants.js
export const BUDGET_ASSOCIAZIONI = {
  'Sostieni il Sostegno': 26500,
  'La Mongolfiera': 191500
}
```

**Nota:** questi valori sono costanti applicative, non in database, salvo diversa indicazione futura (es. se cambiano ogni anno potrebbe convenire spostarli in una collection `Configurazione`).

---

## 4. Nuove Collection Directus

### 4.1 Collection `Pagamenti`

| Campo | Tipo Directus | Note |
|---|---|---|
| `id` | Integer (PK auto-increment) | — |
| `Progetto` | Many to One → `Progetti` | required |
| `Famiglia` | Many to One → `Famiglie` | denormalizzato, per query veloci e filtro |
| `Importo` | Decimal (10,2) | required |
| `Stato` | Dropdown (String) | valori: `proposto`, `in_pagamento`, `pagato`, `fallito`, `annullato` — default `proposto` |
| `Batch` | Many to One → `BatchPagamenti` | nullable, valorizzato solo quando lo stato passa a `in_pagamento` o successivi |
| `IBAN` | String (34) | snapshot, required quando creato |
| `Intestatario` | String (255) | snapshot, required quando creato |
| `DataProposta` | Timestamp | required, default `now()` |
| `DataPagamento` | Timestamp | nullable, valorizzato quando Stato → `pagato` |
| `NoteEsito` | Text | nullable — usato per spiegare un fallimento o un annullamento |
| `NotificaInviata` | Boolean | default `false` |

**Vincolo applicativo (non a livello DB, gestito in Directus tramite Flow o validazione frontend):** per ogni `Progetto`, può esistere al massimo una riga `Pagamenti` con `Stato = proposto` alla volta.

---

### 4.2 Collection `BatchPagamenti`

| Campo | Tipo Directus | Note |
|---|---|---|
| `id` | UUID (PK) | — |
| `Nome` | String (255) | required, es. "Tranche Luglio 2026" |
| `Associazione` | Dropdown (String) | valori: `Sostieni il Sostegno`, `La Mongolfiera` — required |
| `DataCreazione` | Timestamp | required, default `now()` |
| `DataInvioTesoriere` | Timestamp | nullable |
| `CreatoDA` | Many to One → `directus_users` | required, chi ha creato il batch |

**Relazione inversa:** `Pagamenti.Batch` → `BatchPagamenti.id` (One to Many da BatchPagamenti verso Pagamenti)

---

## 5. Nuovi Campi su Collection Esistenti

### 5.1 Su `Progetti`

| Campo | Tipo Directus | Note |
|---|---|---|
| `StatoProgetto` | Dropdown (String) | valori: `aperto`, `chiuso` — default `aperto` |
| `MotivoChiusura` | Text | nullable, opzionale, compilato solo su chiusura manuale |
| `DataChiusura` | Timestamp | nullable |
| `TotaleVerificato` | Decimal (10,2) | calcolato e salvato — somma giustificativi `Verificato` |
| `TotaleProposto` | Decimal (10,2) | calcolato e salvato — importo del Pagamento in stato `proposto`, se esiste |
| `TotaleInPagamento` | Decimal (10,2) | calcolato e salvato — somma Pagamenti in stato `in_pagamento` |
| `TotalePagato` | Decimal (10,2) | calcolato e salvato — somma Pagamenti in stato `pagato` |
| `ResiduoAllocato` | Decimal (10,2) | calcolato e salvato — `Allocato - (TotaleProposto + TotaleInPagamento + TotalePagato)` |

**Nota implementativa:** questi campi sono salvati (non calcolati al volo) per performance, e vengono ricalcolati ad ogni transizione di stato rilevante (vedi sezione 7 — Trigger di Ricalcolo).

### 5.2 Su `Famiglie`

Nessun nuovo campo richiesto — `IBAN` e `Intestatario_CC` esistono già e vengono aggiornati quando un pagamento `fallito` viene corretto (vedi sezione 6.4).

---

## 6. Logica Applicativa

### 6.1 Calcolo dell'Erogabile e Generazione/Aggiornamento Proposta

Trigger: ogni volta che un giustificativo passa a `Verificato` o esce da `Verificato` (es. torna a `Rifiutato` per correzione del verificatore).

```js
async function ricalcolaProposta(progettoId) {
  const progetto = await getProgetto(progettoId)
  if (progetto.StatoProgetto === 'chiuso') return // progetti chiusi non generano proposte

  const totaleVerificato = await sommaGiustificativiVerificati(progettoId)

  const pagamentiStorici = await getPagamenti(progettoId, ['in_pagamento', 'pagato'])
  const totaleStorico = sommaImporti(pagamentiStorici)

  const erogabileTeorico = Math.min(totaleVerificato, progetto.Allocato)
  // Nota: il all'80% si applica già nel calcolo esistente dei giustificativi/totali,
  // qui "Allocato" è già il tetto massimo erogabile per il progetto

  const nuovoProposto = erogabileTeorico - totaleStorico

  const pagamentoProposto = await getPagamento(progettoId, 'proposto')

  if (nuovoProposto > 0) {
    if (pagamentoProposto) {
      await updatePagamento(pagamentoProposto.id, { Importo: nuovoProposto })
    } else {
      await createPagamento({
        Progetto: progettoId,
        Famiglia: progetto.Famiglia,
        Importo: nuovoProposto,
        Stato: 'proposto',
        IBAN: progetto.Famiglia.IBAN,
        Intestatario: progetto.Famiglia.Intestatario_CC,
        DataProposta: now()
      })
    }
  } else if (pagamentoProposto) {
    // Non c'è più nulla da proporre (es. giustificativi rifiutati dopo la proposta)
    await deletePagamento(pagamentoProposto.id)
  }

  await ricalcolaTotaliProgetto(progettoId)
}
```

### 6.2 Ricalcolo Totali Progetto

```js
async function ricalcolaTotaliProgetto(progettoId) {
  const totaleVerificato = await sommaGiustificativiVerificati(progettoId)
  const proposto = await getPagamento(progettoId, 'proposto')
  const inPagamento = await sommaPagamenti(progettoId, 'in_pagamento')
  const pagato = await sommaPagamenti(progettoId, 'pagato')

  const totaleProposto = proposto?.Importo || 0
  const residuoAllocato = progetto.Allocato - (totaleProposto + inPagamento + pagato)

  await updateProgetto(progettoId, {
    TotaleVerificato: totaleVerificato,
    TotaleProposto: totaleProposto,
    TotaleInPagamento: inPagamento,
    TotalePagato: pagato,
    ResiduoAllocato: residuoAllocato
  })

  // Chiusura automatica
  if (pagato >= progetto.Allocato && progetto.StatoProgetto === 'aperto') {
    await chiudiProgetto(progettoId, { automatica: true })
  }
}
```

### 6.3 Creazione di un Batch di Pagamento

```js
async function creaBatch({ nome, associazione, pagamentoIds, userId }) {
  // 1. Verifica capienza
  const budgetTotale = BUDGET_ASSOCIAZIONI[associazione]
  const giaImpegnato = await sommaPagamentiPerAssociazione(associazione, ['in_pagamento', 'pagato'])
  const residuoDisponibile = budgetTotale - giaImpegnato

  const pagamenti = await getPagamentiByIds(pagamentoIds)
  const totaleSelezionato = sommaImporti(pagamenti)

  if (totaleSelezionato > residuoDisponibile) {
    throw new Error('Capienza insufficiente per questa associazione')
  }

  // 2. Verifica che tutte le righe siano in stato 'proposto'
  if (pagamenti.some(p => p.Stato !== 'proposto')) {
    throw new Error('Solo pagamenti in stato proposto possono essere inclusi in un batch')
  }

  // 3. Crea il batch
  const batch = await createBatchPagamenti({
    Nome: nome,
    Associazione: associazione,
    DataCreazione: now(),
    DataInvioTesoriere: now(),
    CreatoDA: userId
  })

  // 4. Aggiorna tutte le righe selezionate
  for (const pagamento of pagamenti) {
    await updatePagamento(pagamento.id, {
      Stato: 'in_pagamento',
      Batch: batch.id
    })
    await ricalcolaTotaliProgetto(pagamento.Progetto)
  }

  return batch
}
```

### 6.4 Riscontro Bonifico — Pagato

```js
async function segnaPagato(pagamentoId) {
  const pagamento = await getPagamento(pagamentoId)
  if (pagamento.Stato !== 'in_pagamento') {
    throw new Error('Solo pagamenti in_pagamento possono essere segnati come pagati')
  }

  await updatePagamento(pagamentoId, {
    Stato: 'pagato',
    DataPagamento: now()
  })

  await ricalcolaTotaliProgetto(pagamento.Progetto)
  await inviaNotificaPagamento(pagamento) // vedi sezione 6.7
}
```

### 6.5 Riscontro Bonifico — Fallito

```js
async function segnaFallito(pagamentoId, note) {
  const pagamento = await getPagamento(pagamentoId)
  if (pagamento.Stato !== 'in_pagamento') {
    throw new Error('Solo pagamenti in_pagamento possono essere segnati come falliti')
  }

  await updatePagamento(pagamentoId, {
    Stato: 'fallito',
    NoteEsito: note
    // Batch NON viene rimosso — resta collegato al batch originale per tracciabilità storica
  })

  await ricalcolaTotaliProgetto(pagamento.Progetto)
  // L'importo NON rientra automaticamente in una proposta — resta come riga 'fallito'
  // a sé stante, modificabile, fino a quando il verificatore non la rimette in pagamento
}

async function correggiDatiPagamentoFallito(pagamentoId, { iban, intestatario }) {
  const pagamento = await getPagamento(pagamentoId)
  if (pagamento.Stato !== 'fallito') {
    throw new Error('Solo pagamenti falliti sono modificabili')
  }

  await updatePagamento(pagamentoId, { IBAN: iban, Intestatario: intestatario })

  // Propagazione indietro sulla famiglia per uso futuro
  await updateFamiglia(pagamento.Famiglia, {
    IBAN: iban,
    Intestatario_CC: intestatario
  })
}
```

### 6.6 Riscontro Bonifico — Annullato

```js
async function segnaAnnullato(pagamentoId, motivo) {
  const pagamento = await getPagamento(pagamentoId)
  if (!['in_pagamento', 'fallito'].includes(pagamento.Stato)) {
    throw new Error('Solo pagamenti in_pagamento o falliti possono essere annullati')
  }

  await updatePagamento(pagamentoId, {
    Stato: 'annullato',
    NoteEsito: motivo
  })

  await ricalcolaTotaliProgetto(pagamento.Progetto)
  // L'importo annullato è escluso da ogni calcolo futuro — il progetto può
  // ricevere una nuova proposta se ci sono ancora giustificativi verificati scoperti
  await ricalcolaProposta(pagamento.Progetto)
}
```

### 6.7 Notifica al Termine del Pagamento

```js
async function inviaNotificaPagamento(pagamento) {
  const progetto = await getProgetto(pagamento.Progetto)
  const volontario = await getVolontarioPrincipale(progetto.Famiglia)

  const destinatario = volontario?.email || await getEmailGenitorePrimaria(progetto.Famiglia)

  if (!destinatario) {
    // Nessun destinatario disponibile — log per intervento manuale
    return
  }

  await inviaEmail({
    to: destinatario,
    subject: 'Pagamento effettuato',
    template: 'notifica-pagamento',
    data: { famiglia: progetto.Famiglia.Nome_Famiglia, importo: pagamento.Importo }
  })

  await updatePagamento(pagamento.id, { NotificaInviata: true })
}
```

**Nota:** il destinatario (volontario vs genitore) è ancora da confermare definitivamente — la funzione è predisposta con fallback automatico, la decisione finale si configura quando concordata.

### 6.8 Chiusura Progetto

```js
async function chiudiProgetto(progettoId, { automatica = false, motivo = null }) {
  await updateProgetto(progettoId, {
    StatoProgetto: 'chiuso',
    DataChiusura: now(),
    MotivoChiusura: automatica ? 'Importo allocato interamente pagato' : motivo
  })
}
```

Chiusura manuale: azione disponibile in VerificaPage su ogni riga progetto, con campo note opzionale, visibile solo se `canVerifica`.

---

## 7. Trigger di Ricalcolo — Riepilogo

| Evento | Azione |
|---|---|
| Giustificativo passa a `Verificato` | `ricalcolaProposta(progettoId)` |
| Giustificativo esce da `Verificato` (es. torna Rifiutato) | `ricalcolaProposta(progettoId)` |
| Pagamento creato in batch (`proposto → in_pagamento`) | `ricalcolaTotaliProgetto(progettoId)` |
| Pagamento segnato `pagato` | `ricalcolaTotaliProgetto(progettoId)` + check chiusura automatica + notifica |
| Pagamento segnato `fallito` | `ricalcolaTotaliProgetto(progettoId)` |
| Pagamento segnato `annullato` | `ricalcolaTotaliProgetto(progettoId)` + `ricalcolaProposta(progettoId)` |
| Chiusura manuale progetto | Nessun ricalcolo proposta successivo finché riaperto (se previsto in futuro) |

---

## 8. UI — Nuove Pagine e Componenti

### 8.1 Nuova Tab "Pagamenti" in VerificaPage

Visibile solo se `canVerifica`. Tre sotto-viste:

**8.1.1 Lista Bonifici da Fare**
- Tabella: Famiglia, Progetto, Importo proposto, IBAN, Intestatario
- Checkbox di selezione multipla
- In alto: due indicatori per associazione — Capacità totale / Residuo disponibile (calcolati live)
- Dropdown "Associazione" da selezionare prima di poter procedere
- Quando la selezione supera il residuo, ulteriori checkbox si disabilitano con tooltip esplicativo
- Pulsante "Crea gruppo di pagamento" → dialog con campo Nome → conferma → chiama `creaBatch()`

**8.1.2 Lista Da Inviare al Tesoriere / Da Riscontrare**
- Filtro per `BatchPagamenti.Nome`
- Tabella: Famiglia, Importo, IBAN, Intestatario, Stato
- Per ogni riga in `in_pagamento`: tre pulsanti — Pagato / Fallito / Annullato
- Pulsante "Esporta" → genera CSV/Excel con i dati del batch selezionato

**8.1.3 Pagamenti Falliti — Da Correggere**
- Tabella di tutti i `Pagamenti` in stato `fallito`
- Per ogni riga: campi IBAN e Intestatario editabili inline
- Checkbox per includerli nel prossimo batch (stesso flusso di 8.1.1, ma partendo da qui)

### 8.2 Indicatori su Riga Progetto in VerificaPage (vista esistente)

Aggiungere colonne/badge:
- `TotalePagato` / `Allocato` (es. "450€ / 700€")
- Badge `StatoProgetto`: Aperto (verde) / Chiuso (grigio)
- Pulsante "Chiudi progetto" (icona lucchetto) — apre dialog con nota opzionale

---

## 9. Permessi Directus per Ruolo

### Collection `Pagamenti`

| Ruolo | Permessi |
|---|---|
| Volontario | Nessuno (non vede questa collection) |
| Verificatore | Read, Create, Update (no Delete) |
| Gestore Volontari | Read (se deve avere visibilità, altrimenti nessuno — da confermare) |
| Administrator | Full CRUD |

### Collection `BatchPagamenti`

| Ruolo | Permessi |
|---|---|
| Volontario | Nessuno |
| Verificatore | Read, Create (no Update/Delete — un batch creato non si modifica, solo le righe Pagamenti collegate cambiano stato) |
| Administrator | Full CRUD |

### Campi nuovi su `Progetti`

| Ruolo | Permessi |
|---|---|
| Volontario | Read-only su `TotaleVerificato`, `TotaleProposto`, `TotaleInPagamento`, `TotalePagato`, `ResiduoAllocato`, `StatoProgetto` (se mostrati in FamigliePage in futuro) |
| Verificatore | Read tutti, Update su `StatoProgetto`, `MotivoChiusura`, `DataChiusura` (per chiusura manuale) — gli altri campi calcolati restano gestiti dal sistema, non editabili manualmente |
| Administrator | Full |

---

## 10. Nuovi Endpoint API

| Method | Path | Scopo |
|---|---|---|
| GET | `/items/Pagamenti?filter[Stato][_eq]=proposto` | Lista bonifici da fare |
| GET | `/items/Pagamenti?filter[Batch][_eq]={batchId}` | Riga di un batch specifico |
| GET | `/items/Pagamenti?filter[Stato][_eq]=fallito` | Lista pagamenti falliti da correggere |
| POST | `/items/BatchPagamenti` | Crea batch |
| PATCH | `/items/Pagamenti/{id}` | Aggiorna stato/dati pagamento |
| GET | `/items/Pagamenti?filter[Stato][_in]=in_pagamento,pagato&filter[...Associazione...]` | Calcolo capienza residua per associazione (via Batch.Associazione) |

---

## 11. Test Atomici

Ogni test è autosufficiente: crea i propri dati di partenza (progetto, famiglia, giustificativi) ed esegue il cleanup a fine test o usa un prefisso identificabile (`__TEST_PAG_`) per isolamento, coerente con il pattern già usato nel progetto.

### 11.1 Calcolo Proposta

**PAG-01 — Creazione proposta da giustificativo verificato**
Setup: progetto con `Allocato: 1000`, nessun pagamento esistente. Crea un giustificativo, portalo a `Verificato` con `Importo: 500`.
Atteso: viene creata una riga `Pagamenti` con `Stato: proposto`, `Importo: 500`.

**PAG-02 — Aggiornamento proposta esistente (non duplicazione)**
Setup: progetto con una riga `Pagamenti` già `proposto` con `Importo: 500`. Aggiungi un secondo giustificativo verificato da `300`.
Atteso: la riga esistente viene aggiornata a `Importo: 800`. Non esistono due righe `proposto` per lo stesso progetto.

**PAG-03 — Tetto Allocato rispettato**
Setup: progetto con `Allocato: 700`. Giustificativi verificati per un totale di `1200`.
Atteso: la proposta non supera `700`.

**PAG-04 — Proposta eliminata se giustificativo torna Rifiutato**
Setup: progetto con proposta `Importo: 500` generata da un solo giustificativo verificato da `500`. Il verificatore lo riporta a `Rifiutato`.
Atteso: la riga `Pagamenti` in stato `proposto` viene eliminata.

**PAG-05 — Progetto chiuso non genera proposte**
Setup: progetto con `StatoProgetto: chiuso`. Verifica un nuovo giustificativo.
Atteso: nessuna riga `Pagamenti` viene creata o aggiornata.

---

### 11.2 Creazione Batch

**PAG-06 — Creazione batch con successo**
Setup: due pagamenti `proposto` per associazione `Sostieni il Sostegno`, totale `2000`, residuo disponibile sufficiente.
Atteso: viene creato un `BatchPagamenti`, entrambe le righe passano a `in_pagamento` con `Batch` valorizzato.

**PAG-07 — Blocco per capienza insufficiente**
Setup: residuo disponibile per `La Mongolfiera` pari a `1000`. Selezione di pagamenti per un totale di `1500`.
Atteso: la creazione del batch fallisce con errore esplicito, nessuna riga viene modificata.

**PAG-08 — Capienza esatta (edge case)**
Setup: residuo disponibile esattamente `1000`. Selezione di pagamenti per `1000`.
Atteso: il batch viene creato con successo (il limite è inclusivo, non esclusivo).

**PAG-09 — Solo righe `proposto` possono entrare in un batch**
Setup: tentativo di includere una riga già `in_pagamento` in un nuovo batch.
Atteso: l'operazione fallisce con errore esplicito.

---

### 11.3 Riscontro Bonifici

**PAG-10 — Pagamento segnato Pagato**
Setup: riga `in_pagamento` con `Importo: 500` su un progetto con `Allocato: 1000`.
Atteso: `Stato → pagato`, `DataPagamento` valorizzata, `Progetto.TotalePagato` aggiornato a `500`, `ResiduoAllocato` aggiornato di conseguenza.

**PAG-11 — Pagamento segnato Fallito**
Setup: riga `in_pagamento` con `Importo: 500`.
Atteso: `Stato → fallito`, `Batch` resta collegato al batch originale, `Progetto.TotaleInPagamento` diminuisce di `500`, nessuna nuova proposta viene generata automaticamente.

**PAG-12 — Correzione dati su pagamento fallito**
Setup: riga `fallito` con IBAN errato.
Atteso: IBAN e Intestatario vengono aggiornati sulla riga `Pagamenti` E sulla `Famiglia` collegata.

**PAG-13 — Pagamento fallito rimesso in nuovo batch**
Setup: riga `fallito` con dati corretti. Viene inclusa in un nuovo batch con associazione diversa da quella originale.
Atteso: `Stato → in_pagamento`, `Batch` aggiornato al nuovo batch (il riferimento al batch precedente è sostituito), il pagamento ora risulta a carico della nuova associazione.

**PAG-14 — Pagamento segnato Annullato da in_pagamento**
Setup: riga `in_pagamento` con `Importo: 500`.
Atteso: `Stato → annullato`, l'importo è escluso da `TotaleInPagamento`/`TotalePagato`, viene ricalcolata la proposta (se ci sono ancora giustificativi verificati scoperti, ne nasce una nuova).

**PAG-15 — Pagamento segnato Annullato da fallito**
Setup: riga `fallito`.
Atteso: transizione permessa, stesso comportamento di PAG-14.

**PAG-16 — Tentativo di annullare un pagamento già Pagato**
Setup: riga `pagato`.
Atteso: l'operazione viene rifiutata con errore esplicito — uno stato terminale `pagato` non può essere annullato.

---

### 11.4 Chiusura Progetto

**PAG-17 — Chiusura automatica al raggiungimento dell'Allocato**
Setup: progetto con `Allocato: 700`, un pagamento `in_pagamento` da `700` viene segnato `pagato`.
Atteso: `StatoProgetto → chiuso` automaticamente, `MotivoChiusura: "Importo allocato interamente pagato"`, `DataChiusura` valorizzata.

**PAG-18 — Chiusura manuale con Allocato non raggiunto**
Setup: progetto con `Allocato: 700`, `TotalePagato: 200`. Il verificatore chiude manualmente con nota "Famiglia irraggiungibile".
Atteso: `StatoProgetto → chiuso`, `MotivoChiusura` salvato come da input, nessun automatismo ulteriore.

**PAG-19 — Progetto chiuso non riceve nuove proposte anche con giustificativi verificati**
Setup: progetto `chiuso`. Un volontario (teoricamente non dovrebbe più poter operare, ma testiamo il caso limite) verifica un nuovo giustificativo.
Atteso: nessuna riga `Pagamenti` `proposto` viene creata.

---

### 11.5 Calcolo Capienza per Associazione

**PAG-20 — Residuo calcolato correttamente con pagamenti misti**
Setup: per `Sostieni il Sostegno` (budget 26.500): un pagamento `pagato` da `5000`, un pagamento `in_pagamento` da `3000`, un pagamento `fallito` da `2000` (questo NON deve contare nel residuo impegnato).
Atteso: residuo calcolato = `26500 - 5000 - 3000 = 18500` (il `fallito` non riduce la capienza).

**PAG-21 — Pagamento annullato non impegna capienza**
Setup: pagamento `annullato` da `1000` per `La Mongolfiera`.
Atteso: il residuo disponibile per `La Mongolfiera` non viene ridotto da questa riga.

**PAG-22 — Capienza torna disponibile dopo fallimento**
Setup: pagamento `in_pagamento` da `2000` per `Sostieni il Sostegno` (residuo ridotto di conseguenza). Viene segnato `fallito`.
Atteso: il residuo disponibile per `Sostieni il Sostegno` torna a includere quei `2000` (la riga fallita non impegna più capienza).

---

### 11.6 Notifiche

**PAG-23 — Notifica inviata al volontario se presente**
Setup: progetto con un volontario assegnato. Pagamento segnato `pagato`.
Atteso: email inviata all'indirizzo del volontario, `NotificaInviata: true`.

**PAG-24 — Fallback al genitore se nessun volontario**
Setup: progetto su una famiglia senza volontario assegnato (caso form pubblico). Pagamento segnato `pagato`.
Atteso: email inviata all'indirizzo email primario del genitore/contatto della famiglia.

**PAG-25 — Nessun destinatario disponibile**
Setup: famiglia senza volontario e senza email genitore valorizzata. Pagamento segnato `pagato`.
Atteso: nessun errore bloccante, `NotificaInviata` resta `false`, evento loggato per intervento manuale.

---

## 12. Note Implementative Finali

- Il vincolo "una sola riga `proposto` per progetto" va enforced lato applicativo (store/service), Directus non supporta vincoli di unicità condizionale nativi su questo tipo di logica — va quindi implementato con un controllo prima della create
- I totali su `Progetti` sono salvati e non calcolati al volo: ogni trigger della sezione 7 deve essere affidabile — si raccomanda di implementarli come azioni atomiche (se possibile in transazione) per evitare disallineamenti in caso di errori a metà operazione
- L'esportazione CSV/Excel del batch (sezione 8.1.2) può riusare pattern già presenti nel progetto se esistenti, altrimenti è una funzionalità nuova da implementare con libreria xlsx lato frontend
- Il destinatario della notifica (volontario vs genitore) è predisposto ma il default va confermato prima del rilascio in produzione

