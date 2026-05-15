'use client'

import { useReducedMotion } from 'framer-motion'
import { ReactNode } from 'react'

/**
 * ページ遷移フェードイン。
 * framer-motion の motion.div を使わず CSS animation に変更。
 * → motion.div が内部で will-change: transform を設定することで
 *   position:fixed 子要素の含有ブロックが崩れるバグを防ぐ。
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <div className={reduced ? undefined : 'page-fade-in'}>
      {children}
    </div>
  )
}
