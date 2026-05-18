'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * オフライン時に画面上部に表示される固定バナー。
 *
 * ⚠️ app/layout.tsx の <ToastProvider> 内・<body> 直下に配置すること。
 *    position: fixed のため、opacity アニメーション中の祖先（PageTransition等）の
 *    外側でないと透明になる問題がある（CLAUDE_CHANGES.md 参照）。
 *    ルートレイアウト直下なので安全。
 *
 * z-index: 60 — ToastProvider（z-50）より上に重ねてバナーを優先表示する。
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{    y: -40, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="fixed left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium"
          style={{
            top: 0,
            backgroundColor: '#1A1A1A',
            color: '#FFFFFF',
            paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
          }}
        >
          <WifiOff size={13} strokeWidth={2.5} />
          オフライン — 変更は復帰後に同期されます
        </motion.div>
      )}
    </AnimatePresence>
  )
}
