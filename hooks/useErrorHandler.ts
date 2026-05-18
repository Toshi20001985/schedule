'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { normalizeError, getUserMessage } from '@/lib/errors'
import { useToast } from '@/components/ToastProvider'

/**
 * エラーを種別に応じて処理するグローバルハンドラを返す。
 *
 * 使用例:
 * ```typescript
 * const handleError = useErrorHandler()
 * try {
 *   await someOperation()
 * } catch (e) {
 *   handleError(e)
 * }
 * ```
 *
 * エラー種別ごとの挙動:
 * - AUTH_REQUIRED   : トースト表示 → /auth/login へリダイレクト
 * - NETWORK_ERROR   : warning トーストを表示
 * - PERMISSION_DENIED / SERVER_ERROR / UNKNOWN_ERROR : error トーストを表示
 */
export function useErrorHandler() {
  const router = useRouter()
  const { showToast } = useToast()

  return useCallback((error: unknown) => {
    const appError = normalizeError(error)

    if (process.env.NODE_ENV === 'development') {
      console.error('[AppError]', appError.code, appError.message, appError.cause)
    }

    switch (appError.code) {
      case 'AUTH_REQUIRED':
        showToast(getUserMessage(appError), { variant: 'error' })
        router.push('/auth/login')
        break

      case 'NETWORK_ERROR':
        showToast(getUserMessage(appError), { variant: 'warning' })
        break

      default:
        showToast(getUserMessage(appError), { variant: 'error' })
    }
  }, [router, showToast])
}
