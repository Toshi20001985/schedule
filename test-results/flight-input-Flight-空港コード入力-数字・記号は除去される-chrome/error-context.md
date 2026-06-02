# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flight-input.spec.ts >> Flight: 空港コード入力 >> 数字・記号は除去される
- Location: tests\flight-input.spec.ts:42:7

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  locator('[name="departure_airport"]')
Expected: "HND"
Received: "HN"
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" with timeout 5000ms
  - waiting for locator('[name="departure_airport"]')
    14 × locator resolved to <input value="HN" maxlength="4" placeholder="HND" autocorrect="off" autocomplete="off" name="departure_airport" autocapitalize="characters"/>
       - unexpected value "HN"

```

```yaml
- textbox "HND": HN
```

# Test source

```ts
  1  | /**
  2  |  * flight-input.spec.ts
  3  |  * 空港コード入力で文字が重複しないことを確認するテスト。
  4  |  * iOS Safari で `toUpperCase()` による onChange 変換が re-fire を引き起こす
  5  |  * バグ（セッション36修正）の回帰テスト。
  6  |  *
  7  |  * テスト環境: E2E_TEST=true で認証バイパス済み。
  8  |  */
  9  | import { test, expect } from '@playwright/test'
  10 | 
  11 | test.describe('Flight: 空港コード入力', () => {
  12 |   test.beforeEach(async ({ page }) => {
  13 |     await page.goto('/calendar')
  14 |     await page.waitForLoadState('networkidle')
  15 |     // FAB をクリックして追加シートを開く
  16 |     await page.getByTestId('fab-add').click()
  17 |     await expect(page.getByText('イベントを追加')).toBeVisible({ timeout: 5000 })
  18 |     // フライトを追加 ボタンをクリック（visit タイプがデフォルトで表示される）
  19 |     await page.getByText('フライトを追加').click()
  20 |     await expect(page.locator('[name="departure_airport"]')).toBeVisible({ timeout: 5000 })
  21 |   })
  22 | 
  23 |   test('出発空港を1文字ずつ入力しても重複しない', async ({ page }) => {
  24 |     const input = page.locator('[name="departure_airport"]')
  25 | 
  26 |     await input.pressSequentially('C', { delay: 50 })
  27 |     await expect(input).toHaveValue('C')
  28 | 
  29 |     await input.pressSequentially('H', { delay: 50 })
  30 |     await expect(input).toHaveValue('CH')
  31 | 
  32 |     await input.pressSequentially('T', { delay: 50 })
  33 |     await expect(input).toHaveValue('CHT')
  34 |   })
  35 | 
  36 |   test('小文字入力が自動で大文字に変換される', async ({ page }) => {
  37 |     const input = page.locator('[name="departure_airport"]')
  38 |     await input.fill('hnd')
  39 |     await expect(input).toHaveValue('HND')
  40 |   })
  41 | 
  42 |   test('数字・記号は除去される', async ({ page }) => {
  43 |     const input = page.locator('[name="departure_airport"]')
  44 |     await input.fill('H1N2D')
> 45 |     await expect(input).toHaveValue('HND')
     |                         ^ Error: expect(locator).toHaveValue(expected) failed
  46 |   })
  47 | 
  48 |   test('到着空港も同様に正常動作する', async ({ page }) => {
  49 |     const input = page.locator('[name="arrival_airport"]')
  50 | 
  51 |     await input.pressSequentially('I', { delay: 50 })
  52 |     await input.pressSequentially('T', { delay: 50 })
  53 |     await input.pressSequentially('M', { delay: 50 })
  54 |     await expect(input).toHaveValue('ITM')
  55 |   })
  56 | 
  57 |   test('便名は英数字のみ受け付ける', async ({ page }) => {
  58 |     const input = page.locator('[name="flight_number"]')
  59 |     await input.fill('nh123')
  60 |     await expect(input).toHaveValue('NH123')
  61 |   })
  62 | })
  63 | 
```