'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { haptic } from '@/lib/haptics'

interface SwipeableListItemProps {
  children: ReactNode
  onEdit?: () => void
  onDelete?: () => void
}

const BTN_W    = 64    // 各ボタンの幅(px)
const OPEN_X   = -128  // 2ボタン分の移動量
const OPEN_THR = -48   // メニューを開くスワイプ閾値

/**
 * 左スワイプで編集・削除ボタンを表示するリストアイテムラッパー。
 * - ネイティブ touchmove (passive: false) で縦スクロールと排他制御
 * - CSS transform アニメーション（React state は最小）
 */
export function SwipeableListItem({ children, onEdit, onDelete }: SwipeableListItemProps) {
  const outerRef  = useRef<HTMLDivElement>(null)
  const innerRef  = useRef<HTMLDivElement>(null)
  const currentX  = useRef(0)
  const isOpenRef = useRef(false)
  const [isOpen, setIsOpen] = useState(false)

  /** transform をアニメーション付きで設定 */
  const setX = (x: number, animate: boolean) => {
    const el = innerRef.current
    if (!el) return
    el.style.transition = animate ? 'transform 220ms cubic-bezier(0.25,0.1,0.25,1)' : 'none'
    el.style.transform  = `translateX(${x}px)`
    currentX.current    = x
  }

  const close = (animate = true) => {
    setX(0, animate)
    isOpenRef.current = false
    setIsOpen(false)
  }

  const openMenu = () => {
    setX(OPEN_X, true)
    isOpenRef.current = true
    setIsOpen(true)
    haptic('light')
  }

  // ネイティブタッチイベント（touchmove は passive: false で preventDefault 可能に）
  useEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    let startX = 0
    let startY = 0
    let baseX  = 0
    let axis: 'h' | 'v' | null = null   // 判定前は null

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      baseX  = currentX.current
      axis   = null
    }

    function onTouchMove(e: TouchEvent) {
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY

      // 最初の5px で軸を確定
      if (axis === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }
      if (axis !== 'h') return

      e.preventDefault()  // 縦スクロールをキャンセル

      if (!inner) return
      const btnCount = (onEdit ? 1 : 0) + (onDelete ? 1 : 0)
      const minX = -(BTN_W * btnCount) - 20  // 少し引っ張り代
      const newX = Math.min(0, Math.max(minX, baseX + dx))
      inner.style.transition = 'none'
      inner.style.transform  = `translateX(${newX}px)`
      currentX.current       = newX
    }

    function onTouchEnd() {
      if (axis !== 'h') { axis = null; return }
      axis = null

      const x = currentX.current
      if (x < OPEN_THR) {
        openMenu()
      } else {
        close()
      }
    }

    outer.addEventListener('touchstart', onTouchStart, { passive: true  })
    outer.addEventListener('touchmove',  onTouchMove,  { passive: false })
    outer.addEventListener('touchend',   onTouchEnd,   { passive: true  })

    return () => {
      outer.removeEventListener('touchstart', onTouchStart)
      outer.removeEventListener('touchmove',  onTouchMove)
      outer.removeEventListener('touchend',   onTouchEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onEdit, onDelete])

  /** コンテンツタップ → 開いていれば閉じる（ボタン以外） */
  function handleContentClick(e: React.MouseEvent) {
    if (!isOpenRef.current) return
    const target = e.target as HTMLElement
    if (!target.closest('button')) {
      close()
      e.stopPropagation()
    }
  }

  const btnCount = (onEdit ? 1 : 0) + (onDelete ? 1 : 0)

  return (
    <div
      ref={outerRef}
      className="relative"
      style={{ borderRadius: '12px', overflow: 'hidden' }}
    >
      {/* 背景: 編集・削除ボタン */}
      {btnCount > 0 && (
        <div
          className="absolute right-0 top-0 bottom-0 flex"
          style={{ width: `${BTN_W * btnCount}px` }}
        >
          {onEdit && (
            <button
              className="flex-1 flex flex-col items-center justify-center gap-1 active:opacity-70 transition-opacity"
              style={{ backgroundColor: '#2D6B9E' }}
              onClick={() => { close(); onEdit() }}
            >
              <Pencil size={16} style={{ color: '#FFF' }} />
              <span style={{ color: '#FFF', fontSize: '10px', fontWeight: 500 }}>編集</span>
            </button>
          )}
          {onDelete && (
            <button
              className="flex-1 flex flex-col items-center justify-center gap-1 active:opacity-70 transition-opacity"
              style={{ backgroundColor: '#B5465A' }}
              onClick={() => { close(); haptic('warning'); onDelete() }}
            >
              <Trash2 size={16} style={{ color: '#FFF' }} />
              <span style={{ color: '#FFF', fontSize: '10px', fontWeight: 500 }}>削除</span>
            </button>
          )}
        </div>
      )}

      {/* スワイプ可能なコンテンツ */}
      <div
        ref={innerRef}
        onClick={handleContentClick}
        style={{
          transform: 'translateX(0)',
          willChange: 'transform',
          position: 'relative',
          zIndex: 1,
          // 影: 開いているときに浮き感
          boxShadow: isOpen ? '0 4px 16px rgba(0,0,0,0.10)' : 'none',
          transition: 'box-shadow 220ms ease',
        }}
      >
        {children}
      </div>
    </div>
  )
}
