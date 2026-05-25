import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // DSN が未設定の場合は無効
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.E2E_TEST !== 'true',

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  environment: process.env.NODE_ENV,
})
