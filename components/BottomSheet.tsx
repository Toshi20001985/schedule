'use client'

import { Drawer } from 'vaul'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  snapPoints?: (string | number)[]
}

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  snapPoints,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={v => !v && onClose()} snapPoints={snapPoints}>
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col outline-none"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px 16px 0 0',
            borderTop: '0.5px solid #E5E5E5',
            maxHeight: '92dvh',
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-8 h-1 rounded-full" style={{ backgroundColor: '#E5E5E5' }} />
          </div>

          {/* Header */}
          {title ? (
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: '0.5px solid #E5E5E5' }}
            >
              <Drawer.Title className="text-base font-semibold" style={{ color: '#1A1A1A' }}>
                {title}
              </Drawer.Title>
              <button
                onClick={onClose}
                className="p-1.5 transition-opacity active:opacity-50"
                style={{ color: '#A3A3A3' }}
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <Drawer.Title className="sr-only">シート</Drawer.Title>
          )}

          {/* Content */}
          <div
            data-vaul-no-drag
            className="flex-1 overflow-y-auto px-5 py-4"
            style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 16px)`, overscrollBehavior: 'contain' }}
          >
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
