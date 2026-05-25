import { test, expect } from '@playwright/test'

test.describe('Security: レスポンスヘッダー', () => {
  test('X-Frame-Options が DENY に設定されている', async ({ page }) => {
    const response = await page.goto('/')
    const header = response?.headers()['x-frame-options']
    expect(header).toBe('DENY')
  })

  test('X-Content-Type-Options が nosniff に設定されている', async ({ page }) => {
    const response = await page.goto('/')
    const header = response?.headers()['x-content-type-options']
    expect(header).toBe('nosniff')
  })

  test('Content-Security-Policy ヘッダーが存在する', async ({ page }) => {
    const response = await page.goto('/')
    const header = response?.headers()['content-security-policy']
    expect(header).toBeTruthy()
    expect(header).toContain("default-src 'self'")
    expect(header).toContain("frame-src 'none'")
    expect(header).toContain("object-src 'none'")
  })

  test('Referrer-Policy ヘッダーが設定されている', async ({ page }) => {
    const response = await page.goto('/')
    const header = response?.headers()['referrer-policy']
    expect(header).toBe('strict-origin-when-cross-origin')
  })
})

test.describe('Security: パスワードバリデーション', () => {
  test('パスワードが7文字以下の場合はエラーが表示される', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('load')

    await page.fill('input[type="text"]', 'テストユーザー')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'abc123')  // 6文字

    await page.click('button[type="submit"]')

    await expect(page.getByText('パスワードは8文字以上にしてください。')).toBeVisible()
  })

  test('パスワードに数字が含まれない場合はエラーが表示される', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('load')

    await page.fill('input[type="text"]', 'テストユーザー')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'abcdefgh')  // 英字のみ

    await page.click('button[type="submit"]')

    await expect(page.getByText('パスワードは英字と数字を両方含めてください。')).toBeVisible()
  })

  test('パスワードに英字が含まれない場合はエラーが表示される', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('load')

    await page.fill('input[type="text"]', 'テストユーザー')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', '12345678')  // 数字のみ

    await page.click('button[type="submit"]')

    await expect(page.getByText('パスワードは英字と数字を両方含めてください。')).toBeVisible()
  })
})
