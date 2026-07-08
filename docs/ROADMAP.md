# Roadmap

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
