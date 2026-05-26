# Test Cases Document

**Version:** 2.0.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — mapped to actual test IDs (A-01 to RO-02); added Elimina, Allegato, Inline Edit cases |
| 2026-05-25 | 2.0.0 | System | Final — added SU (submit), RO (read-only), EL (elimina) test cases; removed hardcoded credentials |

---

> **Nota:** Le credenziali di test sono contenute in `tests/e2e/fixtures/auth.json` (escluso dal repository pubblico).  
> Il test user è un volontario con accesso a una o più famiglie.

---

## Test Inventory

Per l'elenco completo e aggiornato di tutti i test, si veda [testing-plan.md](./testing-plan.md#7-test-id-reference).

**Riepilogo:**

| Area | Tests | File |
|---|---|---|
| Auth | A-01 to A-04 (4) | `auth.spec.js` |
| Famiglie | F-01, G-01, DB-01/02/03, IB-01/02/03/04, IN-01, PS-01/02/03/04 (14) | `famiglie.spec.js` |
| Giustificativi — Form | CG-01 to CG-06 (6) | `giustificativi.spec.js` |
| Giustificativi — Inline Edit | IE-01 to IE-07 (7) | `giustificativi.spec.js` |
| Giustificativi — Allegato | AL-01 to AL-06 (6) | `giustificativi.spec.js` |
| Giustificativi — Elimina | EL-01 to EL-04 (4) | `giustificativi.spec.js` |
| Giustificativi — Invia | SU-01 to SU-03 (3) | `giustificativi.spec.js` |
| Giustificativi — Read Only | RO-01 to RO-02 (2) | `giustificativi.spec.js` |

---

## Test Design Patterns

### Inline Edit Pattern (IB, IE)

Ogni campo InlineEditableField viene testato con tre modalità:

1. **Save (✓):** Click campo → modifica valore → click ✓ → verifica display → reload → verifica persistenza
2. **Cancel (✗):** Click campo → modifica valore → click ✗ → verifica display originale → reload → verifica persistenza
3. **No-change (✓):** Click campo → click ✓ senza modificare → torna a display (nessuna PATCH)

### Data Persistence Pattern (CG, IB, IN, IE, AL, SU, EL)

Ogni operazione di scrittura viene seguita da:
1. Verifica display immediato
2. Page reload
3. Verifica display dopo reload

### Skip Pattern

I test che richiedono dati pre-esistenti (es. una card in bozza) utilizzano `test.skip()` condizionale se il prerequisito non è soddisfatto.

---

## Key Test Details

### A-04: Token Removal Redirect
Rimuove `access_token` dal localStorage, ricarica la pagina e verifica il redirect a `/login`.

### AL-03: PDF Magic Bytes Verification
Scarica il file tramite `page.request.get()` e verifica che i primi 4 byte siano `%PDF` (`0x25 0x50 0x44 0x46`).

### AL-04: Popup URL Verification
Clicca "Apri" e cattura l'evento `popup` di Playwright. Verifica che l'URL della nuova scheda contenga `/assets/` e `access_token=`.

### EL-03/EL-04: Soft Delete
Clicca "Elimina" → conferma nel dialog → verifica card sparita dalla lista → reload → verifica ancora sparita. Il backend esegue `PATCH {Invalidato: true}`.

### SU-01/SU-02/SU-03: Submit Flow
Clicca "Invia" → verifica badge cambia da "Bozza" a "Inviato" → verifica pulsanti edit/Elimina spariscono → reload → verifica stato ancora "Inviato".
