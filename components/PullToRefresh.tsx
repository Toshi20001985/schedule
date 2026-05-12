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

  const startYRef    = useRef(0)
  const pullDistRef  = useRef(0)
  const isPullingRef = useRef(false)
  const refreshingRef = useRef(false)

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

    function onTouchStart(e: TouchEvent) {
      if (refreshingRef.current) return
      if (scrollParent.scrollTop > 0) return
      startYRef.current = e.touches[0].clientY
      isPullingRef.current = false
    }

    function onTouchMove(e: TouchEvent) {
      if (refreshingRef.current) return
      if (scrollParent.scrollTop > 0) {
        if (isPullingRef.current) {
          isPullingRef.current = false
          pullDistRef.current = 0
          setPullDistance(0)
        }
        return
      }
      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0) {
        if (isPullingRef.current) {
          isPullingRef.current = false
          pullDistRef.current = 0
          setPullDistance(0)
        }
        return
      }
      e.preventDefault()
      isPullingRef.current = true
      const dist = Math.min(dy * 0.5, MAX_PULL)
      pullDistRef.current = dist
      setPullDistance(dist)
    }

    async function onTouchEnd() {
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

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd,   { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
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
          color: thresholdReached || refreshing ? '#1A1A1A' : '#A3A3A3',
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
