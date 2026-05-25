/**
 * smoke.spec.ts
 * アプリが起動してページ遷移が正常に動作するかを確認するスモークテスト。
 * Supabase 未設定（デモモード）で動作する。
 */
import { test, expect } from '@playwright/test'

test.describe('Smoke: アプリ基本動作', () => {
  test('ホームページが表示される（認証スキップ・デモモード）', async ({ page }) => {
    await page.goto('/')
    // ログインページにリダイレクトされていないこと
    await expect(page).not.toHaveURL(/auth/)
    // BottomNav が表示されること
    await expect(page.locator('nav')).toBeVisible()
  })

  test('BottomNav に全タブが揃っている', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'ホーム' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'カレンダー' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'リスト' })).toBeVisible()
    await expect(page.getByRole('link', { name: '検索' })).toBeVisible()
    await expect(page.getByRole('link', { name: '設定' })).toBeVisible()
  })

  test('カレンダーページが表示される', async ({ page }) => {
    await page.goto('/calendar')
    await expect(page).not.toHaveURL(/auth/)
    await expect(page.locator('nav')).toBeVisible()
  })

  test('リストページが表示される', async ({ page }) => {
    await page.goto('/list')
    await expect(page).not.toHaveURL(/auth/)
    await expect(page.locator('nav')).toBeVisible()
  })

  test('設定ページが表示される', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).not.toHaveURL(/auth/)
  })
})
