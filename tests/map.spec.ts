import { test, expect } from '@playwright/test'

test.describe('Map: 地図ページ', () => {
  test('地図ページが表示される', async ({ page }) => {
    await page.goto('/map')
    await expect(page.locator('h1').filter({ hasText: 'ふたりの地図' })).toBeVisible({ timeout: 10000 })
  })

  test('リストへのリンクが表示される', async ({ page }) => {
    await page.goto('/map')
    await expect(page.locator('text=リストへ →')).toBeVisible({ timeout: 10000 })
  })

  // E2E 環境では認証セッションなし → 場所0件 → 空状態を表示
  test('未認証時は空状態メッセージが表示される', async ({ page }) => {
    await page.goto('/map')
    await expect(page.locator('h1').filter({ hasText: 'ふたりの地図' })).toBeVisible({ timeout: 10000 })
    // 空状態: 場所追加を促すリンクが表示される
    await expect(page.locator('text=場所を追加する →')).toBeVisible({ timeout: 10000 })
  })

  test('CSP 違反エラー（タイルブロック）が発生しない', async ({ page }) => {
    const tileErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // 地図タイル・フォント・Vercel スクリプト以外の CSP 違反を検出
        if (
          (text.includes('Content Security Policy') || text.includes('Refused to load')) &&
          (text.includes('cartocdn') || text.includes('tile.openstreetmap') || text.includes('leaflet'))
        ) {
          tileErrors.push(text)
        }
      }
    })

    await page.goto('/map')
    await page.waitForTimeout(2000)

    expect(tileErrors).toHaveLength(0)
  })
})
