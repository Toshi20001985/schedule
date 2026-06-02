/**
 * list-deletion-persistence.spec.ts
 * 削除したアイテムがタブ切り替え後も復活しないことを確認するテスト。
 * セッション28で修正したバグ（リスト削除後タブ切り替えで復活）の回帰テスト。
 *
 * テスト環境: Supabase URL 設定済みだが未認証 → load() が早期リターン
 * → アイテムはローカル state のみ（myId/coupleId = null でフォールバック追加）
 * → タブ切り替えでコンポーネント再マウント後 load() がデータをロードしないため
 *    削除済みアイテムは復活しない（これを確認する）
 */
import { test, expect } from '@playwright/test'

test.describe('List: 削除後の永続性', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/list')
    await page.waitForLoadState('networkidle')
    // タブボタンが描画されるまで待機
    await expect(page.getByRole('button', { name: 'やりたいこと' })).toBeVisible({ timeout: 10000 })
  })

  test('やりたいことを追加・削除してタブ切り替え後も復活しない', async ({ page }) => {
    // やりたいことタブに切り替え
    await page.getByRole('button', { name: 'やりたいこと' }).click()
    await page.waitForTimeout(300)

    // テストアイテムを追加
    await page.getByTestId('fab-add').click()
    await expect(page.getByPlaceholder('例：富士山に登る')).toBeVisible({ timeout: 5000 })
    await page.getByPlaceholder('例：富士山に登る').fill('削除テスト用アイテム')
    await page.getByRole('button', { name: '追加する' }).click()

    // 追加されたことを確認
    await expect(page.getByText('削除テスト用アイテム')).toBeVisible({ timeout: 5000 })

    // アイテムカードの中の削除ボタン（Trash2 アイコン）をクリック
    // カード構造: SwipeableListItem > Card > div.flex.items-start > div.flex.gap-1 > button[Trash2]
    const item = page.getByText('削除テスト用アイテム').first()
    const card = item.locator('xpath=ancestor::div[contains(@class,"flex") and contains(@class,"items-start")]').first()
    await card.locator('button').last().click()

    // 削除されたことを確認
    await expect(page.getByText('削除テスト用アイテム')).not.toBeVisible({ timeout: 5000 })

    // BottomNav でホームタブに移動（クライアントサイドナビゲーション）
    await page.locator('nav').getByRole('link', { name: /ホーム/ }).click()
    await page.waitForURL('/')
    await page.waitForTimeout(300)

    // リストタブに戻る（コンポーネント再マウントが発生）
    await page.locator('nav').getByRole('link', { name: /リスト/ }).click()
    await page.waitForURL('/list')
    // タブボタンが再描画されるまで待機
    await expect(page.getByRole('button', { name: 'やりたいこと' })).toBeVisible({ timeout: 10000 })

    // やりたいことタブに切り替え
    await page.getByRole('button', { name: 'やりたいこと' }).click()
    await page.waitForTimeout(500)

    // 削除したアイテムが復活していないことを確認（回帰テスト）
    await expect(page.getByText('削除テスト用アイテム')).not.toBeVisible()
  })

  test('行きたい場所を追加・削除してタブ切り替え後も復活しない', async ({ page }) => {
    // FAB でアイテムを追加
    await page.getByTestId('fab-add').click()
    await expect(page.getByPlaceholder('例：新宿御苑')).toBeVisible({ timeout: 5000 })
    await page.getByPlaceholder('例：新宿御苑').fill('削除テスト場所')
    await page.getByRole('button', { name: '追加する' }).click()

    // ジオコーディングモーダルが出る場合はスキップ
    const confirmBtn = page.getByRole('button', { name: 'この場所でOK' })
    const itemInList = page.getByText('削除テスト場所', { exact: true })
    await Promise.race([
      confirmBtn.waitFor({ timeout: 8000 }).then(() => confirmBtn.click()).catch(() => {}),
      itemInList.waitFor({ timeout: 8000 }),
    ])

    // 追加されたことを確認（トーストが消えるまで待つ）
    await expect(page.getByText('削除テスト場所', { exact: true })).toBeVisible({ timeout: 5000 })

    // 削除ボタンをクリック
    const item = page.getByText('削除テスト場所', { exact: true }).first()
    const card = item.locator('xpath=ancestor::div[contains(@class,"flex") and contains(@class,"items-start")]').first()
    await card.locator('button').last().click()

    // 削除されたことを確認
    await expect(page.getByText('削除テスト場所', { exact: true })).not.toBeVisible({ timeout: 5000 })

    // BottomNav でホームに移動してリストに戻る
    await page.locator('nav').getByRole('link', { name: /ホーム/ }).click()
    await page.waitForURL('/')
    await page.waitForTimeout(300)
    await page.locator('nav').getByRole('link', { name: /リスト/ }).click()
    await page.waitForURL('/list')
    await expect(page.getByRole('button', { name: '行きたい場所' })).toBeVisible({ timeout: 10000 })

    // 削除したアイテムが復活していないことを確認
    await expect(page.getByText('削除テスト場所', { exact: true })).not.toBeVisible()
  })
})
