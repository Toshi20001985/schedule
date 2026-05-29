import { test, expect } from '@playwright/test'

test.describe('Settings: 触感トグル', () => {
  async function waitForSettingsLoaded(page: import('@playwright/test').Page) {
    await page.goto('/settings')
    await page.waitForSelector('h1', { timeout: 15000 })
  }

  test('バイブレーショントグルが設定画面に表示される', async ({ page }) => {
    await waitForSettingsLoaded(page)
    await expect(page.locator('[data-testid="haptic-toggle"]')).toBeVisible({ timeout: 10000 })
  })

  test('サウンドトグルが設定画面に表示される', async ({ page }) => {
    await waitForSettingsLoaded(page)
    await expect(page.locator('[data-testid="sound-toggle"]')).toBeVisible({ timeout: 10000 })
  })

  test('バイブレーショントグルのクリックで aria-checked が変化する', async ({ page }) => {
    await waitForSettingsLoaded(page)

    const toggle = page.locator('[data-testid="haptic-toggle"]')
    const before = await toggle.getAttribute('aria-checked')
    await toggle.click()
    const after = await toggle.getAttribute('aria-checked')
    expect(after).not.toBe(before)
  })

  test('サウンドトグルは初期状態で OFF（aria-checked="false"）', async ({ page }) => {
    // localStorage をクリアした状態でアクセス
    await page.goto('/settings')
    await page.evaluate(() => localStorage.removeItem('sound_enabled'))
    await page.reload()
    await page.waitForSelector('h1', { timeout: 15000 })

    const toggle = page.locator('[data-testid="sound-toggle"]')
    await expect(toggle).toHaveAttribute('aria-checked', 'false', { timeout: 10000 })
  })
})
