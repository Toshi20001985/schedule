'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string | null
  onDismiss: () => void
}

/** 画面上部に一時表示するトースト通知 */
export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div
      className="fixed left-1/2 z-50 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg pointer-events-none"
      style={{
        top: 'calc(env(safe-area-inset-top) + 12px)',
        backgroundColor: '#1A1A1A',
        color: '#FFFFFF',
        maxWidth: 'calc(100vw - 32px)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {message}
    </div>
  )
}
