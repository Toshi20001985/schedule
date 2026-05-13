'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { differenceInDays, format, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MapPin, Play, Plane, CalendarDays, List, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { Toast } from '@/components/Toast'
import { haptic } from '@/lib/haptics'
import IconCircle from '@/components/ui/IconCircle'
import Tag from '@/components/ui/Tag'

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

export default function HomePage() {
  const router = useRouter()
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showQuickMenu, setShowQuickMenu] = useState(false)

  const [me, setMe] = useState<UserProfile | null>(null)
  const [partner, setPartner] = useState<UserProfile | null>(null)
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [events, setEvents] = useState<HomeEvent[]>([])
  const [places, setPlaces] = useState<HomePlace[]>([])
  const [placesCount, setPlacesCount] = useState<number>(0)
  const [mediaCount, setMediaCount] = useState<number>(0)
  const [nextVisitDate, setNextVisitDate] = useState<string | null>(null)
  const [nextFlightLine, setNextFlightLine] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  // カウントアップ表示用
  const [displayCount, setDisplayCount] = useState(0)

  const load = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // モックデータ
      setMe({ id: '1', display_name: 'さくら', avatar_color: '#6D5BD0' })
      setPartner({ id: '2', display_name: 'けんた', avatar_color: '#2D6B9E' })
      setCouple({ anniversary: '2023-04-01' })
      setNextVisitDate(format(addDays(new Date(), 23), 'yyyy-MM-dd'))
      setNextFlightLine('NH123  HND 10:00 → ITM 11:15')
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
      } else {
        setNextFlightLine(null)
      }
    }

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

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // カウントアップアニメーション
  useEffect(() => {
    if (daysUntilMeeting === null || daysUntilMeeting <= 0) {
      setDisplayCount(daysUntilMeeting ?? 0)
      return
    }
    const target   = daysUntilMeeting
    const duration = 900
    const start    = performance.now()
    let raf: number

    function step(now: number) {
      const p     = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)          // easeOut cubic
      setDisplayCount(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextVisitDate]) // nextVisitDate が変わった時だけ再アニメーション

  // Realtime 購読（ホームは集計データが多いため、変更時に load() を再実行）
  const reloadOnPartnerChange = useCallback(
    (isPartner: boolean, name?: string, label?: string) => {
      if (!isPartner) return
      haptic('light')
      if (name && label) setToast(`${label}「${name}」が追加されました`)
      load()
    },
    [load]
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

  const nextMeeting = nextVisitDate
    ? new Date(nextVisitDate.replace(/-/g, '/'))
    : null
  const daysUntilMeeting = nextMeeting ? differenceInDays(nextMeeting, new Date()) : null

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const upcomingEvents: HomeEvent[] = [...events].sort((a, b) => a.date.localeCompare(b.date))

  const myName      = me?.display_name      || 'わたし'
  const partnerName = partner?.display_name || 'パートナー'

  // ヒーローに表示する次の会う日のイベント情報
  const nextVisitEvent = upcomingEvents.find(e => e.type === 'visit' || e.type === 'trip')
  const heroLabel = nextVisitEvent ? eventTypeConfig[nextVisitEvent.type].label : '会う日'

  function placeOwnerLabel(owner: 'me' | 'partner' | 'both') {
    if (owner === 'me')      return myName
    if (owner === 'partner') return partnerName
    return 'ふたり'
  }

  // ヒーローカード長押しハンドラー
  function handleHeroTouchStart() {
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
  }
  function handleHeroTouchMove() {
    // 移動したらキャンセル
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void couple // 将来の記念日表示用に保持

  return (
    <PullToRefresh onRefresh={load}>
    <Toast message={toast} onDismiss={() => setToast(null)} />
    <div className="px-4 pt-4 pb-4 max-w-lg mx-auto space-y-3">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div
        className="relative active:opacity-90 transition-opacity"
        style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
        onTouchStart={handleHeroTouchStart}
        onTouchEnd={handleHeroTouchEnd}
        onTouchMove={handleHeroTouchMove}
        onClick={() => { if (!showQuickMenu) router.push('/calendar') }}
      >
        <div
          style={{
            backgroundColor: 'var(--color-hero-bg)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            minHeight: '46dvh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Top row: greeting + avatars */}
          <div className="flex items-start justify-between">
            <div>
              <p style={{ color: 'var(--color-hero-muted)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {greeting}
              </p>
              <p style={{ color: 'var(--color-hero-text)', fontSize: '13px', fontWeight: 500, marginTop: '3px' }}>
                {format(new Date(), 'M月d日(E)', { locale: ja })}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {loading ? (
                <>
                  <div className="w-7 h-7 rounded-full" style={{ backgroundColor: '#333' }} />
                  <div className="w-7 h-7 rounded-full" style={{ backgroundColor: '#333' }} />
                </>
              ) : (
                <>
                  {me      && <IconCircle initial={me.display_name}      color={me.avatar_color}      size="sm" />}
                  {partner && <IconCircle initial={partner.display_name} color={partner.avatar_color} size="sm" />}
                </>
              )}
            </div>
          </div>

          {/* Center: countdown */}
          <div className="flex flex-col items-center justify-center py-4 text-center">
            {loading ? (
              <div style={{ color: '#555', fontSize: '14px' }}>—</div>
            ) : daysUntilMeeting === null ? (
              /* 予定なし */
              <>
                <p style={{ color: 'var(--color-hero-muted)', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '16px' }}>
                  Next Layover
                </p>
                <p style={{ color: 'var(--color-hero-text)', fontSize: '22px', fontWeight: 300, lineHeight: 1.4 }}>
                  Let&apos;s plan<br />our next meet
                </p>
                <div
                  className="mt-5 px-5 py-2 text-sm font-medium"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--color-hero-subtle)', borderRadius: '100px', border: '0.5px solid rgba(255,255,255,0.12)' }}
                >
                  カレンダーで追加する →
                </div>
              </>
            ) : daysUntilMeeting === 0 ? (
              /* 当日 */
              <>
                <p style={{ color: 'var(--color-me)', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '16px' }}>
                  Next Layover
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Plane size={36} style={{ color: 'var(--color-hero-text)' }} />
                  <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '64px', fontWeight: 400, color: 'var(--color-hero-text)', lineHeight: 1, letterSpacing: '-0.01em' }}>
                    Today!
                  </span>
                </div>
              </>
            ) : (
              /* 通常カウントダウン */
              <>
                <p style={{ color: 'var(--color-hero-muted)', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Next Layover
                </p>
                <div className="flex items-baseline gap-3" style={{ lineHeight: 1 }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '104px', fontWeight: 400, color: 'var(--color-hero-text)', lineHeight: 0.9, letterSpacing: '-0.02em' }}>
                    {displayCount}
                  </span>
                  <span style={{ color: 'var(--color-hero-muted)', fontSize: '22px', fontWeight: 300 }}>
                    days
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Bottom: date + type pill + flight */}
          {nextMeeting && !loading && (
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ color: 'var(--color-hero-subtle)', fontSize: '13px' }}>
                  {format(nextMeeting, 'M月d日(E)', { locale: ja })}
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
                  {heroLabel}
                </span>
              </div>
              {nextFlightLine && (
                <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-hero-muted)', fontSize: '11px', marginTop: '8px', letterSpacing: '0.04em' }}>
                  <Plane size={11} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                  {nextFlightLine}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 長押しクイックアクションメニュー */}
        {showQuickMenu && (
          <>
            {/* バックドロップ */}
            <div
              className="fixed inset-0 z-40"
              onClick={e => { e.stopPropagation(); setShowQuickMenu(false) }}
            />
            {/* メニュー本体 */}
            <div
              className="absolute left-0 right-0 z-60"
              style={{ bottom: '14px', padding: '0 12px' }}
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
                      <Icon size={18} style={{ color: '#FAFAF7', flexShrink: 0 }} />
                      <span style={{ color: '#FAFAF7', fontSize: '15px', fontWeight: 500 }}>{label}</span>
                    </button>
                    {i < arr.length - 1 && (
                      <div style={{ height: '0.5px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 16px' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Stats row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/list" className="block">
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#F0F7F0' }}>
                <MapPin size={15} style={{ color: '#4A7C59' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: '#A3A3A3' }}>行きたい場所</p>
                <p className="text-xl font-semibold" style={{ color: '#1A1A1A' }}>{loading ? '—' : placesCount}</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/list?tab=media" className="block">
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#FFF7F0' }}>
                <Play size={15} style={{ color: '#C2782D' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: '#A3A3A3' }}>観たい・聴きたい</p>
                <p className="text-xl font-semibold" style={{ color: '#1A1A1A' }}>{loading ? '—' : mediaCount}</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* ── Upcoming events ────────────────────────────────── */}
      {(loading || upcomingEvents.length > 0) && (
        <Card>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>近いイベント</h2>
            <Link href="/calendar" className="text-xs" style={{ color: '#A3A3A3' }}>
              すべて見る →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2.5">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: '#E5E5E5' }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 rounded" style={{ backgroundColor: '#E5E5E5', width: '55%' }} />
                    <div className="h-2 rounded"   style={{ backgroundColor: '#E5E5E5', width: '35%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
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
                    <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: config.text }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>{event.title}</p>
                      <p className="text-xs" style={{ color: '#A3A3A3' }}>{dateLabel}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 flex-shrink-0" style={{ backgroundColor: config.bg, color: config.text, borderRadius: '6px' }}>
                      {config.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Recent places (compact) ────────────────────────── */}
      {places.length > 0 && !loading && (
        <Card>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>最近追加された場所</h2>
            <Link href="/list" style={{ color: '#A3A3A3' }}>
              <MapPin size={13} />
            </Link>
          </div>
          <div className="space-y-2">
            {places.map(place => (
              <Link key={place.id} href="/list" className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F5F5F3' }}>
                  <MapPin size={12} style={{ color: '#737373' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>{place.name}</p>
                  <p className="text-xs" style={{ color: '#A3A3A3' }}>{place.location}</p>
                </div>
                <Tag label={placeOwnerLabel(place.owner)} owner={place.owner} />
              </Link>
            ))}
          </div>
        </Card>
      )}

    </div>
    </PullToRefresh>
  )
}
