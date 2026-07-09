export class LoginPage {
  constructor(page) {
    this.page = page
    this.emailInput = page.locator('[data-testid="login-email"]')
    this.passwordInput = page.locator('[data-testid="login-password"]')
    this.submitButton = page.locator('[data-testid="login-submit"]')
  }

  async goto() {
    await this.page.goto('/login', { timeout: 20000 })
    if (!this.page.url().includes('/login')) {
      console.log('[LOGIN] redirected from /login, clearing leaked auth...')
      await this.page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = '/login'
      })
      await this.page.waitForTimeout(2000)
    }
  }

  async login(email, password) {
    // Navigate to /login in a single step to avoid API calls without token
    if (!this.page.url().includes('/login')) {
      console.log('[LOGIN] not at /login, clearing leaked auth...')
      await this.page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = '/login'
      })
      await this.page.waitForTimeout(2000)
    }

    // Navigate through fallback strategies
    for (const [desc, fn] of [
      ['wait 10s', async () => { await this.emailInput.waitFor({ state: 'visible', timeout: 10000 }) }],
      ['reload+clear', async () => {
        await this.page.evaluate(() => {
          localStorage.clear()
          sessionStorage.clear()
        })
        await this.page.reload()
        await this.emailInput.waitFor({ state: 'visible', timeout: 20000 })
      }],
      ['hard nav', async () => {
        await this.page.goto('/?_=' + Date.now(), { timeout: 20000 })
        await this.page.goto('/login', { timeout: 20000 })
        await this.emailInput.waitFor({ state: 'visible', timeout: 20000 })
      }],
    ]) {
      try {
        await fn()
        await this.emailInput.fill(email)
        await this.passwordInput.fill(password)
        await this.submitButton.click()
        // Wait for login redirect to complete before returning
        await this.page.waitForURL(/\/gestione|\/verifica|\/famiglie/, { timeout: 20000 }).catch(() => {
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
