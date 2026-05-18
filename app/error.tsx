'use client'

import { useEffect } from 'react'

/**
 * Next.js App Router のルートエラー境界。
 * ページコンポーネントで catch されなかったエラーをここで受け取る。
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Unhandled Error]', error)
    }
  }, [error])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-dvh px-8 gap-6"
      style={{ backgroundColor: '#FAF5EE' }}
    >
      <div className="text-center">
        <p
          className="text-xs font-medium uppercase tracking-widest mb-3"
          style={{ color: '#A3A3A3' }}
        >
          Error
        </p>
        <h2 className="text-lg font-semibold mb-2" style={{ color: '#1A1A1A' }}>
          問題が発生しました
        </h2>
        <p className="text-sm" style={{ color: '#737373' }}>
          申し訳ありません。もう一度お試しください。
        </p>
      </div>
      <button
        onClick={reset}
        className="px-6 py-3 text-sm font-medium transition-opacity active:opacity-70"
        style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: '10px' }}
      >
        再試行
      </button>
    </div>
  )
}
