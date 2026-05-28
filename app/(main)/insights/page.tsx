'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { BarChart2, MapPin, Film, Check } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Card from '@/components/ui/Card'
import { PullToRefresh } from '@/components/PullToRefresh'
import { PageTransition } from '@/components/PageTransition'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'

// カテゴリバー用アニメーション variants
const categoryContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.3 },
  },
}
const categoryItem = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { ease: [0.16, 1, 0.3, 1] as [number, number, number, number], duration: 0.5 } },
}

interface Place {
  id: string
  name: string
  category: string
  is_visited: boolean
}

interface MediaItem {
  id: string
  title: string
  media_type: string
  is_done: boolean
}

function InsightsPageInner() {
  const [places, setPlaces]   = useState<Place[]>([])
  const [media,  setMedia]    = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setPlaces([
        { id: '1', name: '新宿御苑',        category: '公園',       is_visited: true  },
        { id: '2', name: '横浜中華街',       category: 'グルメ',     is_visited: false },
        { id: '3', name: '嵐山',             category: '観光',       is_visited: true  },
        { id: '4', name: 'teamLab Planets',  category: 'アート',     is_visited: false },
        { id: '5', name: '大阪城',           category: '観光',       is_visited: false },
        { id: '6', name: '鎌倉',             category: '観光',       is_visited: true  },
        { id: '7', name: '渋谷でランチ',     category: 'グルメ',     is_visited: false },
        { id: '8', name: '富士山',           category: 'アウトドア', is_visited: false },
      ])
      setMedia([
        { id: '1', title: '君の名は。',               media_type: 'movie', is_done: true  },
        { id: '2', title: 'ボヘミアン・ラプソディ',   media_type: 'movie', is_done: true  },
        { id: '3', title: 'ドライブ・マイ・カー',     media_type: 'movie', is_done: true  },
        { id: '4', title: 'バービー',                 media_type: 'movie', is_done: false },
        { id: '5', title: 'スラムダンク',             media_type: 'anime', is_done: false },
        { id: '6', title: '呪術廻戦',                 media_type: 'tv',    is_done: false },
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
    const coupleId = userData.couple_id

    const [{ data: placesData }, { data: mediaData }] = await Promise.all([
      db.from('places')
        .select('id, name, category, is_visited')
        .eq('couple_id', coupleId),
      db.from('media')
        .select('id, title, media_type, is_done')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false }),
    ])

    if (placesData) {
      setPlaces(placesData.map((p: {
        id: string; name: string; category: string | null; is_visited: boolean
      }) => ({
        id: p.id,
        name: p.name,
        category: p.category ?? 'その他',
        is_visited: p.is_visited,
      })))
    }
    if (mediaData) {
      setMedia(mediaData.map((m: {
        id: string; title: string; media_type: string; is_done: boolean
      }) => ({
        id: m.id,
        title: m.title,
        media_type: m.media_type,
        is_done: m.is_done,
      })))
    }

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useAutoRefresh(load)

  // ── 行きたい場所 統計 ─────────────────────────────────────
  const visitedCount  = places.filter(p => p.is_visited).length
  const totalPlaces   = places.length
  const rate          = totalPlaces > 0 ? (visitedCount / totalPlaces) * 100 : 0

  // カテゴリ別集計（件数の多い順）
  const categoryStats = (() => {
    const map = new Map<string, { total: number; visited: number }>()
    for (const p of places) {
      const cat = p.category || 'その他'
      if (!map.has(cat)) map.set(cat, { total: 0, visited: 0 })
      const s = map.get(cat)!
      s.total++
      if (p.is_visited) s.visited++
    }
    return Array.from(map.entries())
      .map(([cat, s]) => ({ cat, ...s }))
      .sort((a, b) => b.total - a.total)
  })()

  // ── 映画 統計 ──────────────────────────────────────────────
  const allMovies     = media.filter(m => m.media_type === 'movie')
  const watchedMovies = allMovies.filter(m => m.is_done)

  return (
    <PageTransition>
    <PullToRefresh onRefresh={load}>
    <div className="px-4 pt-6 pb-6 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 size={18} strokeWidth={1.5} style={{ color: '#1A1A1A' }} />
        <h1 className="text-lg font-semibold" style={{ color: '#1A1A1A' }}>インサイト</h1>
      </div>

      <div className="space-y-4">

        {/* ── 行きたい場所 達成率カード ── */}
        <Card padding="lg" shadow="sm" className="relative overflow-hidden">
          {/* 紫のグラデーション（右上から） */}
          <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(109,91,208,0.05) 0%, transparent 55%)' }} />
          {/* カードヘッダー */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p style={{ color: 'var(--color-subtle)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '5px' }}>
                Places Completion
              </p>
              {loading ? (
                <div className="skeleton h-12 w-24 rounded" />
              ) : (
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '52px', fontWeight: 400, color: 'var(--color-text)', lineHeight: 1, letterSpacing: '-0.02em', fontFeatureSettings: '"lnum" 1, "tnum" 1' }}>
                    {Math.round(rate)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '28px', fontWeight: 400, color: 'var(--color-muted)' }}>%</span>
                </div>
              )}
              {!loading && (
                <p className="tabular" style={{ color: 'var(--color-subtle)', fontSize: '12px', marginTop: '6px' }}>
                  {visitedCount} / {totalPlaces} か所 訪問済み
                </p>
              )}
            </div>
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--color-trip-soft)' }}>
              <MapPin size={16} strokeWidth={1.5} style={{ color: 'var(--color-trip-accent)' }} />
            </div>
          </div>

          {/* プログレスバー */}
          {loading ? (
            <div className="skeleton h-2.5 rounded-full w-full mb-5" />
          ) : (
            <div
              className="relative rounded-full overflow-hidden mb-5"
              style={{ height: '10px', backgroundColor: '#F0F0EE' }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${rate}%` }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, #6D5BD0 0%, #4A7C59 100%)',
                  borderRadius: '100px',
                }}
              />
            </div>
          )}

          {/* データ0件の空状態 */}
          {!loading && totalPlaces === 0 && (
            <div className="flex flex-col items-center py-8 text-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-trip-soft), var(--color-visit-soft))' }}>
                <MapPin size={22} strokeWidth={1.5} style={{ color: 'var(--color-foreground-secondary)' }} />
              </div>
              <p style={{ color: 'var(--color-foreground-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                ふたりの行きたい場所を<br />貯めていこう
              </p>
              <Link href="/list" style={{ color: 'var(--color-visit-accent)', fontSize: '13px', fontWeight: 500 }}>
                場所を追加する →
              </Link>
            </div>
          )}

          {/* カテゴリ別内訳 */}
          {!loading && totalPlaces > 0 && categoryStats.length > 0 && (
            <div className="space-y-3">
              <p style={{ color: 'var(--color-subtle)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500 }}>
                カテゴリ別
              </p>
              <motion.div
                className="space-y-3"
                variants={categoryContainer}
                initial="hidden"
                animate="show"
              >
                {categoryStats.map(({ cat, total, visited }) => {
                  const catRate = total > 0 ? (visited / total) * 100 : 0
                  return (
                    <motion.div key={cat} variants={categoryItem} className="flex items-center gap-3">
                      <span className="flex-shrink-0" style={{ color: 'var(--color-text)', fontSize: '13px', width: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cat}
                      </span>
                      <div className="flex-1 relative rounded-full overflow-hidden" style={{ height: '4px', backgroundColor: '#F0F0EE' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${catRate}%` }}
                          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'var(--color-visit-accent)',
                            borderRadius: '100px',
                          }}
                        />
                      </div>
                      <span className="tabular flex-shrink-0" style={{ color: 'var(--color-subtle)', fontSize: '11px', width: '36px', textAlign: 'right' }}>
                        {visited}/{total}
                      </span>
                    </motion.div>
                  )
                })}
              </motion.div>
            </div>
          )}
        </Card>

        {/* ── 観た映画カード ── */}
        <Card padding="lg" shadow="sm" className="relative overflow-hidden">
          {/* ピンクのグラデーション（右上から） */}
          <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(255,159,184,0.07) 0%, transparent 55%)' }} />
          {/* カードヘッダー */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p style={{ color: 'var(--color-subtle)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '5px' }}>
                Movies Together
              </p>
              {loading ? (
                <div className="skeleton h-12 w-24 rounded" />
              ) : (
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '52px', fontWeight: 400, color: 'var(--color-text)', lineHeight: 1, letterSpacing: '-0.02em', fontFeatureSettings: '"lnum" 1, "tnum" 1' }}>
                    {watchedMovies.length}
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '22px', fontWeight: 400, color: 'var(--color-muted)' }}>本観た</span>
                </div>
              )}
              {!loading && allMovies.length > watchedMovies.length && (
                <p className="tabular" style={{ color: 'var(--color-subtle)', fontSize: '12px', marginTop: '4px' }}>
                  あと {allMovies.length - watchedMovies.length} 本観たい
                </p>
              )}
            </div>
            <div className="p-2 rounded-xl" style={{ backgroundColor: '#F3F0FF' }}>
              <Film size={16} strokeWidth={1.5} style={{ color: '#6D5BD0' }} />
            </div>
          </div>

          {/* スケルトン */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton w-7 h-4 rounded" />
                  <div className="skeleton w-10 h-14 rounded-lg flex-shrink-0" />
                  <div className="skeleton h-3 rounded flex-1" />
                </div>
              ))}
            </div>
          )}

          {/* データ0件 */}
          {!loading && allMovies.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F3F0FF, #FFE4ED)' }}>
                <Film size={22} strokeWidth={1.5} style={{ color: 'var(--color-foreground-secondary)' }} />
              </div>
              <p style={{ color: 'var(--color-foreground-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                これから一緒に観る映画を<br />貯めていこう
              </p>
              <Link href="/list?tab=media" style={{ color: '#6D5BD0', fontSize: '13px', fontWeight: 500 }}>
                映画を追加する →
              </Link>
            </div>
          )}

          {/* 未観賞のみの場合 */}
          {!loading && allMovies.length > 0 && watchedMovies.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFE4ED, #F3F0FF)' }}>
                <Check size={22} strokeWidth={1.5} style={{ color: 'var(--color-foreground-secondary)' }} />
              </div>
              <p style={{ color: 'var(--color-foreground-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                一緒に観た映画が増えたら<br />ここに並んでいくよ
              </p>
            </div>
          )}

          {/* 観た映画リスト */}
          {!loading && watchedMovies.length > 0 && (
            <div className="space-y-3">
              {watchedMovies.slice(0, 10).map((movie, i) => (
                <div key={movie.id} className="flex items-center gap-3">
                  {/* 番号 */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#C5C5C5', width: '20px', flexShrink: 0, textAlign: 'right' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {/* ポスタープレースホルダー */}
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: '40px', height: '56px', backgroundColor: '#F3F0FF', borderRadius: '8px' }}
                  >
                    <Film size={16} strokeWidth={1.5} style={{ color: '#C4B8F0' }} />
                  </div>
                  {/* タイトル */}
                  <div className="flex-1 min-w-0">
                    <p style={{ color: 'var(--color-text)', fontSize: '14px', fontWeight: 500 }} className="truncate">
                      {movie.title}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Check size={10} strokeWidth={2.5} style={{ color: '#4A7C59' }} />
                      <span style={{ color: '#4A7C59', fontSize: '11px' }}>観た</span>
                    </div>
                  </div>
                </div>
              ))}

              {watchedMovies.length > 10 && (
                <Link
                  href="/list?tab=media"
                  className="flex items-center justify-center w-full py-2 mt-1"
                  style={{ color: 'var(--color-subtle)', fontSize: '12px' }}
                >
                  他 {watchedMovies.length - 10} 本を見る →
                </Link>
              )}
            </div>
          )}
        </Card>

      </div>
    </div>
    </PullToRefresh>
    </PageTransition>
  )
}

export default function InsightsPage() {
  return (
    <Suspense>
      <InsightsPageInner />
    </Suspense>
  )
}
