/**
 * flight-input.spec.ts
 * 空港コード入力で文字が重複しないことを確認するテスト。
 * iOS Safari で `toUpperCase()` による onChange 変換が re-fire を引き起こす
 * バグ（セッション36修正）の回帰テスト。
 *
 * テスト環境: E2E_TEST=true で認証バイパス済み。
 */
import { test, expect } from '@playwright/test'

test.describe('Flight: 空港コード入力', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    // FAB をクリックして追加シートを開く
    await page.getByTestId('fab-add').click()
    await expect(page.getByText('イベントを追加')).toBeVisible({ timeout: 5000 })
    // フライトを追加 ボタンをクリック（visit タイプがデフォルトで表示される）
    await page.getByText('フライトを追加').click()
    await expect(page.locator('[name="departure_airport"]')).toBeVisible({ timeout: 5000 })
  })

  test('出発空港を1文字ずつ入力しても重複しない', async ({ page }) => {
    const input = page.locator('[name="departure_airport"]')

    await input.pressSequentially('C', { delay: 50 })
    await expect(input).toHaveValue('C')

    await input.pressSequentially('H', { delay: 50 })
    await expect(input).toHaveValue('CH')

    await input.pressSequentially('T', { delay: 50 })
    await expect(input).toHaveValue('CHT')
  })

  test('小文字入力が自動で大文字に変換される', async ({ page }) => {
    const input = page.locator('[name="departure_airport"]')
    await input.fill('hnd')
    await expect(input).toHaveValue('HND')
  })

  test('数字・記号は除去される', async ({ page }) => {
    const input = page.locator('[name="departure_airport"]')
    await input.fill('H1N2D')
    await expect(input).toHaveValue('HND')
  })

  test('到着空港も同様に正常動作する', async ({ page }) => {
    const input = page.locator('[name="arrival_airport"]')

    await input.pressSequentially('I', { delay: 50 })
    await input.pressSequentially('T', { delay: 50 })
    await input.pressSequentially('M', { delay: 50 })
    await expect(input).toHaveValue('ITM')
  })

  test('便名は英数字のみ受け付ける', async ({ page }) => {
    const input = page.locator('[name="flight_number"]')
    await input.fill('nh123')
    await expect(input).toHaveValue('NH123')
  })
})
