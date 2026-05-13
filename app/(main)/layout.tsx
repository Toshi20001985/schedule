import BottomNav from '@/components/BottomNav'
import { EdgeSwipeBack } from '@/components/EdgeSwipeBack'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-dvh" style={{ backgroundColor: '#FAF5EE' }}>
      <EdgeSwipeBack />
      <main
        className="flex-1 overflow-y-auto"
        style={{
          minHeight: 0,
          paddingBottom: `calc(env(safe-area-inset-bottom) + 72px)`,
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
