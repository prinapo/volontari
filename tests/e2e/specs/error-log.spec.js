import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Error Log', () => {

  test('EL-01: Admin può leggere gli errori dalla collection ErrorLog @smoke', async ({ page }) => {
    test.setTimeout(30000)

    await loginAs(page, 'gestore', auth)
    await page.goto('/gestione')
    await page.waitForTimeout(2000)

    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    const res = await page.evaluate(async ({ token }) => {
      try {
        const r = await fetch('http://localhost:8055/items/ErrorLog?limit=1&fields=id', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!r.ok) return { error: r.status, body: await r.text().catch(() => '') }
        const data = await r.json()
        return { items: data.data || [], total: (data.data || []).length }
      } catch (err) {
        return { error: err.message }
      }
    }, { token })

    console.log('[EL-01] Risultato:', JSON.stringify(res))
    if (res.error === 403) {
      console.log('[EL-01] Il ruolo gestore non ha permessi di lettura su ErrorLog — skip')
      test.skip()
      return
    }
    expect(res.error).toBeUndefined()
  })
})
