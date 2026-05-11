'use client'

import { Plus } from 'lucide-react'

interface FABProps {
  onClick: () => void
  label?: string
}

export default function FAB({ onClick, label = '追加' }: FABProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="fixed right-4 z-30 flex items-center gap-2 px-5 py-3 active:opacity-70 transition-opacity"
      style={{
        bottom: `calc(env(safe-area-inset-bottom) + 72px)`,
        backgroundColor: '#1A1A1A',
        color: '#FFFFFF',
        borderRadius: '10px',
      }}
    >
      <Plus size={18} strokeWidth={2} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
