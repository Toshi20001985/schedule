'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, List, Search, Settings } from 'lucide-react'
import { haptic } from '@/lib/haptics'

const tabs = [
  { href: '/',          icon: Home,        label: 'ホーム' },
  { href: '/calendar',  icon: CalendarDays, label: 'カレンダー' },
  { href: '/list',      icon: List,        label: 'リスト' },
  { href: '/search',    icon: Search,      label: '検索' },
  { href: '/settings',  icon: Settings,    label: '設定' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(250, 245, 238, 0.85)',
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        borderTop: '0.5px solid rgba(0,0,0,0.07)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-stretch">
        {tabs.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => haptic('selection')}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-opacity active:opacity-50"
              style={{ color: isActive ? '#1A1A1A' : '#A3A3A3' }}
            >
              <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-xs" style={{ fontWeight: isActive ? 600 : 400 }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
