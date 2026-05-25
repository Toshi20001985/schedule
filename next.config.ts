import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

// Content Security Policy
// unsafe-inline: Next.js App Router の hydration インラインスクリプト・Tailwind インラインスタイルに必要
// unsafe-eval: 開発ビルドで Turbopack が使用（本番では不要だが互換性のため含める）
const CSP = [
  "default-src 'self'",
  // Vercel Analytics/Speed Insights のスクリプトを許可
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
  // globals.css の Google Fonts @import を許可
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Google Fonts の実フォントファイルを許可
  "font-src 'self' https://fonts.gstatic.com",
  // Leaflet の地図タイル（OpenStreetMap・CARTO）を許可
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://*.supabase.co",
  // Supabase API/WebSocket + Nominatim + Vercel Analytics/Speed Insights + Sentry
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org https://va.vercel-scripts.com https://vitals.vercel-insights.com https://*.ingest.sentry.io",
  "worker-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: CSP },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      // セキュリティヘッダー：全ページに適用
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // PWA manifest
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      // Service Worker
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

// Sentry: SENTRY_AUTH_TOKEN 未設定のため source map アップロードなし
// DSN は NEXT_PUBLIC_SENTRY_DSN 環境変数で制御（未設定時は無効化）
export default withSentryConfig(nextConfig, {
  silent: true,       // ビルドログを抑制
  disableLogger: true, // バンドルサイズ削減のため Sentry ロガーを除去
})
