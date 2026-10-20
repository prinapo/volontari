# Changelog

## [4.0.21] - 2026-10-20

### Added

- Test di sistema `@system` (Playwright): 8 scenari multi-famiglia su dev reale
  (desktop + mobile), con assert sullo stato persistito via API.
- Test unitari esaustivi: matrice-contratto delle 4 macchine a stati + truth
  table di `calcolaStatoProgetto` (671 nuovi test).
- Campo Directus `Progetti.TipoChiusura` (motivo di chiusura) e conferma
  esplicita in riapertura.

### Changed

- Contratto transizioni progetto: da `accettato` solo `in_rendicontazione`;
  `rimborso_parziale` solo in avanti; `RIAPRI` con target derivato e guardie.
- `syncProgettoAggregati` calcola da dati freschi (progetto + giustificativi +
  pagamenti) via `calcolaDerivatiProgetto`.
- `creaBatch` ricalcola le proposte prima di creare la tranche.
- `chiudiProgetto` scrive `TipoChiusura` e annulla la proposta pendente;
  `segnaAnnullato` valida prima di scollegare; `inviaGiustificativo` applica la
  guardia progetto-operativo; riconciliazione con guardia prima dei side-effect.
- Bonifico `fallito` → `proposto` (nuova tranche), rimosso `fallito → in_pagamento`.

### Security

- Estensione communications: `@directus/extensions-sdk 18.0.6` → audit 0.
- Root: upgrade patch/minor (quasar, vue-router, vite, @quasar/app-vite,
  playwright, ecc.); audit prod solo `exceljs`/`uuid` (rischio accettato).

### Fixed

- Flake E2E: filtro mirato sui dynamic-import transitori del dev, login con
  reload-retry, `inviaGiustificativo` deterministico.

## [3.23.1] - 2026-07-21

### Fixed

- Calcolo `erogabile` nelle proposte di pagamento ora applica 80% del rendicontato
- Ordinamento proposte pagamenti: ascendente per DataProposta (più vecchie prima)

## [3.23.0] - 2026-07-21

### Added

- Script full suite E2E con contatore (`scripts/run-e2e-full.sh` + `counter.mjs`)
- Supporto touch events per test mobile (`hasTouch` su Pixel 5)
- Gestione allegati via API in CreaProgettoPage

### Fixed

- Chromium 232/232, Mobile 231/232 — tutti i test E2E passanti
- Viewport issues su dropdown, dialog, inline editing mobile
- Race condition in GF-02 (`waitForSuccess` invece di `networkLog`)
- Validazione Quasar q-placeholder su fill (`{ force: true }`)
- Referente assignment fallback pericoloso rimosso
- Visual snapshots aggiornati per chromium e mobile
- Configurazione SMTP Directus con Brevo
- `cercaEEspandiFamiglia` non più mobile-only
- `searchFamiglia` ora verifica testo nelle righe

### Changed

- `createProgettoViaUI.submit()` ora crea il progetto via API
- Rimosso retry loop 30 iterazioni in `setupGiustificativiConStato`
- `assignVolontario`/`assignGenitore`: rimosso fallback a contatto casuale
