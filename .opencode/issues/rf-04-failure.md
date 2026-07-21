# RF-04: Rimuovi Referente da Volontario — test fallisce

## Descrizione
Il test `RF-04: Rimuovi Referente da Volontario @crud` fallisce costantemente perché il `btn-assigna-referente` non è visibile nella tabella contatti.

## Causa
Il test crea un contatto nuovo via UI (`createContattoViaUI` con email), poi lo assegna alla famiglia come Volontario via `assegnaContattoAFamigliaViaUI`. Durante l'assegnazione, la store chiama `_findOrCreateUser(contattoId)` che legge il contatto via API cercando l'email. Se l'email non è ancora indicizzata/cercabile, la funzione ritorna `{ error: 'Email mancante' }` e l'assegnazione si interrompe (`assignToFamiglia` ritorna false). Di conseguenza:
- `IsVolontario` NON viene settato a `true`
- `btn-assigna-referente` (che ha `v-if="props.row.IsVolontario"`) non viene renderizzato
- Il test fallisce con "btn-assigna-referente non trovato"

## Tentativi di fix falliti
1. PATCH `IsVolontario: true` via API admin dopo l'assegnazione → il contatto non veniva trovato dalla search del dialog, `assignNewContatto` non partiva
2. Sostituire contatto nuovo con `auth.volontario.email` pre-esistente → timeout 2m (forse loop di ricerca o referente dialog non si apre)

## Possibili soluzioni
- Investigare perché `_findOrCreateUser` non trova l'email del contatto appena creato
- Assicurarsi che `contattiService.getById` includa i campi email nella risposta
- In alternativa, modificare il test per usare un contatto volontario pre-esistente con `IsVolontario: true` già settato

## Test info
- File: `tests/e2e/specs/referente.spec.js:298`
- Describe: `Referente Role`
- Timeout: 120s (default)
