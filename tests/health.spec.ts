import { test, expect } from '@playwright/test'

test.describe('Health: ヘルスチェックエンドポイント', () => {
  test('正常時に 200 と healthy ステータスを返す', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('healthy')
    expect(data.timestamp).toBeTruthy()
    // Supabase 設定あり → 'ok'、デモ環境 → 'skipped'
    expect(['ok', 'skipped']).toContain(data.checks.database)
  })

  test('レスポンスに必須フィールドが含まれる', async ({ request }) => {
    const response = await request.get('/api/health')
    const data = await response.json()

    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('checks')
    expect(data.checks).toHaveProperty('database')
  })
})
