/**
 * calendar.spec.ts
 * カレンダーの主要フロー（イベント追加・表示）をテスト。
 * デモモード（Supabase 未設定）で動作 → ローカル state に追加される。
 */
import { test, expect } from '@playwright/test'

test.describe('Calendar: カレンダー機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('load')
  })

  test('カレンダーグリッドが表示される', async ({ page }) => {
    // 曜日ヘッダー（日〜土）が表示されること
    await expect(page.getByText('日').first()).toBeVisible()
    await expect(page.getByText('月').first()).toBeVisible()
  })

  test('FAB（追加ボタン）が表示される', async ({ page }) => {
    await expect(page.getByTestId('fab-add')).toBeVisible()
  })

  test('FAB をクリックするとイベント追加シートが開く', async ({ page }) => {
    await page.getByTestId('fab-add').click()
    await expect(page.getByText('イベントを追加')).toBeVisible()
    await expect(page.getByPlaceholder('例：東京デート')).toBeVisible()
  })

  test('イベントを追加するとリストに表示される', async ({ page }) => {
    // FAB → シート開く
    await page.getByTestId('fab-add').click()
    await expect(page.getByPlaceholder('例：東京デート')).toBeVisible()

    // タイトル入力
    await page.getByPlaceholder('例：東京デート').fill('Playwright テスト予定')

    // 種類: 「会う日」を選択
    await page.getByRole('button', { name: '会う日' }).click()

    // 開始日: 「今日」ボタンで選択
    // DateInput は複数あるので最初の「今日」ボタンをクリック
    await page.getByRole('button', { name: '今日' }).first().click()

    // 追加する
    await page.getByRole('button', { name: '追加する' }).click()

    // シートが閉じること
    await expect(page.getByText('イベントを追加')).not.toBeVisible({ timeout: 5000 })

    // 追加したイベントがカレンダーに表示されること（当月のセルに表示）
    // デモモードではローカル state に追加されるため、月内に今日が含まれていれば表示される
    await expect(page.getByText('Playwright テスト予定')).toBeVisible({ timeout: 5000 })
  })

  test('月の切り替えができる', async ({ page }) => {
    // 現在月が表示されていること
    const today = new Date()
    // カレンダーのフォーマットは "yyyy年 M月"（年と月の間にスペースあり）
    const monthLabel = `${today.getFullYear()}年 ${today.getMonth() + 1}月`
    // h1 要素でカレンダーヘッダーを特定
    const header = page.locator('h1').filter({ hasText: monthLabel })
    await expect(header).toBeVisible()

    // 次月ボタン（ChevronRight）をクリック
    // ナビゲーションの右矢印ボタン
    const nextButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1)
    await nextButton.click()

    // 翌月が表示されること
    const nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const nextMonthLabel = `${nextDate.getFullYear()}年 ${nextDate.getMonth() + 1}月`
    await expect(page.locator('h1').filter({ hasText: nextMonthLabel })).toBeVisible()
  })
})
