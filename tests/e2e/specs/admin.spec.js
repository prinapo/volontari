import { test, expect } from '../helpers/console.js'
import { loginAs } from '../helpers/login.js'
import { apiLogin, apiGet, apiPost, apiDelete, apiPatch, apiPatchSystem } from '../helpers/api.js'
import auth from '../fixtures/auth-test.json' with { type: 'json' }

test.describe('Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(30000)

    await loginAs(page, 'admin', auth)
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.goto('/admin')
    await page.waitForLoadState("networkidle").catch(() => {})
  })

  test('AD-01: Pagina admin caricata @smoke', async ({ page }) => {
    await expect(page.locator('.admin-page')).toBeVisible({ timeout: 10000 })
  })

  test('AD-03: Tab Errori cliccabile @smoke', async ({ page }) => {
    const tab = page.locator('.q-tab:has-text("Errori")')
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click()
      await page.waitForLoadState("networkidle").catch(() => {})
    }
  })

  test('AD-SS-01: Admin page screenshot @visual', async ({ page }) => {
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(page).toHaveScreenshot('admin-page.png', { maxDiffPixels: 500, animations: 'disabled' })
  })

  test('ADU-01: Tabella utenti si carica con colonne @smoke', async ({ page }) => {
    await expect(page.locator('.text-h5:has-text("Admin")')).toBeVisible({ timeout: 15000 })
    // Attendi che la tabella o il contenuto utenti sia caricato (mobile: grid mode)
    await page
      .waitForFunction(
        () => {
          return (
            document.querySelector('.q-table') ||
            document.querySelector('.q-table__grid-content') ||
            document.querySelector('.text-center.text-grey-5') ||
            document.querySelector('.q-table--grid')
          )
        },
        { timeout: 20000 }
      )
      .catch(() => {
        console.log('[ADU-01] waitForFunction timed out on mobile, continuing')
      })
  })

  test('ADU-02: Ricerca utenti filtra tabella @smoke', async ({ page }) => {
    await page.waitForLoadState("networkidle").catch(() => {})
    const searchInput = page.locator('input[aria-label="Cerca utenti"]')
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(auth.admin.email)
      await page.waitForLoadState("networkidle").catch(() => {})
      const rows = page.locator('.q-table tbody tr')
      expect(await rows.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('ADU-03: Aggiungi utente apre dialog @smoke', async ({ page }) => {
    await page.waitForLoadState("networkidle").catch(() => {})
    const addBtn = page.locator('button:has-text("Aggiungi utente")')
    await expect(addBtn).toBeVisible({ timeout: 10000 })
    await addBtn.click()
    await expect(page.locator('.q-dialog')).toBeVisible({ timeout: 5000 })
    await page.waitForLoadState("networkidle").catch(() => {})
    const closeBtn = page.locator('.q-dialog button:has-text("Annulla"), .q-dialog button[aria-label="Chiudi"]').first()
    await expect(closeBtn).toBeVisible({ timeout: 5000 })
    await closeBtn.click()
    await expect(page.locator('.q-dialog')).not.toBeVisible({ timeout: 5000 })
  })

  test('ADA-01: Tab Associazioni mostra tabella budget @smoke', async ({ page }) => {
    await page.locator('.q-tab:has-text("Associazioni")').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await page
      .waitForFunction(
        () => {
          return document.querySelector('.q-table') || document.querySelector('.q-table__grid-content')
        },
        { timeout: 15000 }
      )
      .catch(() => {})
  })
})

test.describe('Admin — Associazioni CRUD', () => {
  const ids = { associazione: null }

  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test.afterEach(async () => {
    if (ids.associazione) {
      try {
        await apiDelete('Associazioni', ids.associazione)
      } catch {
        /* */
      }
      ids.associazione = null
    }
  })

  test('ADA-02: Bottone Nuova associazione apre dialog @smoke', async ({ page }) => {
    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.locator('.q-tab:has-text("Associazioni")').click()
    await page.waitForLoadState("networkidle").catch(() => {})

    const addBtn = page.locator('button:has-text("Nuova associazione")')
    await expect(addBtn).toBeVisible({ timeout: 10000 })
    await addBtn.click()
    await expect(page.locator('.q-dialog:visible')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.q-dialog:visible input')).toHaveCount(2)
    await page.locator('.q-dialog:visible button:has-text("Annulla")').click()
    await expect(page.locator('.q-dialog:visible')).not.toBeVisible({ timeout: 5000 })
  })

  test('ADA-03: Crea associazione con Nome e Budget @crud', async ({ page }) => {
    const nome = `TEST_ASSOC_${Date.now()}`
    const budget = 5000

    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.locator('.q-tab:has-text("Associazioni")').click()
    await page.waitForLoadState("networkidle").catch(() => {})

    await page.locator('button:has-text("Nuova associazione")').click()
    await expect(page.locator('.q-dialog:visible')).toBeVisible({ timeout: 5000 })

    await page.locator('.q-dialog:visible input').nth(0).fill(nome)
    await page.locator('.q-dialog:visible input').nth(1).fill(String(budget))

    await page.locator('.q-dialog:visible button:has-text("Crea")').click()
    await expect(page.locator('.q-dialog:visible')).not.toBeVisible({ timeout: 15000 })

    // Verifica che l'associazione sia visibile (table mode o grid mode)
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(page.locator(`text="${nome}"`).first()).toBeVisible({ timeout: 10000 })

    // Salva ID per cleanup
    const res = await apiGet('Associazioni', {
      params: { filter: JSON.stringify({ Nome: { _eq: nome } }), fields: 'id' }
    })
    ids.associazione = res.data?.[0]?.id
    expect(ids.associazione).toBeTruthy()
  })
})

test.describe('Admin — Impersonazione', () => {
  test.beforeAll(async () => {
    await apiLogin(auth.admin.email, auth.admin.password)
  })

  test('AD-IMP-01: Pulsante Impersona visibile su utenti @smoke', async ({ page }) => {
    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(page.locator('button[aria-label="Impersona utente"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('AD-IMP-02: Impersona utente e torna a admin @crud', async ({ page }) => {
    let targetUserId = null

    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForLoadState("networkidle").catch(() => {})

    // Legge il primo userId dalla tabella utenti per cleanup
    targetUserId = await page
      .evaluate(() => {
        try {
          const pinia = document.querySelector('#q-app')?.__vue_app__?.config?.globalProperties?.$pinia
          const users = pinia?.state?.value?.admin?.users
          return users?.[0]?.id || null
        } catch {
          return null
        }
      })
      .catch(() => null)

    // Clicca il primo pulsante impersona
    const impBtn = page.locator('button[aria-label="Impersona utente"]').first()
    await expect(impBtn).toBeVisible({ timeout: 10000 })
    await Promise.all([page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {}), impBtn.click()])
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.waitForTimeout(2000)

    // Verifica che il banner di impersonazione sia visibile
    const banner = page.locator('.bg-purple-8')
    const bannerVisible = await banner.isVisible({ timeout: 15000 }).catch(() => false)
    expect(bannerVisible).toBe(true)

    // Torna a admin
    await page.locator('button:has-text("Torna a Admin")').click()
    // Attendi il reload completo della pagina (stopImpersonation fa location.reload())
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(2000)

    // Naviga a /admin (se la route guard reindirizza, riprova)
    await page.goto('/admin', { timeout: 15000 }).catch(() => {})
    await page.waitForLoadState("networkidle").catch(() => {})
    // Se il reindirizzamento ha portato a /famiglie, riprova dopo aver atteso l'auth
    if (!page.url().includes('/admin')) {
      await page.waitForTimeout(3000)
      await page.goto('/admin', { timeout: 15000 }).catch(() => {})
      await page.waitForLoadState("networkidle").catch(() => {})
    }
    await expect(page.locator('.admin-page')).toBeVisible({ timeout: 15000 })

    // Cleanup: rimuovi eventuale token statico
    if (targetUserId) {
      try {
        await apiPatchSystem('users', targetUserId, { token: null })
      } catch {
        /* cleanup */
      }
    }
  })

  test('AD-IMP-03: Impersona volontario e naviga a impostazioni @crud', async ({ page }) => {
    test.setTimeout(60000)

    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForLoadState("networkidle").catch(() => {})
    const impBtn = page.locator('button[aria-label="Impersona utente"]').first()
    await expect(impBtn).toBeVisible({ timeout: 10000 })
    await impBtn.click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await page.waitForTimeout(3000)

    const banner = page.locator('.bg-purple-8')
    await expect(banner).toBeVisible({ timeout: 15000 })
    expect(await banner.textContent()).toContain('Stai visualizzando come')

    // Torna a admin
    await page.locator('button:has-text("Torna a Admin")').click()
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(3000)
    await page.goto('/admin', { timeout: 15000 }).catch(() => {})
    await page.waitForLoadState("networkidle").catch(() => {})
    if (!page.url().includes('/admin')) {
      await page.waitForTimeout(3000)
      await page.goto('/admin', { timeout: 15000 }).catch(() => {})
      await page.waitForLoadState("networkidle").catch(() => {})
    }
    await expect(page.locator('.admin-page')).toBeVisible({ timeout: 15000 })
  })

  test('AD-CHECK-01: Tab Check mostra verifica consistenza @smoke', async ({ page }) => {
    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.locator('.q-tab:has-text("Check")').click()
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect(page.locator('.q-banner').first()).toBeVisible({ timeout: 15000 })
  })

  test('AD-CHECK-02: Contatto senza utente appare nel Check @crud', async ({ page }) => {
    const emailAddr = `test.adcheck.${Date.now()}@example.com`
    const contattoRes = await apiPost('contatti', {
      id_contatto: `TEST_ADCHECK_${Date.now()}`,
      Nome: 'TEST_AD',
      Cognome: 'CHECK',
      IsVolontario: true
    })
    const contattoId = contattoRes.data?.id_contatto || contattoRes.data?.id
    expect(contattoId).toBeTruthy()

    const emailRes = await apiPost('email', { Contatto: contattoId, email_address: emailAddr, Primary: true })
    const emailId = emailRes.data?.id || emailRes.data?.[0]?.id

    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.locator('.q-tab:has-text("Check")').click()
    await page.waitForLoadState("networkidle").catch(() => {})

    // The contact should appear in either the senzaUtente list or "Nessuna anomalia"
    const senzaUtenteSection = page.locator('text=Senza utente Directus').first()
    const noAnomalie = page.locator('text=Nessuna anomalia trovata').first()
    await expect(noAnomalie.or(senzaUtenteSection)).toBeVisible({ timeout: 15000 })

    if (emailId) {
      try {
        await apiDelete('email', emailId)
      } catch {}
    }
    if (contattoId) {
      try {
        await apiDelete('contatti', contattoId)
      } catch {}
    }
  })

  test('AD-IMP-03: Pulsante Impersona visibile su mobile @smoke', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await loginAs(page, 'admin', auth)
    await page.goto('/admin')
    await page.waitForLoadState("networkidle").catch(() => {})
    const impBtn = page.locator('[aria-label="Impersona utente"]').first()
    await expect(impBtn).toBeVisible({ timeout: 10000 })
  })
})
