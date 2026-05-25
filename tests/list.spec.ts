/**
 * list.spec.ts
 * リストページの主要フロー（場所追加・表示・タブ切り替え）をテスト。
 * デモモード（Supabase 未設定）で動作 → ローカル state に追加される。
 */
import { test, expect } from '@playwright/test'

test.describe('List: リスト機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/list')
    await page.waitForLoadState('networkidle')
  })

  test('場所タブがデフォルト表示される', async ({ page }) => {
    // デモデータ: '新宿御苑', '横浜中華街' がホーム経由で設定されているが
    // list ページは独立したデータソースを持つ
    await expect(page.getByTestId('fab-add')).toBeVisible()
  })

  test('タブ切り替えが動作する', async ({ page }) => {
    // やりたいことタブ（ラベル: "やりたいこと"）
    await page.getByRole('button', { name: 'やりたいこと' }).click()
    await expect(page.getByRole('button', { name: 'やりたいこと' })).toHaveCSS('color', 'rgb(26, 26, 26)')

    // メディアタブ（ラベル: "観たい・聴きたい"）
    await page.getByRole('button', { name: '観たい・聴きたい' }).click()
    await expect(page.getByRole('button', { name: '観たい・聴きたい' })).toHaveCSS('color', 'rgb(26, 26, 26)')
  })

  test('FAB をクリックすると追加シートが開く', async ({ page }) => {
    await page.getByTestId('fab-add').click()
    // 場所追加シートのタイトル（heading で特定して空状態テキストとの曖昧さを回避）
    await expect(page.getByRole('heading', { name: '場所を追加' })).toBeVisible()
    await expect(page.getByPlaceholder('例：新宿御苑')).toBeVisible()
  })

  test('場所を追加するとリストに表示される', async ({ page }) => {
    await page.getByTestId('fab-add').click()
    await expect(page.getByPlaceholder('例：新宿御苑')).toBeVisible()

    // 場所名を入力
    await page.getByPlaceholder('例：新宿御苑').fill('Playwright テスト場所')

    // 追加する（ジオコーディングが走るので少し時間がかかる可能性あり）
    await page.getByRole('button', { name: '追加する' }).click()

    // シートが閉じること、またはリストに表示されること
    // デモモードでは Nominatim を叩かず geocode=null になるため即座に完了する
    // "保存できませんでした" か "座標を取得できませんでした" トーストが出る可能性あるが
    // アイテム自体はリストに追加される
    await expect(page.getByText('Playwright テスト場所')).toBeVisible({ timeout: 10000 })
  })

  test('やりたいことを追加できる', async ({ page }) => {
    // やりたいことタブに切り替え
    await page.getByRole('button', { name: 'やりたいこと' }).click()

    await page.getByTestId('fab-add').click()
    await expect(page.getByPlaceholder('例：富士山に登る')).toBeVisible()

    await page.getByPlaceholder('例：富士山に登る').fill('Playwright テストやりたいこと')
    await page.getByRole('button', { name: '追加する' }).click()

    await expect(page.getByText('Playwright テストやりたいこと')).toBeVisible({ timeout: 5000 })
  })
})
