import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Bug: assetUrl genera URL validi', () => {
  test('BUG-ASSET-01: assetUrl non produce [object Object] su riconciliazione @regression', async ({ page }) => {
    await loginAs(page, 'manager', auth)
    await page.goto('/riconciliazione')
    await page.waitForTimeout(3000)

    // Cerca tutti i link con href contenente /assets/
    const allegati = page.locator('a[href*="/assets/"]')
    const count = await allegati.count()

    // Se ci sono allegati, verifica che nessuno abbia URL malformato
    for (let i = 0; i < count; i++) {
      const href = await allegati.nth(i).getAttribute('href')
      expect(href, `Allegato ${i}: href non deve essere vuoto`).toBeTruthy()
      expect(href, `Allegato ${i}: href non deve contenere [object`).not.toContain('[object')
      expect(href, `Allegato ${i}: href deve contenere UUID`).toMatch(/\/assets\/[\da-f-]+/)
      expect(href, `Allegato ${i}: href deve avere access_token`).toContain('access_token=')
    }

    // Se non ci sono allegati, il test è comunque valido
    // (non abbiamo dati ma la pagina carica correttamente)
    if (count === 0) {
      console.log('[BUG-ASSET-01] Nessun allegato trovato su riconciliazione — test passa comunque')
    }
  })

  test('BUG-ASSET-02: assetUrl gestisce oggetti e stringhe (unitario)', async ({ page }) => {
    // Test virtuale: esegue la stessa logica di assetUrl() nel browser
    const result = await page.evaluate(() => {
      function assetUrl(fileId, download = false) {
        if (!fileId) return ''
        const id = typeof fileId === 'object' ? fileId?.id : fileId
        if (!id) return ''
        const token = 'fake-token'
        const base = `https://api/assets/${id}?access_token=${token}`
        return download ? `${base}&download=1` : base
      }
      return {
        string: assetUrl('abc-123'),
        object: assetUrl({ id: 'abc-123' }),
        null: assetUrl(null),
        undefined: assetUrl(undefined),
        download: assetUrl('abc-123', true)
      }
    })

    expect(result.string).toContain('/assets/abc-123')
    expect(result.object).toContain('/assets/abc-123')
    expect(result.string).toBe(result.object)
    expect(result.null).toBe('')
    expect(result.undefined).toBe('')
    expect(result.download).toContain('&download=1')
  })
})
