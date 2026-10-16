import { LoginPage } from '../pages/LoginPage.js'

const APP_URL_RE = /\/dashboard|\/gestione|\/verifica|\/famiglie|\/admin/

/**
 * Login con recupero da hiccup transitorio del dev server Vite: la navigazione
 * post-login può restare su /login se fallisce il dynamic import della pagina di
 * destinazione ("Failed to fetch dynamically imported module"). In quel caso un
 * reload ri-monta l'app (il token è già in localStorage) e completa il redirect.
 * Un fallimento reale (credenziali/auth/permessi) fallisce comunque al 2° tentativo.
 */
export async function loginAs(page, role, auth) {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login(auth[role].email, auth[role].password)

  try {
    await page.waitForURL(APP_URL_RE, { timeout: 20_000 })
  } catch (error) {
    console.log('[loginAs] waitForURL fallito, reload e ritento:', String(error.message).split('\n', 1)[0])
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
    await page.waitForURL(APP_URL_RE, { timeout: 20_000 })
  }
}
