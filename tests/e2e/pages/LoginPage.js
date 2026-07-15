export class LoginPage {
  constructor(page) {
    this.page = page
    this.emailInput = page.locator('[data-testid="login-email"]')
    this.passwordInput = page.locator('[data-testid="login-password"]')
    this.submitButton = page.locator('[data-testid="login-submit"]')
  }

  async goto() {
    await this.page.goto('/', { timeout: 20000 })
    await this.page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await this.page.goto('/login', { timeout: 20000 })
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 })
  }

  async login(email, password) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}
