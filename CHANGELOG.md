# Changelog

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
