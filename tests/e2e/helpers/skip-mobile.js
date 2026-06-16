import { test } from '@playwright/test'

/**
 * Skip a test on mobile viewport.
 * Usage: test('...', isMobile, async ({ page }) => { ... })
 * Where isMobile is imported and used as a conditional skip.
 */
export function isMobile(testInfo) {
  return testInfo.project.name === 'mobile'
}
