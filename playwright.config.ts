import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,   // 同一 DB / state の競合を避けるため逐次実行
  workers: 1,
  reporter: 'list',
  timeout: 60_000,   // テスト全体タイムアウト（マップページのタイル取得に時間がかかるため延長）
  use: {
    baseURL: 'http://localhost:3099',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',   // システム Chrome を使用（別途 Chromium DL 不要）
      },
    },
  ],
  webServer: {
    // ポート 3099 を使用して既存の dev サーバー（3000）と競合しないようにする
    command: 'npx next dev -p 3099',
    url: 'http://localhost:3099',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // proxy.ts の認証チェックをスキップ
      E2E_TEST: 'true',
      // Node.js ヒープを増やして OOM を防ぐ
      NODE_OPTIONS: '--max-old-space-size=4096',
    },
  },
})
