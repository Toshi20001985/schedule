'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ────────────────────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────────────────────

export type ToastVariant = 'default' | 'success' | 'error' | 'warning'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (message: string, options?: { variant?: ToastVariant }) => void
}

// ────────────────────────────────────────────────────────────
// Context（デフォルトは no-op でテスト・SSR でも安全）
// ────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

// ────────────────────────────────────────────────────────────
// バリアント別スタイル（アプリのデザイン言語に合わせた配色）
// ────────────────────────────────────────────────────────────

const variantStyle: Record<ToastVariant, { bg: string; color: string }> = {
  default: { bg: '#1A1A1A', color: '#FFFFFF' },   // 既存 Toast と同色
  success: { bg: '#4A7C59', color: '#FFFFFF' },   // trip アクセント色
  error:   { bg: '#B5465A', color: '#FFFFFF' },   // 削除ボタン色
  warning: { bg: '#B07D2C', color: '#FFFFFF' },   // todo カテゴリ色
}

// ────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────

/**
 * グローバルトースト通知プロバイダー。
 * app/layout.tsx の <body> 直下に配置すること。
 *
 * ⚠️ トースト要素は position: fixed を使用。
 *    opacity アニメーション中の祖先や transform を持つ祖先の中に
 *    入れると消える問題があるが、ルートレイアウト直下なので安全。
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((
    message: string,
    options: { variant?: ToastVariant } = {},
  ) => {
    const id = `${Date.now()}-${Math.random()}`
    const variant = options.variant ?? 'default'
    setToasts(prev => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* トースト表示領域 — 画面上部・セーフエリア対応 */}
      <div
        className="fixed left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none"
        style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ y: -16, opacity: 0, scale: 0.96 }}
              animate={{ y: 0,   opacity: 1, scale: 1    }}
              exit={{    y: -8,  opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg"
              style={{
                backgroundColor: variantStyle[toast.variant].bg,
                color:           variantStyle[toast.variant].color,
                maxWidth:        'calc(100vw - 32px)',
                whiteSpace:      'nowrap',
                overflow:        'hidden',
                textOverflow:    'ellipsis',
              }}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// ────────────────────────────────────────────────────────────
// フック
// ────────────────────────────────────────────────────────────

export function useToast() {
  return useContext(ToastContext)
}
