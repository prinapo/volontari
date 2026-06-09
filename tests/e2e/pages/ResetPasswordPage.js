export class ResetPasswordPage {
  constructor(page) {
    this.page = page
  }

  async goto() {
    await this.page.goto('/reset-password')
  }

  async gotoWithToken(token) {
    await this.page.goto(`/reset-password?token=${token}`)
  }

  async fillPassword(password, confirm = password) {
    const inputs = this.page.locator('input[type="password"]')
    await inputs.nth(0).fill(password)
    await inputs.nth(1).fill(confirm)
  }

  async submit() {
    await this.page.locator('button:has-text("Reimosta password")').click()
  }

  async expectSuccess() {
    await expect(this.page.locator('.text-h6:text-is("Password aggiornata")')).toBeVisible({ timeout: 5000 })
    await expect(this.page).toHaveURL(/\/login/, { timeout: 5000 })
  }

  async expectInvalidLink() {
    await expect(this.page.locator('text=Link non valido')).toBeVisible()
  }

  async expectPasswordMismatch() {
    await expect(this.page.locator('text=Le password non coincidono')).toBeVisible()
  }

  async expectError() {
    await expect(this.page.locator('.q-notification')).toBeVisible({ timeout: 5000 })
  }
}
