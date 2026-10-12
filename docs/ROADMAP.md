# Roadmap

## v4.0.x — Pulizia architetturale (Fase 0 + 1) ✅

Interventi di riduzione di duplicazione e complessità (nessun cambio funzionale
visibile, unit test 792/792 verdi):

- [x] Rimozione boot ridondanti (`boot/axios.js`, `boot/material-icons.js`)
- [x] Rimozione plumbing morto `origine`/`ctx` da store e use case
- [x] Fix `statoProgettoColor('validato')` (badge "Validato" ora `info`)
- [x] Rimozione `FileUploader.vue` e 9 metodi service non usati
- [x] Riparazione config `knip` (entry pattern corretti)
- [x] Helper unico errori `apiErrorMessage` (sostituite ~100 duplicazioni)
- [x] Formattatori unificati su `src/utils/formatters.js`
- [x] Utility condivise: `number`, `relations`, `password`, `emailPrimarie.pickEmail`
- [x] `isContabile` unico, `RUOLI_FAMIGLIA` senza collisione
- [x] Adozione `debounce`/`exportFile` di Quasar
- [ ] (Fase 2) Deduplicazione markup UI: `AppDialog`, blocchi condivisi, split god component
- [ ] (Fase 3) Ripristino confini layer: spostare chiamate service/logica fuori dai componenti
- [ ] (Fase 4) Valutare `@xstate/fsm` vs transition table

## v3.2.0 — Bug fix & quality

Target: corrente

- [x] Email lowercase normalization (SubmitPage, LoginPage, RiconciliazionePage, ContattoDialog)
- [x] Admin tool per pulizia email maiuscole (tab Email in AdminPage)
- [x] Cleanup email — FK cascade su email.Contatto_Relation
- [x] Zero E2E test skippati (92 skip → expect/throw)
- [x] Nuovi test: permissions, change password, forgot password, chiudi progetto
- [x] Nuovi test: pagamenti, deduplica, riconciliazione flussi mancanti
- [x] Verifica consistenza Volontari in AdminPage
- [x] Deploy con versioni parallele (scripts: deploy-init, deploy-ftp, rollback)
- [x] Cross-origin env separation (.env vs .env.production)
- [x] Eliminata chiamata sendInvite automatica su assegnazione volontario
- [ ] Allineamento permessi Directus con tabella AGENTS.md

## v3.3.0 — Gestione password volontari

Target: prossima release

- [ ] Password di default temporanea alla creazione utente
- [ ] Obbligo cambio password al primo login
- [ ] Email di invito con link per impostare password (anziché password generata)
- [ ] Servizio email per notifiche (pagamento effettuato, referente assegnato)
- [ ] Test E2E per flusso completo invito + cambio password

## v3.4.0 — Admin & Permessi

Target: futura

- [ ] Admin: CRUD utenti completo (crea, modifica ruolo, reset password testati)
- [ ] Admin: gestione associazioni budget CRUD testato
- [ ] Admin: modifica inline progetti testato
- [ ] Test permessi 403 per tutti i ruoli
- [ ] AdminPage: test per tab Email cleanup scan + convert
- [ ] AdminPage: test per volontari senza utente (crea account)

## v3.5.0 — Pagamenti & Deduplica

Target: futura

- [ ] Pagamenti: crea batch da UI testato (end-to-end)
- [ ] Pagamenti: segna pagato/fallito/annullato testato
- [ ] Pagamenti: correggi IBAN su falliti + rebatch testato
- [ ] Pagamenti: genera/esporta lista testato
- [ ] Deduplica: merge contatti testato (seleziona campi, sposta email/famiglie)
- [ ] Deduplica: elimina contatti secondari testato
- [ ] Deduplica: elimina email orfane/duplicate testato

## v3.6.0 — Mobile & Refinement

Target: futura

- [ ] Mobile viewport per pagine rimanenti (pagamenti, admin, famiglie)
- [ ] Riconciliazione not_parent → flusso associa genitore testato (RC-NP-01)
- [ ] RF-02 flaky notification fixato
- [ ] ErrorLog CRUD (markAsRead, delete) testato
- [ ] Multi-famiglia selector testato
- [ ] Refresh button tests
- [ ] Network error handling catch blocks testati
