'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MapPin, Play, Plane, CalendarDays, List, Search, Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import Card from '@/components/ui/Card'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useToast } from '@/components/ToastProvider'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { calculateHeroState } from '@/lib/heroState'
import type { HeroFlight } from '@/lib/heroState'
import { haptic } from '@/lib/haptics'
import IconCircle from '@/components/ui/IconCircle'
import Tag from '@/components/ui/Tag'
import { PageTransition } from '@/components/PageTransition'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { OrbitBackground } from '@/components/OrbitBackground'

interface UserProfile {
  id: string
  display_name: string
  avatar_color: string
}

interface CoupleData {
  anniversary: string | null
}

const eventTypeConfig = {
  visit:       { bg: '#F3F0FF', text: '#6D5BD0', label: '会う日' },
  trip:        { bg: '#F0F7F0', text: '#4A7C59', label: '旅行' },
  online:      { bg: '#FFF7F0', text: '#C2782D', label: 'オンライン' },
  anniversary: { bg: '#FFF0F3', text: '#B5465A', label: '記念日' },
  personal:    { bg: '#F5F5F3', text: '#737373', label: '個人' },
}
type EventType = keyof typeof eventTypeConfig

interface HomeEvent {
  id: string
  title: string
  date: string
  end_date?: string
  type: EventType
}

interface HomePlace {
  id: string
  name: string
  location: string
  owner: 'me' | 'partner' | 'both'
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}
const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
}

const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EN_DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateEn(date: Date): string {
  return `${EN_MONTHS[date.getMonth()]} ${date.getDate()}, ${EN_DAYS[date.getDay()]}`;
}

