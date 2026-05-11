import BottomNav from '@/components/BottomNav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: '#FAF5EE' }}>
      <main
        className="flex-1 overflow-y-auto"
        style={{
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
