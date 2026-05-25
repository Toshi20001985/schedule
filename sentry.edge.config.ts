import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.E2E_TEST !== 'true',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
})
