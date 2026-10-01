export class LoginPage {
  constructor(page) {
    this.page = page
    this.emailInput = page.locator('[data-testid="login-email"]')
    this.passwordInput = page.locator('[data-testid="login-password"]')
    this.submitButton = page.locator('[data-testid="login-submit"]')
  }

  async goto() {
    await this.page.goto('/', { timeout: 20_000 })
    // Attende che tutte le fetch della pagina montata col precedente accesso
    // siano finite: api.js legge il token da localStorage A OGNI richiesta, quindi
    // un clear() prima che la dashboard finisca di caricare farebbe partire una
    // fetch pendente SENZA token → 403 su /items/* → fallimento da console hook.
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await this.page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    // Cookie mode: elimina anche i cookie di sessione Directus
    await this.page.context().clearCookies()
    await this.page.goto('/login', { timeout: 20_000 })
    await this.emailInput.waitFor({ state: 'visible', timeout: 10_000 })
  }

  async login(email, password) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}
