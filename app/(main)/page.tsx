'use client'

import { useState, useEffect } from 'react'
import { differenceInDays, format, addDays, startOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MapPin, Play, Calendar, ChevronRight, Plane } from 'lucide-react'
import Card from '@/components/ui/Card'
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
  type: EventType
}

interface HomePlace {
  id: string
  name: string
  location: string
  added_by: string       // UUID
  owner: 'me' | 'partner'
}

function MiniWeekCalendar({ nextMeeting, eventDates }: { nextMeeting: Date | null; eventDates: string[] }) {
  const today = new Date()
  const weekStart = startOfWeek(today, { locale: ja })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const dayLabels = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div className="flex justify-between gap-1">
      {days.map((day, i) => {
        const dayStr    = format(day, 'yyyy-MM-dd')
        const isToday   = dayStr === format(today, 'yyyy-MM-dd')
        const isMeeting = nextMeeting && dayStr === format(nextMeeting, 'yyyy-MM-dd')
        const hasEvent  = eventDates.includes(dayStr)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs" style={{ color: '#A3A3A3' }}>{dayLabels[i]}</span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm relative"
              style={{
                backgroundColor: isToday ? '#1A1A1A' : isMeeting ? '#F3F0FF' : 'transparent',
                color: isToday ? '#FFFFFF' : isMeeting ? '#6D5BD0' : '#1A1A1A',
                fontWeight: isToday || isMeeting ? 600 : 400,
              }}
            >
              {format(day, 'd')}
              {(isMeeting || hasEvent) && !isToday && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full" style={{ backgroundColor: isMeeting ? '#6D5BD0' : '#A3A3A3' }} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function HomePage() {
  const [me, setMe] = useState<UserProfile | null>(null)
  const [partner, setPartner] = useState<UserProfile | null>(null)
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [events, setEvents] = useState<HomeEvent[]>([])
  const [places, setPlaces] = useState<HomePlace[]>([])
  const [placesCount, setPlacesCount] = useState<number>(0)
  const [mediaCount, setMediaCount] = useState<number>(0)
  const [myId, setMyId] = useState<string | null>(null)
  const [nextVisitDate, setNextVisitDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // モックデータ
        setMe({ id: '1', display_name: 'さくら', avatar_color: '#6D5BD0' })
        setPartner({ id: '2', display_name: 'けんた', avatar_color: '#2D6B9E' })
        setCouple({ anniversary: '2023-04-01' })
        setNextVisitDate(format(addDays(new Date(), 23), 'yyyy-MM-dd'))
        setEvents([
          { id: '2', title: '映画「君の名は」', date: format(addDays(new Date(), 5), 'yyyy-MM-dd'),  type: 'online' },
          { id: '3', title: '記念日',           date: format(addDays(new Date(), 30), 'yyyy-MM-dd'), type: 'anniversary' },
        ])
        setPlaces([
          { id: '1', name: '新宿御苑',   location: '東京',   added_by: '1', owner: 'partner' },
          { id: '2', name: '横浜中華街', location: '神奈川', added_by: '1', owner: 'me'  },
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
      setMyId(user.id)

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

      // 次の「会う日」（visitタイプの直近1件）
      const { data: nextVisit } = await db
        .from('events')
        .select('event_date')
        .eq('couple_id', coupleId)
        .eq('event_type', 'visit')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(1)
        .single()
      if (nextVisit) setNextVisitDate(nextVisit.event_date)

      // 今日以降のイベント（最大5件）
      const { data: eventsData } = await db
        .from('events')
        .select('id, title, event_date, event_type')
        .eq('couple_id', coupleId)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(5)

      if (eventsData) {
        setEvents(eventsData.map((e: { id: string; title: string; event_date: string; event_type: EventType }) => ({
          id: e.id,
          title: e.title,
          date: e.event_date,
          type: e.event_type,
        })))
      }

      // 未訪問の場所（最近追加2件）
      const { data: placesData } = await db
        .from('places')
        .select('id, name, location, added_by')
        .eq('couple_id', coupleId)
        .eq('is_visited', false)
        .order('created_at', { ascending: false })
        .limit(2)

      if (placesData) {
        setPlaces(placesData.map((p: { id: string; name: string; location: string; added_by: string }) => ({
          id: p.id,
          name: p.name,
          location: p.location,
          added_by: p.added_by,
          owner: p.added_by === user.id ? 'me' : 'partner',
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
    }
    load()
  }, [])

  const nextMeeting = nextVisitDate
    ? new Date(nextVisitDate.replace(/-/g, '/'))
    : null
  const daysUntilMeeting = nextMeeting ? differenceInDays(nextMeeting, new Date()) : null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const upcomingEvents: HomeEvent[] = [...events].sort((a, b) => a.date.localeCompare(b.date))

  const thisWeekEventDates = events.map(e => e.date)

  return (
    <div className="px-4 pt-6 pb-2 max-w-lg mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: '#A3A3A3' }}>
            {format(new Date(), 'M月d日(E)', { locale: ja })}
          </p>
          <h1 className="text-lg font-semibold mt-0.5" style={{ color: '#1A1A1A' }}>
            {greeting}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: '#E5E5E5' }} />
          ) : (
            <>
              <IconCircle
                initial={me?.display_name || '?'}
                color={me?.avatar_color || '#6D5BD0'}
                size="sm"
              />
              {partner && (
                <IconCircle
                  initial={partner.display_name || '?'}
                  color={partner.avatar_color || '#2D6B9E'}
                  size="sm"
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Countdown Hero */}
      <Card padding="lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#A3A3A3' }}>
              Next Layover
            </p>
            {daysUntilMeeting !== null ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-semibold" style={{ color: '#1A1A1A' }}>
                  {daysUntilMeeting}
                </span>
                <span className="text-lg" style={{ color: '#737373' }}>days</span>
              </div>
            ) : (
              <p className="text-base" style={{ color: '#A3A3A3' }}>次の約束を設定しよう</p>
            )}
          </div>
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#F3F0FF' }}>
            <Plane size={20} style={{ color: '#6D5BD0' }} />
          </div>
        </div>
        {nextMeeting && (
          <div className="flex items-center justify-between pt-3" style={{ borderTop: '0.5px solid #E5E5E5' }}>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: '#F3F0FF', color: '#6D5BD0', borderRadius: '6px' }}>
                会う日
              </span>
              <span className="text-sm" style={{ color: '#737373' }}>
                {format(nextMeeting, 'M月d日(E)', { locale: ja })}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#F0F7F0' }}>
              <MapPin size={16} style={{ color: '#4A7C59' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: '#A3A3A3' }}>行きたい場所</p>
              <p className="text-xl font-semibold" style={{ color: '#1A1A1A' }}>
                {loading ? '—' : placesCount}
              </p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#FFF7F0' }}>
              <Play size={16} style={{ color: '#C2782D' }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: '#A3A3A3' }}>観たい・聴きたい</p>
              <p className="text-xl font-semibold" style={{ color: '#1A1A1A' }}>
                {loading ? '—' : mediaCount}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* This Week */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>今週</h2>
          <button className="text-xs flex items-center gap-0.5" style={{ color: '#A3A3A3' }}>
            カレンダー <ChevronRight size={12} />
          </button>
        </div>
        <MiniWeekCalendar nextMeeting={nextMeeting} eventDates={thisWeekEventDates} />
      </Card>

      {/* Upcoming Events */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>近いイベント</h2>
          <Calendar size={14} style={{ color: '#A3A3A3' }} />
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: '#E5E5E5' }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 rounded" style={{ backgroundColor: '#E5E5E5', width: '60%' }} />
                  <div className="h-2.5 rounded" style={{ backgroundColor: '#E5E5E5', width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: '#A3A3A3' }}>予定はありません</p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.slice(0, 5).map(event => {
              const config = eventTypeConfig[event.type]
              const eventDate = new Date(event.date.replace(/-/g, '/'))
              return (
                <div key={event.id} className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: config.text }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>{event.title}</p>
                    <p className="text-xs" style={{ color: '#A3A3A3' }}>
                      {format(eventDate, 'M月d日(E)', { locale: ja })}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 flex-shrink-0" style={{ backgroundColor: config.bg, color: config.text, borderRadius: '6px' }}>
                    {config.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Recent Places */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>最近追加された場所</h2>
          <MapPin size={14} style={{ color: '#A3A3A3' }} />
        </div>
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: '#F5F5F3' }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 rounded" style={{ backgroundColor: '#E5E5E5', width: '50%' }} />
                  <div className="h-2.5 rounded" style={{ backgroundColor: '#E5E5E5', width: '30%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : places.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: '#A3A3A3' }}>場所が登録されていません</p>
        ) : (
          <div className="space-y-2.5">
            {places.map(place => (
              <div key={place.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F5F5F3' }}>
                  <MapPin size={14} style={{ color: '#737373' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>{place.name}</p>
                  <p className="text-xs" style={{ color: '#A3A3A3' }}>{place.location}</p>
                </div>
                <Tag label={place.owner === 'me' ? 'わたし' : 'パートナー'} owner={place.owner} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
