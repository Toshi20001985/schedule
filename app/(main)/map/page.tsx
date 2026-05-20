'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Map as MapIcon, MapPin } from 'lucide-react'
import type { PlacePin } from '@/components/PlacesMap'

// Leaflet は window 必須のため SSR 無効でロード
const PlacesMap = dynamic(() => import('@/components/PlacesMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#A3A3A3', fontSize: '14px' }}>地図を読み込み中...</span>
    </div>
  ),
})

type Filter = 'all' | 'visited' | 'wishlist'

function MapPageInner() {
  const [allPlaces, setAllPlaces] = useState<PlacePin[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState<Filter>('all')

  const load = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setAllPlaces([
        { id: '1', name: '嵐山',           category: '観光',   is_visited: true,  latitude: 35.0095, longitude: 135.6763 },
        { id: '2', name: '新宿御苑',       category: '公園',   is_visited: false, latitude: 35.6851, longitude: 139.7098 },
        { id: '3', name: '鎌倉',           category: '観光',   is_visited: true,  latitude: 35.5590, longitude: 139.7468 },
        { id: '4', name: '大阪城',         category: '観光',   is_visited: false, latitude: 34.6873, longitude: 135.5262 },
        { id: '5', name: 'teamLab Planets', category: 'アート', is_visited: false, latitude: 35.6465, longitude: 139.7882 },
      ])
      setLoading(false)
      return
    }

    const { createClient } = await import('@/lib/supabase/client')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any
    const { data: { user } } = await db.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: userData } = await db
      .from('users')
      .select('couple_id')
      .eq('id', user.id)
      .single()

    if (!userData?.couple_id) { setLoading(false); return }

    const { data: placesData } = await db
      .from('places')
      .select('id, name, category, is_visited, latitude, longitude')
      .eq('couple_id', userData.couple_id)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (placesData) {
      setAllPlaces(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (placesData as any[]).map(p => ({
          id:         p.id,
          name:       p.name,
          category:   p.category ?? 'その他',
          is_visited: p.is_visited,
          latitude:   p.latitude  as number,
          longitude:  p.longitude as number,
        }))
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredPlaces = allPlaces.filter(p => {
    if (filter === 'visited')  return p.is_visited
    if (filter === 'wishlist') return !p.is_visited
    return true
  })

  const visitedCount  = allPlaces.filter(p =>  p.is_visited).length
  const wishlistCount = allPlaces.filter(p => !p.is_visited).length

  return (
    <div style={{
      height: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 72px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ヘッダー */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ height: '48px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <MapIcon size={18} strokeWidth={1.5} style={{ color: '#1A1A1A' }} />
          <h1 className="text-base font-semibold" style={{ color: '#1A1A1A' }}>ふたりの地図</h1>
        </div>
        <Link href="/list" style={{ color: 'var(--color-subtle)', fontSize: '12px' }}>
          リストへ →
        </Link>
      </div>

      {/* マップエリア */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <MapPin size={24} strokeWidth={1.5} style={{ color: '#D4D4D4' }} />
            <span style={{ color: '#A3A3A3', fontSize: '14px' }}>読み込み中...</span>
          </div>
        ) : allPlaces.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <MapPin size={28} strokeWidth={1.5} style={{ color: '#D4D4D4' }} />
            <p style={{ color: '#A3A3A3', fontSize: '14px' }}>地図に表示できる場所がありません</p>
            <p style={{ color: '#C5C5C5', fontSize: '12px' }}>場所を追加すると自動で地図に表示されます</p>
            <Link href="/list" style={{ color: '#6D5BD0', fontSize: '12px', marginTop: '4px' }}>
              場所を追加する →
            </Link>
          </div>
        ) : (
          <>
            <PlacesMap places={filteredPlaces} height="100%" center={[35.6762, 139.6503]} zoom={10} />

            {/* フィルターピル */}
            <div style={{
              position: 'absolute', top: '12px', left: '12px', zIndex: 1000,
              display: 'flex', gap: '6px',
            }}>
              {([
                { key: 'all',      label: 'すべて',   count: allPlaces.length },
                { key: 'visited',  label: '訪問済み', count: visitedCount },
                { key: 'wishlist', label: '行きたい', count: wishlistCount },
              ] as const).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    backgroundColor: filter === key ? '#1A1A1A' : 'rgba(255,255,255,0.92)',
                    color:           filter === key ? '#FFFFFF'  : '#737373',
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '5px 10px',
                    borderRadius: '100px',
                    border: filter === key ? 'none' : '0.5px solid rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  {label} {count}
                </button>
              ))}
            </div>

            {/* 凡例 */}
            <div style={{
              position: 'absolute', bottom: '12px', left: '12px', zIndex: 1000,
              backgroundColor: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: '10px',
              padding: '8px 12px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              border: '0.5px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4A7C59', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#1A1A1A' }}>訪問済み ({visitedCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#6D5BD0', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#1A1A1A' }}>行きたい ({wishlistCount})</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense>
      <MapPageInner />
    </Suspense>
  )
}
