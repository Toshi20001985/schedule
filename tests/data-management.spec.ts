import { test, expect } from '@playwright/test'

test.describe('Data Management: エクスポート・削除機能', () => {
  // 設定ページのローディング（useEffect の非同期 load）が完了するまで待つヘルパー
  async function waitForSettingsLoaded(page: import('@playwright/test').Page) {
    await page.goto('/settings')
    // ローディングスピナーが消えてページ本体が表示されるまで待つ
    await page.waitForSelector('h1', { timeout: 15000 })
  }

  test('エクスポートボタンが設定画面に表示される', async ({ page }) => {
    await waitForSettingsLoaded(page)
    await expect(page.locator('[data-testid="export-button"]')).toBeVisible({ timeout: 10000 })
  })

  test('データ削除ボタンが設定画面に表示される', async ({ page }) => {
    await waitForSettingsLoaded(page)
    await expect(page.locator('[data-testid="delete-account-button"]')).toBeVisible({ timeout: 10000 })
  })

  test('エクスポートボタンがダウンロードをトリガーする', async ({ page }) => {
    // デモ環境では Supabase 未接続のため API レスポンスをモック
    await page.route('/api/export', route => {
      const date = new Date().toISOString().split('T')[0]
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Content-Disposition': `attachment; filename="layover-backup-${date}.json"`,
        },
        body: JSON.stringify({
          version: '1.0',
          exported_at: new Date().toISOString(),
          couple: null,
          users: [],
          events: [],
          places: [],
          media: [],
          todos: [],
          flights: [],
        }),
      })
    })

    await waitForSettingsLoaded(page)
    await page.waitForSelector('[data-testid="export-button"]', { timeout: 10000 })

    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="export-button"]')
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/layover-backup-\d{4}-\d{2}-\d{2}\.json/)
  })

  test('削除ボタンは confirm をキャンセルするとデータを削除しない', async ({ page }) => {
    await waitForSettingsLoaded(page)
    await page.waitForSelector('[data-testid="delete-account-button"]', { timeout: 10000 })

    // confirm ダイアログをキャンセル
    page.once('dialog', dialog => dialog.dismiss())
    await page.click('[data-testid="delete-account-button"]')

    // 設定ページに留まる（リダイレクトされない）
    await expect(page.locator('h1').filter({ hasText: '設定' })).toBeVisible()
  })

  test('削除ボタンは DELETE 以外を入力すると削除しない', async ({ page }) => {
    await waitForSettingsLoaded(page)
    await page.waitForSelector('[data-testid="delete-account-button"]', { timeout: 10000 })

    let dialogCount = 0
    page.on('dialog', dialog => {
      dialogCount++
      if (dialogCount === 1) {
        // 1回目: confirm → 承認
        dialog.accept()
      } else {
        // 2回目: prompt → 間違った文字列を入力
        dialog.accept('WRONG')
      }
    })

    await page.click('[data-testid="delete-account-button"]')

    // 設定ページに留まる
    await expect(page.locator('h1').filter({ hasText: '設定' })).toBeVisible()
  })
})
