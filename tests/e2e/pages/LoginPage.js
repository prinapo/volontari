export class LoginPage {
  constructor(page) {
    this.page = page
    this.emailInput = page.locator('[data-testid="login-email"]')
    this.passwordInput = page.locator('[data-testid="login-password"]')
    this.submitButton = page.locator('[data-testid="login-submit"]')
  }

  async goto() {
    await this.page.goto('/login', { timeout: 15000 })
    // If redirected (leaked auth), clear and retry
    if (!this.page.url().includes('/login')) {
      console.log('[LOGIN] redirected from /login, clearing leaked auth...')
      await this.page.evaluate(() => localStorage.clear())
      await this.page.goto('/login', { timeout: 15000 })
    }
  }

  async login(email, password) {
    // Ensure we're at /login — clear leaked auth if needed
    if (!this.page.url().includes('/login')) {
      console.log('[LOGIN] not at /login, clearing leaked auth...')
      await this.page.evaluate(() => localStorage.clear())
      await this.page.goto('/login', { timeout: 15000 })
    }

    // Navigate through fallback strategies
    for (const [desc, fn] of [
      ['wait 5s', async () => { await this.emailInput.waitFor({ state: 'visible', timeout: 5000 }) }],
      ['reload', async () => { await this.page.reload(); await this.emailInput.waitFor({ state: 'visible', timeout: 15000 }) }],
      ['root nav', async () => {
        await this.page.goto('/?_=' + Date.now(), { timeout: 15000 })
        await this.page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 })
        await this.emailInput.waitFor({ state: 'visible', timeout: 15000 })
      }],
    ]) {
      try {
        await fn()
        await this.emailInput.fill(email)
        await this.passwordInput.fill(password)
        await this.submitButton.click()
        // Wait for login redirect to complete before returning
        await this.page.waitForURL(/\/gestione|\/verifica|\/famiglie/, { timeout: 15000 }).catch(() => {
          console.log('[LOGIN] navigation after submit timed out')
        })
        return
      } catch {
        console.log(`[LOGIN] ${desc} failed`)
      }
    }
    throw new Error('Unable to find login email input after 3 strategies')
  }
}
