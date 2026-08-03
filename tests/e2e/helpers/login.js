import { LoginPage } from '../pages/LoginPage.js'

export async function loginAs(page, role, auth) {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login(auth[role].email, auth[role].password)
  await page.waitForURL(/\/dashboard|\/gestione|\/verifica|\/famiglie|\/admin/, { timeout: 20_000 })
}