function formatDateFullEn(date: Date): string {
  return `${EN_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function eventTypeLabelEn(type: string): string {
  const labels: Record<string, string> = {
    visit: 'MEETING',
    trip: 'TRIP',
    online: 'ONLINE',
    anniversary: 'ANNIVERSARY',
    personal: 'PERSONAL',
  };
  return labels[type] ?? type.toUpperCase();
}

export default function HomePage() {
  const router = useRouter()
  const reduced = useReducedMotion()
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const [showQuickMenu, setShowQuickMenu] = useState(false)

  // Router Cache からの復元時・マウント時にメニューを確実に閉じる
  useEffect(() => {
    setShowQuickMenu(false)
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    // EdgeSwipeBack がスワイプ戻りを検知したときもリセット（キャッシュ復元対応）
    function onSwipeBack() {
      setShowQuickMenu(false)
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
    window.addEventListener('edge-swipe-back', onSwipeBack)
    return () => {
      window.removeEventListener('edge-swipe-back', onSwipeBack)
      // アンマウント時（長押し中の画面遷移など）にタイマーをクリア
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
  }, [])

  // メニューが開いているとき、メニュー外タッチで閉じる
  useEffect(() => {
    if (!showQuickMenu) return
    function onOutsideTouch(e: TouchEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-quick-menu]')) {
        setShowQuickMenu(false)
      }
    }
    // 長押し終了イベントがそのまま閉じないよう少し遅延
    const id = window.setTimeout(() => {
      document.addEventListener('touchstart', onOutsideTouch, { passive: true })
    }, 100)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('touchstart', onOutsideTouch)
    }
  }, [showQuickMenu])

  const [me, setMe] = useState<UserProfile | null>(null)
  const [partner, setPartner] = useState<UserProfile | null>(null)
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [events, setEvents] = useState<HomeEvent[]>([])
  const [places, setPlaces] = useState<HomePlace[]>([])
  const [placesCount, setPlacesCount] = useState<number>(0)
  const [mediaCount,  setMediaCount]  = useState<number>(0)
  const [todosCount,  setTodosCount]  = useState<number>(0)
  const [nextVisitDate, setNextVisitDate] = useState<string | null>(null)
  const [nextFlightLine, setNextFlightLine] = useState<string | null>(null)
  const [nextFlightData, setNextFlightData] = useState<HeroFlight | null>(null)
  const [currentEvent, setCurrentEvent] = useState<HomeEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const { showToast } = useToast()

  const load = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // モックデータ
      setMe({ id: '1', display_name: 'さくら', avatar_color: '#6D5BD0' })
      setPartner({ id: '2', display_name: 'けんた', avatar_color: '#2D6B9E' })
      setCouple({ anniversary: '2023-04-01' })
      setNextVisitDate(format(addDays(new Date(), 23), 'yyyy-MM-dd'))
      setNextFlightLine('NH123  HND 10:00 → ITM 11:15')
      setNextFlightData(null)
      setCurrentEvent(null)
      setEvents([
        { id: '2', title: '映画「君の名は」', date: format(addDays(new Date(), 5), 'yyyy-MM-dd'),  type: 'online' },
        { id: '3', title: '記念日',           date: format(addDays(new Date(), 30), 'yyyy-MM-dd'), type: 'anniversary' },
      ])
      setPlaces([
        { id: '1', name: '新宿御苑',   location: '東京',   owner: 'partner' },
        { id: '2', name: '横浜中華街', location: '神奈川', owner: 'me'  },
      ])
      setPlacesCount(12)
      setMediaCount(8)
      setTodosCount(5)
      setLoading(false)
      return
    }

    const { createClient } = await import('@/lib/supabase/client')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any

    const { data: { user } } = await db.auth.getUser()
    if (!user) { setLoading(false); return }

    // 自分のユーザー情報
    const { data: myData } = await db
      .from('users')
      .select('id, display_name, avatar_color, couple_id')
      .eq('id', user.id)
      .single()

    if (!myData) { setLoading(false); return }
    setMe({ id: myData.id, display_name: myData.display_name, avatar_color: myData.avatar_color })

    if (!myData.couple_id) { setLoading(false); return }
    const coupleId = myData.couple_id
    setCoupleId(coupleId)

    // カップル情報
    const { data: coupleData } = await db
      .from('couples')
      .select('anniversary, next_meeting_date, user1_id, user2_id')
      .eq('id', coupleId)
      .single()

    if (coupleData) {
      setCouple({ anniversary: coupleData.anniversary })

      const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
      if (partnerId) {
        const { data: partnerData } = await db
          .from('users')
          .select('id, display_name, avatar_color')
          .eq('id', partnerId)
          .single()
        if (partnerData) setPartner(partnerData)
      }
    }

    const today = format(new Date(), 'yyyy-MM-dd')

    // 次の「会う日」または「旅行」の直近1件
    const { data: nextVisit } = await db
      .from('events')
      .select('id, event_date')
      .eq('couple_id', coupleId)
      .in('event_type', ['visit', 'trip'])
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(1)
      .single()
    if (nextVisit) {
      setNextVisitDate(nextVisit.event_date)

      // 次のフライト情報（最初の1便のみ表示）
      const { data: fl } = await db
        .from('flights')
        .select('flight_number, departure_airport, arrival_airport, departure_time, arrival_time')
        .eq('event_id', nextVisit.id)
        .order('departure_time', { ascending: true })
        .limit(1)
        .single()
      if (fl) {
        const toHHmm = (iso: string | null) => {
          if (!iso) return ''
          const d = new Date(iso)
          return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
        }
        const parts = [
          fl.flight_number,
          fl.departure_airport,
          toHHmm(fl.departure_time),
          (fl.arrival_airport || fl.arrival_time) ? '→' : '',
          toHHmm(fl.arrival_time),
          fl.arrival_airport,
        ].filter(Boolean)
        if (parts.length > 0) setNextFlightLine(parts.join('  '))
        // 構造化フライトデータ（departure_day 状態の判定用）
        if (fl.departure_time) {
          setNextFlightData({
            departureTime: new Date(fl.departure_time),
            departureAirport: fl.departure_airport ?? undefined,
          })
        } else {
          setNextFlightData(null)
        }
      } else {
        setNextFlightLine(null)
        setNextFlightData(null)
      }
    }

    // 現在進行中の visit/trip（開始済み・終了前）
    const { data: currentEvData } = await db
      .from('events')
      .select('id, title, event_date, end_date, event_type')
      .eq('couple_id', coupleId)
      .in('event_type', ['visit', 'trip'])
      .lt('event_date', today)
      .not('end_date', 'is', null)
      .gte('end_date', today)
      .order('event_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    setCurrentEvent(currentEvData ? {
      id: currentEvData.id,
      title: currentEvData.title,
      date: currentEvData.event_date,
      end_date: currentEvData.end_date,
      type: currentEvData.event_type,
    } : null)

    // 今日以降のイベント（最大5件）
    const { data: eventsData } = await db
      .from('events')
      .select('id, title, event_date, end_date, event_type')
      .eq('couple_id', coupleId)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(5)

    if (eventsData) {
      setEvents(eventsData.map((e: { id: string; title: string; event_date: string; end_date?: string; event_type: EventType }) => ({
        id: e.id,
        title: e.title,
        date: e.event_date,
        end_date: e.end_date ?? undefined,
        type: e.event_type,
      })))
    }

    // 未訪問の場所（最近追加2件）
    const { data: placesData } = await db
      .from('places')
      .select('id, name, location, owner')
      .eq('couple_id', coupleId)
      .eq('is_visited', false)
      .order('created_at', { ascending: false })
      .limit(2)

    if (placesData) {
      setPlaces(placesData.map((p: { id: string; name: string; location: string; owner?: string }) => ({
        id: p.id,
        name: p.name,
        location: p.location,
        owner: (p.owner ?? 'me') as 'me' | 'partner' | 'both',
      })))
    }

    // カウント：未訪問の場所
    const { count: pCount } = await db
      .from('places')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .eq('is_visited', false)
    setPlacesCount(pCount ?? 0)

    // カウント：未完了のメディア
    const { count: mCount } = await db
      .from('media')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .eq('is_done', false)
    setMediaCount(mCount ?? 0)

    // カウント：未完了のやりたいこと
    const { count: tCount } = await db
      .from('todos')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', coupleId)
      .eq('is_done', false)
    setTodosCount(tCount ?? 0)

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useAutoRefresh(load)

  // Realtime 購読（ホームは集計データが多いため、変更時に load() を再実行）
  const reloadOnPartnerChange = useCallback(
    (isPartner: boolean, name?: string, label?: string) => {
      // パートナーの変更はトースト＋ハプティック、自分の変更もカウント更新のため常に load()
      if (isPartner) {
        haptic('light')
        if (name && label) showToast(`${label}「${name}」が追加されました`)
      }
      load()
    },
    [load, showToast]
  )

  useRealtimeSync({
    table: 'events',
    coupleId,
    myId: me?.id ?? null,
    onInsert: (rec, isPartner) => reloadOnPartnerChange(isPartner, rec.title as string, '予定'),
    onUpdate: (_rec, isPartner) => { if (isPartner) load() },
    onDelete: (_id) => load(),
  })

  useRealtimeSync({
    table: 'places',
    coupleId,
    myId: me?.id ?? null,
    onInsert: (rec, isPartner) => reloadOnPartnerChange(isPartner, rec.name as string, '場所'),
    onUpdate: (_rec, isPartner) => { if (isPartner) load() },
    onDelete: (_id) => load(),
  })

  useRealtimeSync({
    table: 'media',
    coupleId,
    myId: me?.id ?? null,
    onInsert: (rec, isPartner) => reloadOnPartnerChange(isPartner, rec.title as string, 'アイテム'),
    onUpdate: (_rec, isPartner) => { if (isPartner) load() },
    onDelete: (_id) => load(),
  })

  useRealtimeSync({
    table: 'todos',
    coupleId,
    myId: me?.id ?? null,
    onInsert: (rec, isPartner) => reloadOnPartnerChange(isPartner, rec.title as string, 'やりたいこと'),
    onUpdate: (_rec, isPartner) => { if (isPartner) load() },
    onDelete: (_id) => load(),
  })

  const nextMeeting = nextVisitDate
    ? new Date(nextVisitDate.replace(/-/g, '/'))
    : null

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const upcomingEvents: HomeEvent[] = [...events].sort((a, b) => a.date.localeCompare(b.date))

  const myName      = me?.display_name      || 'わたし'
  const partnerName = partner?.display_name || 'パートナー'

  const daysTogether = couple?.anniversary
    ? Math.max(0, Math.floor((Date.now() - new Date(couple.anniversary.replace(/-/g, '/')).getTime()) / 86400000))
    : 0;

  // ヒーロー状態を計算
  const heroState = calculateHeroState(
    upcomingEvents,
    currentEvent,
    nextFlightData,
    couple?.anniversary ? new Date(couple.anniversary.replace(/-/g, '/')) : null,
  )

  // ヒーロー下部に表示するイベント種別ラベル（upcoming / departure_day 時）
  const heroLabelEvent =
    heroState.kind === 'together' || heroState.kind === 'last_day'
      ? heroState.event
      : upcomingEvents.find(e => e.type === 'visit' || e.type === 'trip') ?? null
  function placeOwnerLabel(owner: 'me' | 'partner' | 'both') {
    if (owner === 'me')      return myName
    if (owner === 'partner') return partnerName
    return 'ふたり'
  }

  // ヒーローカード長押しハンドラー
  function handleHeroTouchStart(e: React.TouchEvent) {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    longPressTimer.current = setTimeout(() => {
      haptic('medium')
      setShowQuickMenu(true)
      longPressTimer.current = null
    }, 500)
  }
  function handleHeroTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    touchStartPos.current = null
  }
  function handleHeroTouchMove(e: React.TouchEvent) {
    // 8px 以上移動した場合のみキャンセル（微小な指のブレは無視）
    if (!longPressTimer.current || !touchStartPos.current) return
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x)
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y)
    if (dx > 8 || dy > 8) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
      touchStartPos.current = null
    }
  }

  return (
    <PageTransition>
    <PullToRefresh onRefresh={load}>
    <motion.div
      className="px-5 pt-6 pb-6 max-w-lg mx-auto space-y-6"
      variants={reduced ? undefined : staggerContainer}
      initial="hidden"
      animate="show"
    >

      {/* ── Hero ─────────────────────────────────────────── */}
      <motion.div
        data-testid="hero"
        variants={reduced ? undefined : staggerItem}
        className="relative active:opacity-90 transition-opacity"
        style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
        onTouchStart={handleHeroTouchStart}
        onTouchEnd={handleHeroTouchEnd}
        onTouchMove={handleHeroTouchMove}
        onClick={() => { if (!showQuickMenu) router.push('/calendar') }}
      >
        <div
          style={{
            background: [
              'radial-gradient(ellipse at top right, rgba(167,139,250,0.15) 0%, transparent 50%)',
              'radial-gradient(ellipse at bottom left, rgba(255,159,184,0.08) 0%, transparent 50%)',
              'linear-gradient(135deg, #1A1A1A 0%, #0F0F0F 100%)',
            ].join(', '),
            borderRadius: 'var(--radius-xl)',
            padding: '28px 28px 24px',
            minHeight: '46dvh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* ノイズテクスチャオーバーレイ */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
            opacity: 0.04,
            mixBlendMode: 'overlay' as const,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }} />
          {/* 軌道アニメーション */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.65 }}>
            <OrbitBackground placesVisited={placesCount} daysTogether={daysTogether} />
          </div>
          {/* Top row: greeting + avatars */}
          <div className="flex items-start justify-between">
            <div>
              <p style={{ color: 'var(--color-hero-muted)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500 }}>
                {greeting}
              </p>
              <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-hero-text)', fontSize: '16px', fontWeight: 400, marginTop: '5px', letterSpacing: '0.01em' }}>
                {formatDateEn(new Date())}
              </p>
            </div>
            <div className="flex -space-x-2">
              {loading ? (
                <>
                  <div className="w-8 h-8 rounded-full" style={{ backgroundColor: '#333', border: '2px solid rgba(255,255,255,0.1)' }} />
                  <div className="w-8 h-8 rounded-full" style={{ backgroundColor: '#333', border: '2px solid rgba(255,255,255,0.1)' }} />
                </>
              ) : (
                <>
                  {me && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{
                        background: `linear-gradient(135deg, ${me.avatar_color} 0%, ${me.avatar_color}BB 100%)`,
                        border: '2px solid rgba(255,255,255,0.15)',
                        boxShadow: `0 2px 8px ${me.avatar_color}50`,
                      }}
                    >
                      {me.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {partner && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{
                        background: `linear-gradient(135deg, ${partner.avatar_color} 0%, ${partner.avatar_color}BB 100%)`,
                        border: '2px solid rgba(255,255,255,0.15)',
                        boxShadow: `0 2px 8px ${partner.avatar_color}50`,
                      }}
                    >
                      {partner.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Center: hero state */}
          <div className="flex flex-col items-center justify-center py-6 text-center">
            {loading ? (
              <div style={{ color: '#555', fontSize: '14px' }}>—</div>
            ) : heroState.kind === 'no_meeting' ? (
              /* 予定なし */
              <>
                <p style={{ color: 'var(--color-hero-muted)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '20px' }}>
                  Next Layover
                </p>
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-hero-text)', fontSize: '26px', fontWeight: 400, lineHeight: 1.45 }}>
                  Let&apos;s plan<br />our next meet
                </p>
                <div
                  className="mt-6 px-5 py-2 text-xs font-medium"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--color-hero-subtle)', borderRadius: '100px', border: '0.5px solid rgba(255,255,255,0.12)', letterSpacing: '0.04em' }}
                >
                  カレンダーで追加する →
                </div>
              </>
            ) : heroState.kind === 'anniversary' ? (
              /* 記念日 */
              <>
                <p style={{ color: 'var(--color-hero-muted)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '20px' }}>
                  Anniversary
                </p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Star size={20} strokeWidth={1.5} style={{ color: 'var(--color-hero-muted)' }} />
                  <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '72px', fontWeight: 400, color: 'var(--color-hero-text)', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'lining-nums tabular-nums', fontFeatureSettings: '"lnum" 1, "tnum" 1' }}>
                    {heroState.months}
                  </span>
                  <Star size={20} strokeWidth={1.5} style={{ color: 'var(--color-hero-muted)' }} />
                </div>
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-hero-muted)', fontSize: '18px', fontWeight: 400 }}>
                  months together
                </p>
              </>
            ) : heroState.kind === 'departure_day' ? (
              /* 出発日 */
              <>
                <p style={{ color: 'var(--color-me)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '20px' }}>
                  Departure Day
                </p>
                <div className="flex items-center justify-center gap-5">
                  <Plane size={32} strokeWidth={1.5} style={{ color: 'var(--color-hero-muted)' }} />
                  <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '52px', fontWeight: 400, color: 'var(--color-hero-text)', lineHeight: 1, letterSpacing: '-0.01em' }}>
                    TODAY ✈
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-hero-muted)', fontSize: '16px', fontWeight: 400, marginTop: '12px' }}>
                  Have a safe flight
                </p>
              </>
            ) : heroState.kind === 'together' ? (
              /* 一緒にいる期間 */
              <>
                <p style={{ color: 'var(--color-hero-muted)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '20px' }}>
                  Together Now
                </p>
                <div className="flex items-baseline" style={{ gap: '10px' }}>
                  <AnimatedNumber
                    value={heroState.daysLeft}
                    style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(88px, 24vw, 120px)', fontWeight: 400, color: 'var(--color-hero-text)', lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'lining-nums tabular-nums', fontFeatureSettings: '"lnum" 1, "tnum" 1' }}
                  />
                  <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-hero-muted)', fontSize: '22px', fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1 }}>
                    {heroState.daysLeft === 1 ? 'day left' : 'days left'}
                  </span>
                </div>
              </>
            ) : heroState.kind === 'last_day' ? (
              /* 最終日 */
              <>
                <p style={{ color: 'var(--color-hero-muted)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '20px' }}>
                  See You Soon
                </p>
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-hero-text)', fontSize: '26px', fontWeight: 400, lineHeight: 1.45 }}>
                  Today is our<br />last day
                </p>
              </>
            ) : heroState.daysLeft === 0 ? (
              /* upcoming・当日 */
              <>
                <p style={{ color: 'var(--color-me)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '20px' }}>
                  Next Layover
                </p>
                <div className="flex items-center justify-center gap-5">
                  <Plane size={32} strokeWidth={1.5} style={{ color: 'var(--color-hero-muted)' }} />
                  <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '72px', fontWeight: 400, color: 'var(--color-hero-text)', lineHeight: 1, letterSpacing: '-0.01em' }}>
                    Today!
                  </span>
                </div>
              </>
            ) : (
              /* upcoming・通常カウントダウン */
              <>
                <p style={{ color: 'var(--color-hero-muted)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '12px' }}>
                  Next Layover
                </p>
                <div className="flex items-baseline" style={{ gap: '10px' }}>
                  <AnimatedNumber
                    value={heroState.daysLeft}
                    style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 'clamp(88px, 24vw, 120px)', fontWeight: 400, color: 'var(--color-hero-text)', lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'lining-nums tabular-nums', fontFeatureSettings: '"lnum" 1, "tnum" 1' }}
                  />
                  <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-hero-muted)', fontSize: '22px', fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1 }}>
                    {heroState.daysLeft === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Bottom: state-aware footer */}
          {!loading && heroState.kind !== 'no_meeting' && (
            <div>
              {heroState.kind === 'together' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-hero-subtle)', fontSize: '15px' }}>
                    {heroState.event.title}
                  </span>
                  {heroState.event.end_date && (
                    <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-hero-muted)', fontSize: '13px' }}>
                      until {formatDateEn(new Date(heroState.event.end_date.replace(/-/g, '/')))}
                    </span>
                  )}
                </div>
              )}
              {heroState.kind === 'last_day' && (
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-hero-subtle)', fontSize: '15px' }}>
                  {heroState.event.title}
                </p>
              )}
              {heroState.kind === 'anniversary' && couple?.anniversary && (
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-hero-subtle)', fontSize: '15px' }}>
                  since {formatDateFullEn(new Date(couple.anniversary.replace(/-/g, '/')))}
                </p>
              )}
              {(heroState.kind === 'upcoming' || heroState.kind === 'departure_day') && nextMeeting && (
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-hero-subtle)', fontSize: '15px' }}>
                      {formatDateEn(nextMeeting)}
                    </span>
                    <span style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'var(--color-hero-text)',
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '3px 12px',
                      borderRadius: '100px',
                      border: '0.5px solid rgba(255,255,255,0.15)',
                    }}>
                      {eventTypeLabelEn(heroLabelEvent?.type ?? 'visit')}
                    </span>
                  </div>
                  {nextFlightLine && (
                    <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-hero-muted)', fontSize: '11px', marginTop: '8px', letterSpacing: '0.04em' }}>
                      <Plane size={11} strokeWidth={1.5} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                      {nextFlightLine}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 長押しクイックアクションメニュー */}
        {showQuickMenu && (
          /* バックドロップなし: fixed inset-0 はタッチイベントをブロックしてスクロールを壊すため廃止。
             代わりに useEffect でメニュー外タッチを検知して閉じる。 */
          <div
            data-quick-menu
            className="absolute left-0 right-0 z-60"
            style={{ bottom: '14px', padding: '0 12px' }}
            onTouchStart={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <div className="glass-dark glass-border" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {[
                { icon: CalendarDays, label: 'カレンダーを開く',   href: '/calendar' },
                { icon: List,         label: 'リストを見る',       href: '/list'     },
                { icon: Search,       label: '検索する',           href: '/search'   },
              ].map(({ icon: Icon, label, href }, i, arr) => (
                <div key={href}>
                  <button
                    className="w-full flex items-center gap-3 px-5 py-4 active:opacity-60 transition-opacity"
                    onClick={() => { setShowQuickMenu(false); router.push(href) }}
                  >
                    <Icon size={18} style={{ color: 'var(--color-hero-text)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-hero-text)', fontSize: '15px', fontWeight: 500 }}>{label}</span>
                  </button>
                  {i < arr.length - 1 && (
                    <div style={{ height: '0.5px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 16px' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Stats row ──────────────────────────────────────── */}
      <motion.div variants={reduced ? undefined : staggerItem} className="grid grid-cols-3 gap-3">
        {/* 行きたい場所 */}
        <Link href="/list" className="block active:scale-[0.97] transition-transform duration-100">
          <Card padding="sm" shadow="sm" style={{ boxShadow: 'var(--shadow-soft-sm)' }}>
            <div className="flex flex-col gap-3 p-1">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, var(--color-trip-soft) 0%, rgba(74,124,89,0.14) 100%)',
                  boxShadow: '0 0 0 1px rgba(74,124,89,0.18)',
                }}
              >
                <MapPin size={15} strokeWidth={1.5} style={{ color: 'var(--color-trip-accent)' }} />
              </div>
              <div>
                <p style={{ color: 'var(--color-subtle)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Places</p>
                {loading ? (
                  <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '26px', fontWeight: 400, color: 'var(--color-text)', lineHeight: 1 }}>—</p>
                ) : (
                  <AnimatedNumber value={placesCount} style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '26px', fontWeight: 400, color: 'var(--color-text)', lineHeight: 1, display: 'block', fontVariantNumeric: 'lining-nums tabular-nums', fontFeatureSettings: '"lnum" 1, "tnum" 1' }} />
                )}
              </div>
            </div>
          </Card>
        </Link>

        {/* 観たい・聴きたい */}
        <Link href="/list?tab=media" className="block active:scale-[0.97] transition-transform duration-100">
          <Card padding="sm" shadow="sm" style={{ boxShadow: 'var(--shadow-soft-sm)' }}>
            <div className="flex flex-col gap-3 p-1">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, var(--color-online-soft) 0%, rgba(194,120,45,0.12) 100%)',
                  boxShadow: '0 0 0 1px rgba(194,120,45,0.18)',
                }}
              >
                <Play size={15} strokeWidth={1.5} style={{ color: 'var(--color-online-accent)' }} />
              </div>
              <div>
                <p style={{ color: 'var(--color-subtle)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Media</p>
                {loading ? (
                  <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '26px', fontWeight: 400, color: 'var(--color-text)', lineHeight: 1 }}>—</p>
                ) : (
                  <AnimatedNumber value={mediaCount} style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '26px', fontWeight: 400, color: 'var(--color-text)', lineHeight: 1, display: 'block', fontVariantNumeric: 'lining-nums tabular-nums', fontFeatureSettings: '"lnum" 1, "tnum" 1' }} />
                )}
              </div>
            </div>
          </Card>
        </Link>

        {/* やりたいこと */}
        <Link href="/list?tab=todos" className="block active:scale-[0.97] transition-transform duration-100">
          <Card padding="sm" shadow="sm" style={{ boxShadow: 'var(--shadow-soft-sm)' }}>
            <div className="flex flex-col gap-3 p-1">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #FFF8EC 0%, rgba(176,125,44,0.12) 100%)',
                  boxShadow: '0 0 0 1px rgba(176,125,44,0.18)',
                }}
              >
                <Star size={15} strokeWidth={1.5} style={{ color: '#B07D2C' }} />
              </div>
              <div>
                <p style={{ color: 'var(--color-subtle)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Bucket</p>
                {loading ? (
                  <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '26px', fontWeight: 400, color: 'var(--color-text)', lineHeight: 1 }}>—</p>
                ) : (
                  <AnimatedNumber value={todosCount} style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '26px', fontWeight: 400, color: 'var(--color-text)', lineHeight: 1, display: 'block', fontVariantNumeric: 'lining-nums tabular-nums', fontFeatureSettings: '"lnum" 1, "tnum" 1' }} />
                )}
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* ── インサイトリンク ───────────────────────────────── */}
      <motion.div variants={reduced ? undefined : staggerItem} className="flex justify-end -mt-3">
        <Link href="/insights" style={{ color: 'var(--color-subtle)', fontSize: '12px' }}>
          インサイト →
        </Link>
      </motion.div>

      {/* ── Upcoming events ────────────────────────────────── */}
      {(loading || upcomingEvents.length > 0) && (
        <motion.div variants={reduced ? undefined : staggerItem}>
        <Card padding="lg" shadow="sm">
          <header className="flex items-end justify-between mb-5">
            <div className="space-y-1">
              <p style={{ color: 'var(--color-subtle)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500 }}>
                Coming up
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--color-text)', fontSize: '22px', fontWeight: 400, lineHeight: 1.2 }}>近いイベント</h2>
            </div>
            <Link href="/calendar" style={{ color: 'var(--color-foreground-tertiary)', fontSize: '13px' }}>
              すべて見る →
            </Link>
          </header>
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton w-1 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-2.5 rounded" style={{ width: '55%' }} />
                    <div className="skeleton h-2 rounded"   style={{ width: '35%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.slice(0, 4).map(event => {
                const config    = eventTypeConfig[event.type]
                const startDate = new Date(event.date.replace(/-/g, '/'))
                const endDate   = event.end_date && event.end_date !== event.date
                  ? new Date(event.end_date.replace(/-/g, '/'))
                  : null
                const dateLabel = endDate
                  ? `${format(startDate, 'M/d(E)', { locale: ja })} 〜 ${format(endDate, 'M/d(E)', { locale: ja })}`
                  : format(startDate, 'M月d日(E)', { locale: ja })
                return (
                  <Link key={event.id} href={`/calendar?date=${event.date}`} className="flex items-center gap-3">
                    <div className="w-0.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: config.text }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ color: 'var(--color-text)', fontSize: '14px', fontWeight: 500 }} className="truncate">{event.title}</p>
                      <p style={{ color: 'var(--color-subtle)', fontSize: '12px', marginTop: '2px' }}>{dateLabel}</p>
                    </div>
                    <span style={{ backgroundColor: config.bg, color: config.text, fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}>
                      {config.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>
        </motion.div>
      )}

      {/* ── Recent places (compact) ────────────────────────── */}
      {places.length > 0 && !loading && (
        <motion.div variants={reduced ? undefined : staggerItem}>
        <Card padding="lg" shadow="sm">
          <header className="flex items-end justify-between mb-5">
            <div className="space-y-1">
              <p style={{ color: 'var(--color-subtle)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500 }}>
                Wishlist
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--color-text)', fontSize: '22px', fontWeight: 400, lineHeight: 1.2 }}>最近追加された場所</h2>
            </div>
            <Link href="/list" style={{ color: 'var(--color-foreground-tertiary)', fontSize: '13px' }}>
              すべて →
            </Link>
          </header>
          <div className="space-y-3">
            {places.map(place => (
              <Link key={place.id} href="/list" className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-surface)' }}>
                  <MapPin size={13} strokeWidth={1.5} style={{ color: 'var(--color-muted)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ color: 'var(--color-text)', fontSize: '14px', fontWeight: 500 }} className="truncate">{place.name}</p>
                  <p style={{ color: 'var(--color-subtle)', fontSize: '12px', marginTop: '2px' }}>{place.location}</p>
                </div>
                <Tag label={placeOwnerLabel(place.owner)} owner={place.owner} />
              </Link>
            ))}
          </div>
        </Card>
        </motion.div>
      )}

    </motion.div>
    </PullToRefresh>
    </PageTransition>
  )
}
