import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // DSN が未設定の場合は無効（開発環境・デモ環境）
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.E2E_TEST !== 'true',

  // パフォーマンストレース: 本番で 10% サンプリング
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  environment: process.env.NODE_ENV,

  // パスワード等の機密データをイベントから除去
  beforeSend(event) {
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>
      delete data.password
    }
    return event
  },
})
