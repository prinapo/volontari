# Directus — FormData order

Quando si carica un file via `POST /files`, i campi non-file (es. `folder`)
devono essere appesi **prima** del campo `file`, altrimenti Directus li ignora.
Vedi: https://github.com/directus/directus/discussions/10130

# Test E2E — Reset Password

## Account email per intercettazione
- Email: test@sostienilsostegno.com
- IMAP host: mail.sostienilsostegno.com:993 (TLS)
- Credenziali in `.env` (non condiviso su git)

## Account Directus per reset
- Fixture: `tests/e2e/fixtures/auth-email.json` (gitignorato)
- Email: test@sostienilsostegno.com
- Password base ripristinata dal test: `TestPwdE2EOriginal!`

## Flusso del test RP-10
1. Forgot password → richiedi reset per l'email
2. Intercetta email via IMAP → estrai link col token
3. ResetPasswordPage → imposta `TempPwdRound1!`
4. Login con `TempPwdRound1!` ✓
5. Forgot password → richiedi secondo reset
6. Intercetta email → estrai link
7. ResetPasswordPage → ripristina `TestPwdE2EOriginal!`
8. Login con `TestPwdE2EOriginal!` ✓

## Comandi
```bash
# Tutti i test
npm run test:e2e

# Soli test reset password
npm run test:e2e -- --grep "RP-"

# Test UI (mock email)
npm run test:e2e -- --grep "RP-0"

# Test full E2E (email reale)
npm run test:e2e -- --grep "RP-10"
```
