'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 画面左端（24px 以内）から右にスワイプで router.back()。
 * layout に配置して全画面で機能させる。
 */
export function EdgeSwipeBack() {
  const router = useRouter()

  useEffect(() => {
    let startX = 0
    let startY = 0
    let isEdge = false

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      isEdge = startX < 24
    }

    function onTouchEnd(e: TouchEvent) {
      if (!isEdge) return
      const dx = e.changedTouches[0].clientX - startX
      const dy = Math.abs(e.changedTouches[0].clientY - startY)
      // 80px 以上の右スワイプ かつ 縦方向の動きが小さい
      if (dx > 80 && dy < dx * 0.6) {
        router.back()
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend',   onTouchEnd,   { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend',   onTouchEnd)
    }
  }, [router])

  return null
}
