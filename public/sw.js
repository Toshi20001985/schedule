// Service Worker for Layover PWA
// v2: /_next/static/ の JS・CSS チャンクをキャッシュファーストで保持
const CACHE_NAME    = 'layover-v2'
const STATIC_CACHE  = 'layover-static-v2'

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
]

// ────────────────────────────────────────────────────────────
// Install — プリキャッシュ
// ────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ────────────────────────────────────────────────────────────
// Activate — 古いキャッシュを削除
// ────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, STATIC_CACHE]
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      )
    )
  )
  self.clients.claim()
})

// ────────────────────────────────────────────────────────────
// Fetch
// ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Supabase API・認証エンドポイントは SW を素通り（キャッシュしない）
  if (
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  // /_next/static/ の JS・CSS チャンク → キャッシュファースト
  // Next.js はファイル名にコンテンツハッシュを付与するため、
  // 一度キャッシュしたファイルは永遠に使い回せる（内容が変わればURLも変わる）
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached

        try {
          const response = await fetch(request)
          if (response.ok) cache.put(request, response.clone())
          return response
        } catch {
          // オフラインかつ未キャッシュ → 503 を返してブラウザに制御を戻す
          return new Response('Service Unavailable', { status: 503 })
        }
      })
    )
    return
  }

  // ナビゲーション・その他 → ネットワークファースト、失敗時にキャッシュへフォールバック
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone())
          })
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached

        // ナビゲーションのオフラインフォールバック → トップページ（キャッシュ済み）
        if (request.mode === 'navigate') {
          return caches.match('/') ?? new Response('Offline', { status: 503 })
        }

        // その他（画像・フォント等）がオフライン・未キャッシュ → 503 を返す
        return new Response('Service Unavailable', { status: 503 })
      })
  )
})
