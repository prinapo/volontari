# Test Report — v3.1.0

## Playwright (E2E)

**16 spec file · 2 progetti (desktop + mobile)**

### Desktop

| File            | ✅  | ❌  | ⏭️  |
| --------------- | --- | --- | --- |
| auth            | 11  | 0   | 0   |
| layout          | 5   | 0   | 0   |
| error-log       | 2   | 0   | 0   |
| helpers         | 5   | 0   | 0   |
| famiglie        | 5   | 0   | 0   |
| contatti        | 13  | 0   | 0   |
| submit          | 10  | 0   | 0   |
| referente       | 6   | 0   | 0   |
| deduplica       | 2   | 0   | 0   |
| email-case      | 3   | 0   | 1   |
| giustificativi  | 31  | 0   | 0   |
| pagamenti       | 9   | 0   | 0   |
| verifica-flow   | 5   | 0   | 0   |
| verifica        | 25  | 0   | 0   |
| gestione-fixes  | 3   | 0   | 0   |
| riconciliazione | 14  | 0   | 0   |

### Nuovi test in v3.1.0

| Test    | Componente         | Cosa verifica                               |
| ------- | ------------------ | ------------------------------------------- |
| CG-07   | GiustificativoForm | Importo negativo → Salva disabilitato       |
| CG-08   | GiustificativoForm | Importo zero → Salva disabilitato           |
| DB-V5   | BancariDialog      | IBAN non valido → Salva disabilitato        |
| SP-10   | SubmitPage         | IBAN non valido → Invia disabilitato        |
| F-GR-05 | FamigliaInfoCard   | IBAN non valido inline → errore validazione |
| HF-04   | FamigliaDialog     | IBAN corto → Salva disabilitato             |
| HF-05   | ContattoDialog     | Cellulare lettere → Salva disabilitato      |
| HF-06   | FamigliaDialog     | IBAN minuscolo → auto-uppercase             |

### Validazione Quasar in v3.1.0

| Componente         | Campo   | Regola                                               |
| ------------------ | ------- | ---------------------------------------------------- |
| GiustificativoForm | Importo | `> 0`                                                |
| GiustificativoForm | Data    | `YYYY-MM-DD` obbligatoria                            |
| FamigliaDialog     | IBAN    | `/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i` + auto-uppercase |
| BancariDialog      | IBAN    | stessa regex + auto-uppercase                        |
| SubmitPage         | IBAN    | stessa regex + auto-uppercase + `canSubmit`          |
| FamigliaInfoCard   | IBAN    | stessa regex (InlineEditableField)                   |
| PagamentiTab       | IBAN    | stessa regex + auto-uppercase (2 input)              |

### Cleanup Pattern

`deleteByPattern` ora copre tutte le tabelle con questi step FK-safe:

| Step | Tabella                    | Campi cercati                         |
| ---- | -------------------------- | ------------------------------------- |
| 0    | InviiGiustificativiNoLogin | `email`                               |
| 1    | Giustificativi             | `Descrizione`                         |
| 2    | email                      | `email_address`                       |
| 3    | Progetti                   | `Cognome_Beneficiario`, `id_progetto` |
| 4    | Famiglie + FC              | `Nome_Famiglia`, `id_famiglia`        |

`SAFELIST_EMAILS` protegge: `giovanni.prinetti@gmail.com`, `fake.*@fake.com`.

### ErrorLog tracking

Il `page` fixture in `console.js` traccia automaticamente nuovi entry ErrorLog dopo ogni test (prefix `[ERRORLOG]`). Solo 3 errori attesi: EL-02 (400 intenzionale ×2) + RC-05 (Giustificativi 403).

---

## Vitest (Unit Test)

240 test · 27 file · 0 failure

---

## Quality Toolchain

| Tool                | Stato                   |
| ------------------- | ----------------------- |
| ESLint              | ✅ 0 errori             |
| Stylelint           | ✅ 0 errori             |
| Prettier            | ✅                      |
| commitlint          | ✅ Conventional commits |
| Husky + lint-staged | ✅ Pre-commit           |
