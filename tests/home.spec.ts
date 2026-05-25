/**
 * home.spec.ts
 * ホームページの主要要素が正しく表示されることを確認。
 * デモモード（Supabase 未設定）のモックデータを使用。
 */
import { test, expect } from '@playwright/test'

test.describe('Home: ホーム画面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // ローディング完了を待つ（loading spinner が消えるまで）
    await page.waitForLoadState('networkidle')
  })

  test('ヒーローカードが表示される', async ({ page }) => {
    await expect(page.getByTestId('hero')).toBeVisible()
  })

  test('ヒーローカードのテキストが表示される', async ({ page }) => {
    // Supabase 未設定時: 'さくら' などのモックデータ
    // Supabase 設定済み・未ログイン時: 'no_meeting' 状態 → "Next Layover"
    const hero = page.getByTestId('hero')
    await expect(hero).toBeVisible()
    // ヒーロー内に何らかのテキストが存在すること
    await expect(hero.locator('p').first()).toBeVisible()
  })

  test('ホーム画面の主要セクションが存在する', async ({ page }) => {
    // ヒーローカードが存在すること（データの有無にかかわらず）
    await expect(page.getByTestId('hero')).toBeVisible()
    // BottomNav が表示されること
    await expect(page.locator('nav')).toBeVisible()
  })

  test('ヒーローカードをクリックするとカレンダーに遷移する', async ({ page }) => {
    await page.getByTestId('hero').click()
    await expect(page).toHaveURL('/calendar')
  })
})
