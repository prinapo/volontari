/**
 * Set up API response monitoring.
 * Returns an array that gets populated with { method, url, status } entries
 * for all /items/, /files/, /auth/ API calls.
 */
export function monitorApi(page) {
  const apiCalls = []
  page.on('response', resp => {
    if (resp.url().includes('/items/') || resp.url().includes('/files') || resp.url().includes('/auth/')) {
      const entry = {
        method: resp.request().method(),
        url: resp.url().replace(/\?.*$/, ''),
        status: resp.status()
      }
      apiCalls.push(entry)
      if (resp.status() >= 400) {
        console.log(`[API ${resp.status()}] ${resp.request().method()} ${resp.url()}`)
      }
    }
  })
  return apiCalls
}

/**
 * Wait for a PATCH request to /items/Giustificativi with a specific Stato.
 * Returns an array of all PATCH request bodies captured.
 *
 * Usage:
 *   const patches = await waitForPatchStato(page, 'verificato', async () => {
 *     await verifyBtn.click()
 *   })
 *   expect(patches.length).toBeGreaterThan(0)
 *   expect(patches[patches.length - 1].Stato).toBe('verificato')
 */
export async function waitForPatchStato(page, expectedStato, actionFn) {
  const patchRequests = []
  const handler = req => {
    if (req.url().includes('/items/Giustificativi') && req.method() === 'PATCH') {
      try {
        patchRequests.push(JSON.parse(req.postData()))
      } catch {}
    }
  }
  page.on('request', handler)
  try {
    if (actionFn) await actionFn()
    await page.waitForLoadState('networkidle').catch(() => {})
  } finally {
    page.off('request', handler)
  }
  return patchRequests
}

/**
 * Attende che la rete sia "quiete" (nessuna richiesta per `quietMs`), con un
 * tetto massimo. Robusto per catene di richieste multiple (ricalcoli) che
 * partono in ritardo: evita che il cleanup cancelli record ancora in uso.
 */
export async function waitForNetworkQuiet(page, { quietMs = 1500, maxMs = 25_000 } = {}) {
  const start = Date.now()
  let lastActivity = Date.now()
  const onRequest = () => {
    lastActivity = Date.now()
  }
  page.on('request', onRequest)
  try {
    while (Date.now() - start < maxMs) {
      if (Date.now() - lastActivity >= quietMs) return
      await page.waitForTimeout(200)
    }
  } finally {
    page.off('request', onRequest)
  }
}

/**
 * Log all API calls to console (for debugging).
 */
export function logApiCalls(apiCalls) {
  console.log(`\n=== API CALLS ===`)
  apiCalls.forEach(c => console.log(`  ${c.method} ${c.url} → ${c.status}`))
  console.log(`  Total: ${apiCalls.length} calls, Errors: ${apiCalls.filter(c => c.status >= 400).length}`)
}
