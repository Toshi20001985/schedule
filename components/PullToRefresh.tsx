'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { haptic } from '@/lib/haptics'

interface Props {
  onRefresh: () => Promise<void>
  children: ReactNode
}

const THRESHOLD = 80
const MAX_PULL = 120

export function PullToRefresh({ onRefresh, children }: Props) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  // onRefresh を ref で保持して useEffect の再登録を防ぐ
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => { onRefreshRef.current = onRefresh }, [onRefresh])

  const startYRef      = useRef(0)
  const startXRef      = useRef(0)
  const pullDistRef    = useRef(0)
  const isPullingRef   = useRef(false)
  const refreshingRef  = useRef(false)
  // null = 未確定, 'v' = 縦, 'h' = 横
  const axisRef        = useRef<'v' | 'h' | null>(null)
  // このコンポーネントが touchstart を受け取ったかどうか
  // （マウント直後に進行中のジェスチャーを拾わないためのガード）
  const touchStartedRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // overflow-y: auto/scroll の最初の祖先要素を取得
    function findScrollParent(node: HTMLElement): Element {
      let cur: HTMLElement | null = node.parentElement
      while (cur) {
        const { overflowY } = getComputedStyle(cur)
        if (overflowY === 'auto' || overflowY === 'scroll') return cur
        cur = cur.parentElement
      }
      return document.documentElement
    }
    const scrollParent = findScrollParent(el)

    function resetPull() {
      isPullingRef.current = false
      pullDistRef.current  = 0
      setPullDistance(0)
    }

    function onTouchStart(e: TouchEvent) {
      if (refreshingRef.current) return
      if (scrollParent.scrollTop > 0) return
      touchStartedRef.current  = true
      startYRef.current        = e.touches[0].clientY
      startXRef.current        = e.touches[0].clientX
      axisRef.current          = null
      isPullingRef.current     = false
    }

    function onTouchMove(e: TouchEvent) {
      // このコンポーネントのマウント前に始まったジェスチャーは無視
      if (!touchStartedRef.current) return
      if (refreshingRef.current) return
      if (scrollParent.scrollTop > 0) {
        if (isPullingRef.current) resetPull()
        return
      }

      const dy = e.touches[0].clientY - startYRef.current
      const dx = e.touches[0].clientX - startXRef.current

      // 最初の有意な動きで軸を確定（5px 以上）
      if (axisRef.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        axisRef.current = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h'
      }

      // 横スワイプと判定されたら PullToRefresh は関与しない
      if (axisRef.current === 'h') {
        if (isPullingRef.current) resetPull()
        return
      }

      if (dy <= 0) {
        if (isPullingRef.current) resetPull()
        return
      }

      // 縦下方向の確定したジェスチャーのみスクロールを止めてプル動作
      e.preventDefault()
      isPullingRef.current = true
      const dist = Math.min(dy * 0.5, MAX_PULL)
      pullDistRef.current  = dist
      setPullDistance(dist)
    }

    async function onTouchEnd() {
      touchStartedRef.current = false
      axisRef.current = null
      if (!isPullingRef.current) return
      isPullingRef.current = false
      const dist = pullDistRef.current
      pullDistRef.current = 0
      setPullDistance(0)

      if (dist >= THRESHOLD) {
        haptic('success')
        refreshingRef.current = true
        setRefreshing(true)
        try {
          await onRefreshRef.current()
        } finally {
          refreshingRef.current = false
          setRefreshing(false)
        }
      }
    }

    function onTouchCancel() {
      touchStartedRef.current = false
      axisRef.current = null
      if (isPullingRef.current) resetPull()
    }

    el.addEventListener('touchstart',  onTouchStart,  { passive: true })
    el.addEventListener('touchmove',   onTouchMove,   { passive: false })
    el.addEventListener('touchend',    onTouchEnd,    { passive: true })
    el.addEventListener('touchcancel', onTouchCancel, { passive: true })

    return () => {
      el.removeEventListener('touchstart',  onTouchStart)
      el.removeEventListener('touchmove',   onTouchMove)
      el.removeEventListener('touchend',    onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
      // アンマウント時にリフレッシュ中フラグもリセット
      refreshingRef.current   = false
      touchStartedRef.current = false
    }
  }, [])

  const thresholdReached = pullDistance >= THRESHOLD
  // インジケーターの高さで content を自然に押し下げる（transform は使わない）
  // → position: fixed の FAB に干渉しない
  const indicatorHeight = refreshing ? 48 : pullDistance

  return (
    <div ref={containerRef}>
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center gap-2"
        style={{
          height: indicatorHeight,
          overflow: 'hidden',
          transition: !refreshing && pullDistance === 0 ? 'height 0.2s ease' : 'none',
          color: thresholdReached || refreshing ? 'var(--color-text)' : 'var(--color-subtle)',
        }}
      >
        <RefreshCw
          size={16}
          className={refreshing ? 'animate-spin' : ''}
          style={!refreshing ? { transform: `rotate(${pullDistance * 2.5}deg)` } : undefined}
        />
        {!refreshing && pullDistance > 0 && (
          <span className="text-xs">
            {thresholdReached ? '離して更新' : '引っ張って更新'}
          </span>
        )}
      </div>

      {children}
    </div>
  )
}
