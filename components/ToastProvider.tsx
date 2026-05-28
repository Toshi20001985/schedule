'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { springs } from '@/lib/motion'

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
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* トースト表示領域 — BottomNav の上、セーフエリア対応 */}
      <div
        className="fixed left-0 right-0 z-[60] flex flex-col-reverse items-center gap-2 pointer-events-none px-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px + 12px)' }}
      >
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ y: 20, opacity: 0, scale: 0.94 }}
              animate={{ y: 0,  opacity: 1, scale: 1    }}
              exit={{    y: 10, opacity: 0, scale: 0.96 }}
              transition={springs.snappy}
              className="px-4 py-3 rounded-2xl text-sm font-medium"
              style={{
                backgroundColor: variantStyle[toast.variant].bg,
                color:           variantStyle[toast.variant].color,
                maxWidth:        'calc(100vw - 32px)',
                width:           '100%',
                backdropFilter:  'blur(16px) saturate(160%)',
                WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                boxShadow:       '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
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
