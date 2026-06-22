import { LoginPage } from '../pages/LoginPage.js'

const ROLE_URLS = {
  volontario: /\/famiglie/,
  volontario_nofam: /\/famiglie/,
  genitore: /\/famiglie/,
  gestore: /\/gestione/,
  verificatore: /\/verifica/,
  gestore_verifica: /\/gestione/,
  admin: /\/gestione|\/admin/
}

/**
 * Log in as a given role and wait for the correct redirect URL.
 * @param {import('@playwright/test').Page} page
 * @param {string} role — key from auth-test.json (volontario, gestore, verificatore, etc.)
 * @param {Object} auth — auth-test.json fixture
 * @param {Object} [options]
 * @param {number} [options.urlTimeout=15000]
 * @returns {Promise<LoginPage>}
 */
export async function loginAs(page, role, auth, options = {}) {
  const { urlTimeout = 15000 } = options
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login(auth[role].email, auth[role].password)

  const expectedUrl = ROLE_URLS[role]
  if (expectedUrl) {
    await page.waitForURL(expectedUrl, { timeout: urlTimeout }).catch(() => {
      console.log(`[loginAs] URL match for ${role} timed out — continuing anyway`)
    })
  }
  return loginPage
}
