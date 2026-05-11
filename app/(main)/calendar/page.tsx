'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2, Plane, Pencil } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import BottomSheet from '@/components/BottomSheet'
import DateInput from '@/components/ui/DateInput'

const eventTypeConfig = {
  visit:       { bg: '#F3F0FF', text: '#6D5BD0', dot: '#6D5BD0', label: '会う日' },
  trip:        { bg: '#F0F7F0', text: '#4A7C59', dot: '#4A7C59', label: '旅行' },
  online:      { bg: '#FFF7F0', text: '#C2782D', dot: '#C2782D', label: 'オンライン' },
  anniversary: { bg: '#FFF0F3', text: '#B5465A', dot: '#B5465A', label: '記念日' },
  personal:    { bg: '#F5F5F3', text: '#737373', dot: '#A3A3A3', label: '個人' },
}

type EventType = keyof typeof eventTypeConfig
type Traveler   = 'me' | 'partner'
type FlightPayer = 'me' | 'partner' | 'split'

interface CalEvent {
  id: string
  title: string
  date: string
  end_date?: string
  type: EventType
  memo?: string
  traveler?: Traveler
  flight_payer?: FlightPayer
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '14px',
  outline: 'none',
  border: '0.5px solid #E5E5E5',
  borderRadius: '10px',
  backgroundColor: '#FAFAF7',
  color: '#1A1A1A',
}

function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// 複数日イベントのその日の位置を返す
function getRangePos(event: CalEvent, dayStr: string): 'start' | 'mid' | 'end' | 'single' {
  if (!event.end_date || event.end_date === event.date) return 'single'
  if (dayStr === event.date)     return 'start'
  if (dayStr === event.end_date) return 'end'
  return 'mid'
}

// ---- 飛行機代の表示テキスト ----
function flightPayerLabel(payer: FlightPayer, myName: string, partnerName: string): string {
  if (payer === 'split') return 'それぞれ負担'
  if (payer === 'me')    return `${myName}が負担`
  return `${partnerName}が負担`
}

function flightPayerNote(traveler: Traveler, payer: FlightPayer, myName: string, partnerName: string): string | null {
  if (payer === 'split') return null
  const travelerIsMe = traveler === 'me'
  const payerIsMe    = payer === 'me'
  if (travelerIsMe === payerIsMe) return null
  if (!travelerIsMe && payerIsMe) {
    return `${partnerName}が来てくれるので、${myName}が負担します`
  }
  return `${myName}が行くので、${partnerName}が負担します`
}

// ---- セレクトボタン群 ----
function SegmentControl<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-2">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="flex-1 py-2 text-sm font-medium transition-opacity"
          style={{
            borderRadius: '8px',
            border: `0.5px solid ${value === o.value ? '#1A1A1A' : '#E5E5E5'}`,
            backgroundColor: value === o.value ? '#1A1A1A' : '#FAFAF7',
            color: value === o.value ? '#FFFFFF' : '#737373',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ---- 飛行機代フォーム（visit） ----
function VisitFlightForm({
  traveler, setTraveler, flightPayer, setFlightPayer, myName, partnerName,
}: {
  traveler: Traveler; setTraveler: (v: Traveler) => void
  flightPayer: FlightPayer; setFlightPayer: (v: FlightPayer) => void
  myName: string; partnerName: string
}) {
  const note = flightPayerNote(traveler, flightPayer, myName, partnerName)
  return (
    <div className="space-y-3 pt-1 pb-1 px-3 rounded-xl" style={{ backgroundColor: '#F3F0FF' }}>
      <div>
        <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#6D5BD0' }}>
          移動する人
        </label>
        <SegmentControl
          options={[{ value: 'me', label: myName }, { value: 'partner', label: partnerName }]}
          value={traveler}
          onChange={setTraveler}
        />
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#6D5BD0' }}>
          飛行機代を払う人
        </label>
        <SegmentControl
          options={[{ value: 'me', label: myName }, { value: 'partner', label: partnerName }]}
          value={flightPayer === 'split' ? 'me' : flightPayer as 'me' | 'partner'}
          onChange={v => setFlightPayer(v)}
        />
      </div>
      {note && (
        <p className="text-xs pb-1" style={{ color: '#6D5BD0' }}>
          <Plane size={11} className="inline mr-1" />{note}
        </p>
      )}
    </div>
  )
}

// ---- 飛行機代フォーム（trip） ----
function TripFlightForm({
  flightPayer, setFlightPayer, myName, partnerName,
}: {
  flightPayer: FlightPayer; setFlightPayer: (v: FlightPayer) => void
  myName: string; partnerName: string
}) {
  return (
    <div className="pt-1 pb-2 px-3 rounded-xl" style={{ backgroundColor: '#F0F7F0' }}>
      <label className="block text-xs font-medium uppercase tracking-widest mb-2 pt-1" style={{ color: '#4A7C59' }}>
        飛行機代の扱い
      </label>
      <div className="flex gap-2">
        {[
          { value: 'split'   as FlightPayer, label: 'それぞれ' },
          { value: 'me'      as FlightPayer, label: `${myName}が出す` },
          { value: 'partner' as FlightPayer, label: `${partnerName}が出す` },
        ].map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => setFlightPayer(o.value)}
            className="flex-1 py-2 text-xs font-medium transition-opacity"
            style={{
              borderRadius: '8px',
              border: `0.5px solid ${flightPayer === o.value ? '#4A7C59' : '#E5E5E5'}`,
              backgroundColor: flightPayer === o.value ? '#4A7C59' : '#FAFAF7',
              color: flightPayer === o.value ? '#FFFFFF' : '#737373',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---- 飛行機代の詳細表示 ----
function FlightInfo({ event, myName, partnerName }: { event: CalEvent; myName: string; partnerName: string }) {
  if (event.type !== 'visit' && event.type !== 'trip') return null
  if (!event.flight_payer) return null

  const config = eventTypeConfig[event.type]
  let text = ''
  if (event.type === 'visit') {
    const moverText = event.traveler === 'me' ? myName : partnerName
    const payerText = flightPayerLabel(event.flight_payer, myName, partnerName)
    text = `${moverText}が移動 ・ ${payerText}`
  } else {
    text = flightPayerLabel(event.flight_payer, myName, partnerName)
  }

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <Plane size={12} style={{ color: config.text }} />
      <span className="text-xs" style={{ color: config.text }}>{text}</span>
    </div>
  )
}

function CalendarPageInner() {
  const searchParams = useSearchParams()
  const initialDate = (() => {
    const d = searchParams.get('date')
    if (!d) return null
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day)
  })()

  const [currentMonth, setCurrentMonth] = useState(initialDate ?? new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [showEventSheet, setShowEventSheet] = useState(!!initialDate)
  const [events, setEvents] = useState<CalEvent[]>([])
  const [userId, setUserId]   = useState<string | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [myName, setMyName]       = useState('わたし')
  const [partnerName, setPartnerName] = useState('パートナー')
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null)

  // フォーム state
  const [newTitle,      setNewTitle]      = useState('')
  const [newType,       setNewType]       = useState<EventType>('visit')
  const [newMemo,       setNewMemo]       = useState('')
  const [newTraveler,   setNewTraveler]   = useState<Traveler>('me')
  const [newFlightPayer, setNewFlightPayer] = useState<FlightPayer>('me')
  const [newEndDate,    setNewEndDate]    = useState<Date | null>(null)

  // Supabase からイベント取得
  useEffect(() => {
    async function load() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      const { data: { user } } = await db.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: userData } = await db
        .from('users')
        .select('display_name, couple_id')
        .eq('id', user.id)
        .single()
      if (!userData?.couple_id) return
      if (userData.display_name) setMyName(userData.display_name)
      setCoupleId(userData.couple_id)

      // パートナー名取得
      const { data: coupleData } = await db
        .from('couples')
        .select('user1_id, user2_id')
        .eq('id', userData.couple_id)
        .single()
      if (coupleData) {
        const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
        if (partnerId) {
          const { data: partnerData } = await db.from('users').select('display_name').eq('id', partnerId).single()
          if (partnerData?.display_name) setPartnerName(partnerData.display_name)
        }
      }

      const { data } = await db
        .from('events')
        .select('id, title, event_date, end_date, event_type, memo, traveler, flight_payer')
        .eq('couple_id', userData.couple_id)
        .order('event_date', { ascending: true })

      if (data) {
        setEvents(data.map((e: {
          id: string; title: string; event_date: string; end_date?: string;
          event_type: EventType; memo?: string; traveler?: Traveler; flight_payer?: FlightPayer
        }) => ({
          id: e.id,
          title: e.title,
          date: e.event_date,
          end_date: e.end_date ?? undefined,
          type: e.event_type,
          memo: e.memo,
          traveler: e.traveler,
          flight_payer: e.flight_payer,
        })))
      }
    }
    load()
  }, [])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 })
  const calDays    = eachDayOfInterval({ start: calStart, end: calEnd })

  // 日付と重なるイベントを返す（範囲イベント含む）
  const eventsOnDay = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd')
    return events.filter(e => {
      const endStr = e.end_date ?? e.date
      return dayStr >= e.date && dayStr <= endStr
    })
  }

  // 選択日のイベント（範囲イベント含む）
  const selectedDayEvents = selectedDate ? (() => {
    const dayStr = format(selectedDate, 'yyyy-MM-dd')
    return events.filter(e => {
      const endStr = e.end_date ?? e.date
      return dayStr >= e.date && dayStr <= endStr
    })
  })() : []

  function resetForm() {
    setNewTitle(''); setNewType('visit'); setNewMemo('')
    setNewTraveler('me'); setNewFlightPayer('me')
    setNewEndDate(null)
    setEditingEvent(null)
  }

  function openEditSheet(event: CalEvent) {
    setEditingEvent(event)
    setNewTitle(event.title)
    setNewType(event.type)
    setNewMemo(event.memo ?? '')
    setNewTraveler(event.traveler ?? 'me')
    setNewFlightPayer(event.flight_payer ?? (event.type === 'trip' ? 'split' : 'me'))
    const [y, m, d] = event.date.split('-').map(Number)
    setSelectedDate(new Date(y, m - 1, d))
    if (event.end_date) {
      const [ey, em, ed] = event.end_date.split('-').map(Number)
      setNewEndDate(new Date(ey, em - 1, ed))
    } else {
      setNewEndDate(null)
    }
    setShowEventSheet(false)
    setShowAddSheet(true)
  }

  async function handleAddEvent() {
    if (!selectedDate || !newTitle) return
    const dateStr    = format(selectedDate, 'yyyy-MM-dd')
    const endDateStr = newEndDate && newEndDate >= selectedDate
      ? format(newEndDate, 'yyyy-MM-dd')
      : null

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && userId && coupleId) {
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      const row: Record<string, unknown> = {
        couple_id:  coupleId,
        created_by: userId,
        title:      newTitle,
        event_date: dateStr,
        end_date:   endDateStr,
        event_type: newType,
        memo:       newMemo || null,
      }
      if (newType === 'visit') {
        row.traveler     = newTraveler
        row.flight_payer = newFlightPayer
      } else if (newType === 'trip') {
        row.flight_payer = newFlightPayer
      }
      const { data, error } = await db.from('events').insert(row).select().single()
      if (!error && data) {
        setEvents(prev => [...prev, {
          id: data.id, title: data.title, date: data.event_date,
          end_date: data.end_date ?? undefined,
          type: data.event_type, memo: data.memo ?? undefined,
          traveler: data.traveler ?? undefined, flight_payer: data.flight_payer ?? undefined,
        }])
      }
    } else {
      const event: CalEvent = {
        id: Date.now().toString(), title: newTitle, date: dateStr,
        end_date: endDateStr ?? undefined,
        type: newType, memo: newMemo || undefined,
      }
      if (newType === 'visit') { event.traveler = newTraveler; event.flight_payer = newFlightPayer }
      else if (newType === 'trip') { event.flight_payer = newFlightPayer }
      setEvents(prev => [...prev, event])
    }

    resetForm()
    setShowAddSheet(false)
    setShowEventSheet(true)
  }

  async function handleUpdateEvent() {
    if (!editingEvent || !selectedDate || !newTitle) return
    const dateStr    = format(selectedDate, 'yyyy-MM-dd')
    const endDateStr = newEndDate && newEndDate >= selectedDate
      ? format(newEndDate, 'yyyy-MM-dd')
      : null
    const updates: Record<string, unknown> = {
      title:       newTitle,
      event_date:  dateStr,
      end_date:    endDateStr,
      event_type:  newType,
      memo:        newMemo || null,
      traveler:    newType === 'visit' ? newTraveler : null,
      flight_payer: (newType === 'visit' || newType === 'trip') ? newFlightPayer : null,
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      await db.from('events').update(updates).eq('id', editingEvent.id)
    }

    setEvents(prev => prev.map(e => e.id === editingEvent.id ? {
      ...e,
      title: newTitle, date: dateStr, end_date: endDateStr ?? undefined, type: newType,
      memo: newMemo || undefined,
      traveler: newType === 'visit' ? newTraveler : undefined,
      flight_payer: (newType === 'visit' || newType === 'trip') ? newFlightPayer : undefined,
    } : e))

    resetForm()
    setShowAddSheet(false)
    setShowEventSheet(true)
  }

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} className="p-2 transition-opacity active:opacity-50" style={{ color: '#737373' }}>
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold" style={{ color: '#1A1A1A' }}>
            {format(currentMonth, 'yyyy年 M月', { locale: ja })}
          </h1>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs font-medium px-2 py-0.5 transition-opacity active:opacity-50"
            style={{ color: '#6D5BD0', backgroundColor: '#F3F0FF', borderRadius: '6px' }}
          >
            今日
          </button>
        </div>
        <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} className="p-2 transition-opacity active:opacity-50" style={{ color: '#737373' }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
        {Object.entries(eventTypeConfig).map(([type, config]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.dot }} />
            <span className="text-xs" style={{ color: '#737373' }}>{config.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <Card padding="sm">
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center py-1">
              <span className="text-xs" style={{ color: '#A3A3A3' }}>{d}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {calDays.map(day => {
            const dayStr         = format(day, 'yyyy-MM-dd')
            const dayEvents      = eventsOnDay(day)
            const rangeEvents    = dayEvents.filter(e => e.end_date && e.end_date !== e.date)
            const singleEvents   = dayEvents.filter(e => !e.end_date || e.end_date === e.date)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isToday        = isSameDay(day, new Date())
            const isSelected     = selectedDate ? isSameDay(day, selectedDate) : false
            return (
              <button
                key={day.toISOString()}
                onClick={() => { setSelectedDate(day); setShowEventSheet(true) }}
                className="flex flex-col items-center py-1.5 rounded-lg relative"
                style={{
                  backgroundColor: isSelected ? '#F5F5F3' : 'transparent',
                  opacity: isCurrentMonth ? 1 : 0.25,
                  overflow: 'visible',
                }}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm mb-0.5"
                  style={{
                    backgroundColor: isToday ? '#1A1A1A' : 'transparent',
                    color: isToday ? '#FFFFFF' : '#1A1A1A',
                    fontWeight: isToday ? 600 : 400,
                  }}
                >
                  {format(day, 'd')}
                </span>
                {/* Event indicators */}
                <div className="relative w-full" style={{ height: '8px' }}>
                  {/* Range event bars */}
                  {rangeEvents.slice(0, 2).map((e, i) => {
                    const pos = getRangePos(e, dayStr)
                    return (
                      <div
                        key={e.id}
                        style={{
                          position: 'absolute',
                          top: i * 4,
                          height: 3,
                          left:  pos === 'start' ? '50%' : 0,
                          right: pos === 'end'   ? '50%' : 0,
                          backgroundColor: eventTypeConfig[e.type].dot,
                          opacity: 0.75,
                          borderRadius:
                            pos === 'start' ? '3px 0 0 3px' :
                            pos === 'end'   ? '0 3px 3px 0' : 0,
                        }}
                      />
                    )
                  })}
                  {/* Dots for single-day events */}
                  {rangeEvents.length === 0 && (
                    <div className="absolute inset-0 flex gap-0.5 items-center justify-center">
                      {singleEvents.slice(0, 3).map((e, j) => (
                        <span
                          key={j}
                          style={{
                            width: 6, height: 6, borderRadius: '50%',
                            backgroundColor: eventTypeConfig[e.type].dot,
                            flexShrink: 0,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* FAB */}
      <button
        onClick={() => setShowAddSheet(true)}
        className="fixed right-4 z-30 flex items-center gap-2 px-5 py-3 active:opacity-70 transition-opacity"
        style={{ bottom: `calc(env(safe-area-inset-bottom) + 76px)`, backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: '10px' }}
      >
        <Plus size={18} strokeWidth={2} />
        <span className="text-sm font-medium">追加</span>
      </button>

      {/* Day detail sheet */}
      <BottomSheet
        open={showEventSheet && !showAddSheet}
        onClose={() => setShowEventSheet(false)}
        title={selectedDate ? format(selectedDate, 'M月d日(E)', { locale: ja }) : undefined}
      >
        {selectedDayEvents.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm" style={{ color: '#A3A3A3' }}>この日の予定はありません</p>
            <Button className="mt-4" variant="secondary" onClick={() => { setShowEventSheet(false); setShowAddSheet(true) }}>
              予定を追加する
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDayEvents.map(event => {
              const config  = eventTypeConfig[event.type]
              const isRange = event.end_date && event.end_date !== event.date
              return (
                <div key={event.id} className="p-4" style={{ backgroundColor: config.bg, borderRadius: '10px' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="text-xs font-medium px-2 py-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.7)', color: config.text, borderRadius: '6px' }}>
                        {config.label}
                      </span>
                      <p className="font-medium text-sm mt-1.5" style={{ color: '#1A1A1A' }}>{event.title}</p>
                      {isRange && (
                        <p className="text-xs mt-0.5" style={{ color: config.text }}>
                          {format(parseDateStr(event.date), 'M月d日')} 〜 {format(parseDateStr(event.end_date!), 'M月d日')}
                        </p>
                      )}
                      {event.memo && <p className="text-xs mt-1" style={{ color: '#737373' }}>{event.memo}</p>}
                      <FlightInfo event={event} myName={myName} partnerName={partnerName} />
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => openEditSheet(event)}
                        className="p-2 rounded-lg transition-opacity active:opacity-50"
                        style={{ backgroundColor: 'rgba(255,255,255,0.6)', color: '#737373' }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={async () => {
                          if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
                            const { createClient } = await import('@/lib/supabase/client')
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const db = createClient() as any
                            await db.from('events').delete().eq('id', event.id)
                          }
                          setEvents(prev => prev.filter(e => e.id !== event.id))
                        }}
                        className="p-2 rounded-lg transition-opacity active:opacity-50"
                        style={{ backgroundColor: 'rgba(255,255,255,0.6)', color: '#B5465A' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            <Button fullWidth variant="secondary" onClick={() => { setShowEventSheet(false); setShowAddSheet(true) }}>
              <Plus size={15} /> 追加する
            </Button>
          </div>
        )}
      </BottomSheet>

      {/* Add / Edit event sheet */}
      <BottomSheet open={showAddSheet} onClose={() => { setShowAddSheet(false); resetForm() }} title={editingEvent ? 'イベントを編集' : 'イベントを追加'}>
        <div className="space-y-4">
          {/* タイトル */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>タイトル</label>
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} placeholder="例：東京デート" />
          </div>

          {/* 種類 */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>種類</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(eventTypeConfig).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => {
                    setNewType(type as EventType)
                    if (type === 'trip') setNewFlightPayer('split')
                    else setNewFlightPayer('me')
                  }}
                  className="py-2 px-2 text-xs font-medium transition-opacity"
                  style={{
                    backgroundColor: newType === type ? config.bg : '#F5F5F3',
                    color: newType === type ? config.text : '#737373',
                    borderRadius: '8px',
                    border: `0.5px solid ${newType === type ? config.dot : '#E5E5E5'}`,
                  }}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* 飛行機代（visit） */}
          {newType === 'visit' && (
            <VisitFlightForm
              traveler={newTraveler}       setTraveler={setNewTraveler}
              flightPayer={newFlightPayer} setFlightPayer={setNewFlightPayer}
              myName={myName} partnerName={partnerName}
            />
          )}

          {/* 飛行機代（trip） */}
          {newType === 'trip' && (
            <TripFlightForm
              flightPayer={newFlightPayer} setFlightPayer={setNewFlightPayer}
              myName={myName} partnerName={partnerName}
            />
          )}

          {/* 開始日 */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>開始日</label>
            <DateInput
              value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
              onChange={v => {
                if (v) {
                  const [y, m, d] = v.split('-').map(Number)
                  const newStart = new Date(y, m - 1, d)
                  setSelectedDate(newStart)
                  // 終了日が開始日より前なら終了日をリセット
                  if (newEndDate && newEndDate < newStart) setNewEndDate(null)
                }
              }}
            />
          </div>

          {/* 終了日 */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>
              終了日
              <span className="ml-1 normal-case font-normal" style={{ color: '#A3A3A3' }}>（任意・複数日の場合）</span>
            </label>
            <DateInput
              value={newEndDate ? format(newEndDate, 'yyyy-MM-dd') : ''}
              onChange={v => {
                if (!v) { setNewEndDate(null); return }
                const [y, m, d] = v.split('-').map(Number)
                const parsed = new Date(y, m - 1, d)
                // 開始日以降のみ受け付ける
                if (selectedDate && parsed >= selectedDate) setNewEndDate(parsed)
              }}
              minDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
            />
            {newEndDate && (
              <button
                type="button"
                onClick={() => setNewEndDate(null)}
                className="mt-1.5 text-xs"
                style={{ color: '#A3A3A3' }}
              >
                終了日をクリア
              </button>
            )}
          </div>

          {/* メモ */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>メモ（任意）</label>
            <textarea value={newMemo} onChange={e => setNewMemo(e.target.value)} style={{ ...inputStyle, resize: 'none' }} rows={3} placeholder="メモを追加..." />
          </div>

          {editingEvent
            ? <Button fullWidth onClick={handleUpdateEvent} disabled={!newTitle}>更新する</Button>
            : <Button fullWidth onClick={handleAddEvent}    disabled={!newTitle}>追加する</Button>
          }
        </div>
      </BottomSheet>
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarPageInner />
    </Suspense>
  )
}
