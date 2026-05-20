'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths,
  differenceInDays,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2, Plane, Pencil, X, CalendarDays } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import BottomSheet from '@/components/BottomSheet'
import DateInput from '@/components/ui/DateInput'
import { haptic } from '@/lib/haptics'
import { PullToRefresh } from '@/components/PullToRefresh'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwipeable } from 'react-swipeable'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useToast } from '@/components/ToastProvider'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { PageTransition } from '@/components/PageTransition'

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

/** カレンダーグリッドの月切り替えアニメーション variants */
const calGridVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '40%' : '-40%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? '-40%' : '40%',
    opacity: 0,
    transition: { duration: 0.16 },
  }),
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '14px',
  outline: 'none',
  border: '0.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text)',
}

function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Realtime payload の events レコードを CalEvent にマップ */
function toCalEvent(r: Record<string, unknown>): CalEvent {
  return {
    id:           r.id           as string,
    title:        r.title        as string,
    date:         r.event_date   as string,
    end_date:    (r.end_date     as string | null) ?? undefined,
    type:         r.event_type   as EventType,
    memo:        (r.memo         as string | null) ?? undefined,
    traveler:    (r.traveler     as Traveler | null) ?? undefined,
    flight_payer:(r.flight_payer as FlightPayer | null) ?? undefined,
  }
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

// ============================================================
// フライト情報 — 型・定数・ヘルパー
// ============================================================

const COMMON_AIRPORTS = ['HND', 'NRT', 'ITM', 'KIX', 'FUK', 'CTS', 'OKA', 'NGO']

interface StoredFlight {
  id: string
  flight_number: string | null
  airline: string | null
  departure_airport: string | null
  arrival_airport: string | null
  departure_time: string | null   // ISO string from DB
  arrival_time: string | null
  direction: 'outbound' | 'return' | null
  passenger_id: string | null
  seat: string | null
  booking_reference: string | null
}

interface FlightDraft {
  id?: string                     // 編集時のみ
  _localId: string                // React key用の一意ID（DBには送らない）
  flight_number: string
  airline: string
  departure_airport: string
  arrival_airport: string
  departure_time: string          // datetime-local "YYYY-MM-DDTHH:mm"
  arrival_time: string
  direction: 'outbound' | 'return'
  passenger: 'me' | 'partner'
  seat: string
  booking_reference: string
}

function emptyDraft(eventDate: string): FlightDraft {
  return {
    _localId: `${Date.now()}-${Math.random()}`,
    flight_number: '', airline: '',
    departure_airport: '', arrival_airport: '',
    departure_time: `${eventDate}T09:00`,
    arrival_time:   `${eventDate}T11:00`,
    direction: 'outbound', passenger: 'me',
    seat: '', booking_reference: '',
  }
}

/** datetime-local 文字列に時間を加算（文字列操作、TZ 変換なし） */
function addHoursToLocal(dtLocal: string, hours: number): string {
  if (!dtLocal) return ''
  const [date, time] = dtLocal.split('T')
  const [h, m] = time.split(':').map(Number)
  const totalH = h + hours
  if (totalH < 24) return `${date}T${String(totalH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  const d = new Date(date)
  d.setDate(d.getDate() + Math.floor(totalH / 24))
  const nd = d.toISOString().slice(0, 10)
  return `${nd}T${String(totalH % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** ISO → datetime-local 入力値 "YYYY-MM-DDTHH:mm"（ローカルタイム） */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  const y  = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dy = String(d.getDate()).padStart(2, '0')
  const h  = String(d.getHours()).padStart(2, '0')
  const mn = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${dy}T${h}:${mn}`
}

/** ISO → "HH:mm"（ローカルタイム） */
function isoToTimeStr(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 出発まで24時間以内なら "あと◯時間◯分で出発"、それ以外は null */
function departureCountdown(iso: string | null): string | null {
  if (!iso) return null
  const dep = new Date(iso)
  const diff = dep.getTime() - Date.now()
  if (diff <= 0 || diff > 24 * 3600000) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `あと${h}時間${m}分で出発` : `あと${m}分で出発`
}

// ---- 保存済みフライトの表示カード ----
function StoredFlightCard({
  flight, userId, myName, partnerName,
}: {
  flight: StoredFlight
  userId: string | null
  myName: string
  partnerName: string
}) {
  const depTime  = isoToTimeStr(flight.departure_time)
  const arrTime  = isoToTimeStr(flight.arrival_time)
  const countdown = departureCountdown(flight.departure_time)
  const passenger = flight.passenger_id === userId ? myName : partnerName
  const dirLabel  = flight.direction === 'outbound' ? '往路' : flight.direction === 'return' ? '復路' : null

  return (
    <div style={{ backgroundColor: '#F3F0FF', borderRadius: '12px', padding: '14px' }}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Plane size={13} style={{ color: '#6D5BD0' }} />
          {dirLabel && (
            <span className="text-xs font-medium px-2 py-0.5"
              style={{ backgroundColor: '#6D5BD0', color: '#FFF', borderRadius: '100px' }}>
              {dirLabel}
            </span>
          )}
        </div>
        {countdown && (
          <span className="text-xs font-medium" style={{ color: '#6D5BD0' }}>{countdown}</span>
        )}
      </div>

      {/* 便名・航空会社 */}
      {(flight.flight_number || flight.airline) && (
        <p className="text-sm font-semibold mb-2.5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)', letterSpacing: '0.03em' }}>
          {[flight.flight_number, flight.airline].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* 時刻・空港 */}
      {(depTime || arrTime || flight.departure_airport || flight.arrival_airport) && (
        <div className="flex items-center gap-2 mb-2.5">
          <div className="text-center">
            <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)', lineHeight: 1, letterSpacing: '0.02em' }}>{depTime || '—'}</p>
            <p className="text-xs font-medium mt-0.5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-visit-accent)', letterSpacing: '0.06em' }}>{flight.departure_airport || '—'}</p>
          </div>
          <div className="flex-1 flex items-center gap-1">
            <div style={{ flex: 1, height: '1px', backgroundColor: '#C4B8F0' }} />
            <Plane size={11} style={{ color: '#C4B8F0', transform: 'rotate(0deg)' }} />
            <div style={{ flex: 1, height: '1px', backgroundColor: '#C4B8F0' }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)', lineHeight: 1, letterSpacing: '0.02em' }}>{arrTime || '—'}</p>
            <p className="text-xs font-medium mt-0.5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-visit-accent)', letterSpacing: '0.06em' }}>{flight.arrival_airport || '—'}</p>
          </div>
        </div>
      )}

      {/* 搭乗者・座席・予約番号 */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
        {flight.passenger_id && (
          <span className="text-xs" style={{ color: '#737373' }}>搭乗者: {passenger}</span>
        )}
        {flight.seat && (
          <span className="text-xs" style={{ color: '#737373' }}>座席: {flight.seat}</span>
        )}
        {flight.booking_reference && (
          <span className="text-xs" style={{ color: '#737373' }}>予約番号: {flight.booking_reference}</span>
        )}
      </div>
    </div>
  )
}

// ---- フォーム内フライト入力（1便分） ----
const flightInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: '13px',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.03em',
  outline: 'none',
  border: '0.5px solid #D4CAFF',
  borderRadius: '8px',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text)',
}
const flightLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 500,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#8B7FD4',
  marginBottom: '4px',
}

function FlightDraftItem({
  draft, index, myName, partnerName, onChange, onRemove,
}: {
  draft: FlightDraft
  index: number
  myName: string
  partnerName: string
  onChange: (i: number, u: Partial<FlightDraft>) => void
  onRemove: (i: number) => void
}) {
  return (
    <div style={{ backgroundColor: '#F3F0FF', borderRadius: '12px', padding: '14px' }} className="space-y-2.5">
      {/* 往路/復路 + 削除 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(['outbound', 'return'] as const).map(dir => (
            <button key={dir} type="button"
              onClick={() => onChange(index, { direction: dir })}
              className="text-xs px-3 py-1 font-medium"
              style={{
                backgroundColor: draft.direction === dir ? '#6D5BD0' : '#EEECF9',
                color: draft.direction === dir ? '#FFF' : '#6D5BD0',
                borderRadius: '100px',
              }}
            >
              {dir === 'outbound' ? '往路' : '復路'}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => onRemove(index)}
          className="p-1 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}>
          <X size={15} />
        </button>
      </div>

      {/* 便名 + 航空会社 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label style={flightLabelStyle}>便名</label>
          <input style={flightInputStyle} value={draft.flight_number} placeholder="NH123"
            onChange={e => onChange(index, { flight_number: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <label style={flightLabelStyle}>航空会社</label>
          <input style={flightInputStyle} value={draft.airline} placeholder="ANA"
            onChange={e => onChange(index, { airline: e.target.value })} />
        </div>
      </div>

      {/* 出発空港 → 到着空港 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label style={flightLabelStyle}>出発空港</label>
          <input style={flightInputStyle} value={draft.departure_airport}
            placeholder="HND" maxLength={4}
            onChange={e => onChange(index, { departure_airport: e.target.value.toUpperCase() })} />
          <div className="flex gap-1 flex-wrap mt-1.5">
            {COMMON_AIRPORTS.slice(0, 4).map(c => (
              <button key={c} type="button"
                onClick={() => onChange(index, { departure_airport: c })}
                className="text-xs px-1.5 py-0.5"
                style={{ backgroundColor: '#EEECF9', color: '#6D5BD0', borderRadius: '5px' }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={flightLabelStyle}>到着空港</label>
          <input style={flightInputStyle} value={draft.arrival_airport}
            placeholder="ITM" maxLength={4}
            onChange={e => onChange(index, { arrival_airport: e.target.value.toUpperCase() })} />
          <div className="flex gap-1 flex-wrap mt-1.5">
            {COMMON_AIRPORTS.slice(0, 4).map(c => (
              <button key={c} type="button"
                onClick={() => onChange(index, { arrival_airport: c })}
                className="text-xs px-1.5 py-0.5"
                style={{ backgroundColor: '#EEECF9', color: '#6D5BD0', borderRadius: '5px' }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 出発時刻 + 到着時刻 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label style={flightLabelStyle}>出発時刻</label>
          <input type="datetime-local" style={flightInputStyle} value={draft.departure_time}
            onChange={e => {
              const dep = e.target.value
              const updates: Partial<FlightDraft> = { departure_time: dep }
              // 到着時刻が未入力なら出発の2時間後を自動セット
              if (dep && !draft.arrival_time) {
                updates.arrival_time = addHoursToLocal(dep, 2)
              }
              onChange(index, updates)
            }} />
        </div>
        <div>
          <label style={flightLabelStyle}>到着時刻</label>
          <input type="datetime-local" style={flightInputStyle} value={draft.arrival_time}
            onChange={e => onChange(index, { arrival_time: e.target.value })} />
        </div>
      </div>

      {/* 搭乗者 */}
      <div>
        <label style={flightLabelStyle}>搭乗者</label>
        <div className="flex gap-2">
          {(['me', 'partner'] as const).map(p => (
            <button key={p} type="button"
              onClick={() => onChange(index, { passenger: p })}
              className="flex-1 py-1.5 text-sm font-medium"
              style={{
                backgroundColor: draft.passenger === p ? '#6D5BD0' : '#EEECF9',
                color: draft.passenger === p ? '#FFF' : '#6D5BD0',
                borderRadius: '8px',
                border: `0.5px solid ${draft.passenger === p ? '#6D5BD0' : '#D4CAFF'}`,
              }}>
              {p === 'me' ? myName : partnerName}
            </button>
          ))}
        </div>
      </div>

      {/* 座席番号 + 予約番号 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label style={flightLabelStyle}>座席番号</label>
          <input style={flightInputStyle} value={draft.seat} placeholder="12A"
            onChange={e => onChange(index, { seat: e.target.value })} />
        </div>
        <div>
          <label style={flightLabelStyle}>予約番号</label>
          <input style={flightInputStyle} value={draft.booking_reference} placeholder="ABC123"
            onChange={e => onChange(index, { booking_reference: e.target.value })} />
        </div>
      </div>
    </div>
  )
}

// ---- フォーム内フライトセクション全体 ----
function FlightDraftFormSection({
  drafts, eventDate, myName, partnerName,
  showForm, onToggle, onAdd, onChange, onRemove,
}: {
  drafts: FlightDraft[]
  eventDate: string
  myName: string
  partnerName: string
  showForm: boolean
  onToggle: () => void
  onAdd: () => void
  onChange: (i: number, u: Partial<FlightDraft>) => void
  onRemove: (i: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#A3A3A3' }}>
          フライト情報（任意）
        </label>
        <button type="button" onClick={onToggle}
          className="flex items-center gap-1 text-xs font-medium transition-opacity active:opacity-50"
          style={{ color: '#6D5BD0' }}>
          <Plane size={12} />
          {showForm && drafts.length > 0 ? '閉じる' : 'フライトを追加'}
        </button>
      </div>

      {showForm && (
        <div className="space-y-3 mt-3">
          {drafts.map((draft, i) => (
            <FlightDraftItem key={draft._localId} draft={draft} index={i}
              myName={myName} partnerName={partnerName}
              onChange={onChange} onRemove={onRemove} />
          ))}
          <button type="button" onClick={onAdd}
            className="w-full py-2.5 text-sm flex items-center justify-center gap-2"
            style={{ border: '0.5px dashed #C4B8F0', borderRadius: '10px', color: '#8B7FD4' }}>
            <Plus size={14} />
            フライトを追加
          </button>
        </div>
      )}
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
  const [swipeDir, setSwipeDir] = useState(0)  // 1=次月, -1=前月
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [showEventSheet, setShowEventSheet] = useState(!!initialDate)
  const [events, setEvents] = useState<CalEvent[]>([])
  const [userId, setUserId]   = useState<string | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [myName, setMyName]       = useState('わたし')
  const [partnerName, setPartnerName] = useState('パートナー')
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const { showToast } = useToast()

  // フライト
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [flightsByEventId, setFlightsByEventId] = useState<Record<string, StoredFlight[]>>({})
  const [flightDrafts, setFlightDrafts] = useState<FlightDraft[]>([])
  const [showFlightForm, setShowFlightForm] = useState(false)

  // フォーム state
  const [newTitle,      setNewTitle]      = useState('')
  const [newType,       setNewType]       = useState<EventType>('visit')
  const [newMemo,       setNewMemo]       = useState('')
  const [newTraveler,   setNewTraveler]   = useState<Traveler>('me')
  const [newFlightPayer, setNewFlightPayer] = useState<FlightPayer>('me')
  const [newEndDate,    setNewEndDate]    = useState<Date | null>(null)

  // Supabase からイベント取得
  const load = useCallback(async () => {
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
      const pid = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
      if (pid) {
        setPartnerId(pid)
        const { data: partnerData } = await db.from('users').select('display_name').eq('id', pid).single()
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

    // フライト一括取得（カップルの全フライトを event_id でグループ化）
    const { data: flightsRaw } = await db
      .from('flights')
      .select('id, event_id, flight_number, airline, departure_airport, arrival_airport, departure_time, arrival_time, direction, passenger_id, seat, booking_reference')
      .eq('couple_id', userData.couple_id)
      .order('departure_time', { ascending: true })

    const fMap: Record<string, StoredFlight[]> = {}
    for (const f of flightsRaw ?? []) {
      if (!fMap[f.event_id]) fMap[f.event_id] = []
      fMap[f.event_id].push(f as StoredFlight)
    }
    setFlightsByEventId(fMap)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useAutoRefresh(load)

  // ハイライトを一定時間後にクリア
  useEffect(() => {
    if (!highlightedId) return
    const t = setTimeout(() => setHighlightedId(null), 1500)
    return () => clearTimeout(t)
  }, [highlightedId])

  // Realtime 購読（パートナーの変更を即時反映）
  useRealtimeSync({
    table: 'events',
    coupleId,
    myId: userId,
    onInsert: (rec, isPartner) => {
      const e = toCalEvent(rec)
      setEvents(prev => {
        if (prev.some(x => x.id === e.id)) return prev  // 自己INSERT の二重防止
        return [...prev, e].sort((a, b) => a.date.localeCompare(b.date))
      })
      if (isPartner) {
        haptic('light')
        setHighlightedId(e.id)
        showToast(`「${e.title}」が追加されました`)
      }
    },
    onUpdate: (rec, isPartner) => {
      const e = toCalEvent(rec)
      setEvents(prev => prev.map(x => x.id === e.id ? e : x))
      if (isPartner) haptic('light')
    },
    onDelete: (id) => {
      setEvents(prev => prev.filter(x => x.id !== id))
    },
  })

  /** 月切り替え（スワイプ・ボタン共通） */
  function changeMonth(dir: 1 | -1) {
    setSwipeDir(dir)
    setCurrentMonth(prev => dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1))
    haptic('light')
  }

  const swipeHandlers = useSwipeable({
    onSwipedLeft:  () => changeMonth(1),
    onSwipedRight: () => changeMonth(-1),
    trackMouse: false,
    delta: 40,
    preventScrollOnSwipe: false,
  })

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
    setFlightDrafts([])
    setShowFlightForm(false)
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

    // 既存フライトをドラフトに変換
    const existingFlights = flightsByEventId[event.id] ?? []
    if (existingFlights.length > 0) {
      setFlightDrafts(existingFlights.map(f => ({
        id: f.id,
        _localId: f.id,   // DB の id を安定キーとして使用
        flight_number:    f.flight_number    ?? '',
        airline:          f.airline          ?? '',
        departure_airport: f.departure_airport ?? '',
        arrival_airport:  f.arrival_airport  ?? '',
        departure_time:   f.departure_time   ? isoToLocalInput(f.departure_time) : '',
        arrival_time:     f.arrival_time     ? isoToLocalInput(f.arrival_time)   : '',
        direction:        f.direction        ?? 'outbound',
        passenger:        (f.passenger_id && userId && f.passenger_id === userId) ? 'me' : 'partner',
        seat:             f.seat             ?? '',
        booking_reference: f.booking_reference ?? '',
      })))
      setShowFlightForm(true)
    } else {
      setFlightDrafts([])
      setShowFlightForm(false)
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

        // フライト保存
        const validDrafts = flightDrafts.filter(
          d => d.flight_number || d.departure_airport || d.departure_time
        )
        if (validDrafts.length > 0) {
          const flightRows = validDrafts.map(d => ({
            event_id:          data.id,
            couple_id:         coupleId,
            flight_number:     d.flight_number     || null,
            airline:           d.airline           || null,
            departure_airport: d.departure_airport || null,
            arrival_airport:   d.arrival_airport   || null,
            departure_time:    d.departure_time    ? new Date(d.departure_time).toISOString() : null,
            arrival_time:      d.arrival_time      ? new Date(d.arrival_time).toISOString()   : null,
            direction:         d.direction         || null,
            passenger_id:      d.passenger === 'me' ? userId : partnerId,
            seat:              d.seat              || null,
            booking_reference: d.booking_reference || null,
          }))
          const { data: insertedFlights } = await db.from('flights').insert(flightRows).select()
          if (insertedFlights) {
            setFlightsByEventId(prev => ({ ...prev, [data.id]: insertedFlights as StoredFlight[] }))
          }
        }
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

    haptic('success')
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

      // フライト: 既存を全削除して再挿入
      await db.from('flights').delete().eq('event_id', editingEvent.id)
      const validDrafts = flightDrafts.filter(
        d => d.flight_number || d.departure_airport || d.departure_time
      )
      if (validDrafts.length > 0 && coupleId) {
        const flightRows = validDrafts.map(d => ({
          event_id:          editingEvent.id,
          couple_id:         coupleId,
          flight_number:     d.flight_number     || null,
          airline:           d.airline           || null,
          departure_airport: d.departure_airport || null,
          arrival_airport:   d.arrival_airport   || null,
          departure_time:    d.departure_time    ? new Date(d.departure_time).toISOString() : null,
          arrival_time:      d.arrival_time      ? new Date(d.arrival_time).toISOString()   : null,
          direction:         d.direction         || null,
          passenger_id:      d.passenger === 'me' ? userId : partnerId,
          seat:              d.seat              || null,
          booking_reference: d.booking_reference || null,
        }))
        const { data: updatedFlights } = await db.from('flights').insert(flightRows).select()
        setFlightsByEventId(prev => ({
          ...prev,
          [editingEvent.id]: (updatedFlights ?? []) as StoredFlight[],
        }))
      } else {
        setFlightsByEventId(prev => ({ ...prev, [editingEvent.id]: [] }))
      }
    }

    setEvents(prev => prev.map(e => e.id === editingEvent.id ? {
      ...e,
      title: newTitle, date: dateStr, end_date: endDateStr ?? undefined, type: newType,
      memo: newMemo || undefined,
      traveler: newType === 'visit' ? newTraveler : undefined,
      flight_payer: (newType === 'visit' || newType === 'trip') ? newFlightPayer : undefined,
    } : e))

    haptic('success')
    resetForm()
    setShowAddSheet(false)
    setShowEventSheet(true)
  }

  return (
    <>
    <PageTransition>
    <PullToRefresh onRefresh={load}>
    <div className="px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => changeMonth(-1)} className="p-2 transition-opacity active:opacity-50" style={{ color: '#737373' }}>
          <ChevronLeft size={20} strokeWidth={1.5} />
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
        <button onClick={() => changeMonth(1)} className="p-2 transition-opacity active:opacity-50" style={{ color: '#737373' }}>
          <ChevronRight size={20} strokeWidth={1.5} />
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
        <div className="flex items-center gap-1.5">
          <Plane size={10} strokeWidth={1.5} style={{ color: '#737373' }} />
          <span className="text-xs" style={{ color: '#737373' }}>フライト</span>
        </div>
      </div>

      {/* Month summary */}
      {(() => {
        const monthStr = format(currentMonth, 'yyyy-MM')
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const today0   = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
        const monthEvents = events.filter(e => e.date.startsWith(monthStr) || (e.end_date ?? e.date).startsWith(monthStr))
        const visitTripCount = monthEvents.filter(e => e.type === 'visit' || e.type === 'trip').length
        const nextVisitTrip = events
          .filter(e => (e.type === 'visit' || e.type === 'trip') && e.date >= todayStr && e.date.startsWith(monthStr))
          .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
        if (visitTripCount === 0 && !nextVisitTrip) return null

        const nextStart = nextVisitTrip ? parseDateStr(nextVisitTrip.date) : null
        const nextEnd   = nextVisitTrip?.end_date && nextVisitTrip.end_date !== nextVisitTrip.date
          ? parseDateStr(nextVisitTrip.end_date) : null
        const daysLeft  = nextStart ? differenceInDays(nextStart, today0) : null

        return (
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mb-3 px-1">
            {visitTripCount > 0 && (
              <span className="text-xs" style={{ color: '#737373' }}>
                この月: <strong style={{ color: '#1A1A1A' }}>{visitTripCount}件の会う日</strong>
              </span>
            )}
            {nextVisitTrip && nextStart && (
              <span className="text-xs" style={{ color: '#737373' }}>
                {'次: '}
                <strong style={{ color: '#1A1A1A' }}>
                  {format(nextStart, 'M/d(E)', { locale: ja })}
                  {nextEnd && ` 〜 ${format(nextEnd, 'M/d(E)', { locale: ja })}`}
                </strong>
                {daysLeft !== null && daysLeft > 0 && (
                  <span style={{ color: '#A3A3A3' }}>{` · あと${daysLeft}日`}</span>
                )}
                {daysLeft === 0 && (
                  <span style={{ color: '#6D5BD0' }}>{' · 今日'}</span>
                )}
              </span>
            )}
          </div>
        )
      })()}

      {/* Calendar Grid — スワイプで月切り替え */}
      {/* overflow:clip = hidden と同じ視覚クリップだが BFC を作らず
           position:fixed の含有ブロックに影響しない */}
      <div {...swipeHandlers} style={{ overflow: 'clip', borderRadius: '12px' }}>
        <AnimatePresence mode="wait" custom={swipeDir} initial={false}>
        <motion.div
          key={format(currentMonth, 'yyyy-MM')}
          custom={swipeDir}
          variants={calGridVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
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
            const hasFlights     = dayEvents.some(e => (flightsByEventId[e.id]?.length ?? 0) > 0)
            const hasAnniversary = dayEvents.some(e => e.type === 'anniversary')
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isToday        = isSameDay(day, new Date())
            const isSelected     = selectedDate ? isSameDay(day, selectedDate) : false
            // 範囲帯：visit/trip の複数日イベントのうち最初の1件
            const primaryRange   = rangeEvents.find(e => e.type === 'visit' || e.type === 'trip') ?? null
            const rangePos       = primaryRange ? getRangePos(primaryRange, dayStr) : null
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
                {/* 範囲帯背景（visit/trip の複数日イベント） */}
                {primaryRange && rangePos && rangePos !== 'single' && !isSelected && (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: 0, bottom: 0,
                      left:  rangePos === 'start' ? '50%' : 0,
                      right: rangePos === 'end'   ? '50%' : 0,
                      backgroundColor: eventTypeConfig[primaryRange.type].dot,
                      opacity: 0.13,
                      borderRadius:
                        rangePos === 'start' ? '8px 0 0 8px' :
                        rangePos === 'end'   ? '0 8px 8px 0' : 0,
                      pointerEvents: 'none',
                    }}
                  />
                )}
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
                {/* フライトアイコン（右上） */}
                {hasFlights && (
                  <span style={{ position: 'absolute', top: 2, right: 4, lineHeight: 1 }}>
                    <Plane size={8} strokeWidth={1.5} style={{ color: '#A3A3A3' }} />
                  </span>
                )}
                {/* 記念日スター（左上） */}
                {hasAnniversary && (
                  <span aria-hidden style={{ position: 'absolute', top: 2, left: 3, fontSize: '7px', lineHeight: 1, color: '#C4963A' }}>
                    ★
                  </span>
                )}
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
        </motion.div>
        </AnimatePresence>
      </div>

      {/* Day detail sheet */}
      <BottomSheet
        open={showEventSheet && !showAddSheet}
        onClose={() => setShowEventSheet(false)}
        title={selectedDate ? format(selectedDate, 'M月d日(E)', { locale: ja }) : undefined}
      >
        {selectedDayEvents.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <CalendarDays size={28} strokeWidth={1.5} style={{ color: '#D4D4D4' }} />
            <p className="font-serif italic" style={{ color: '#A3A3A3', fontSize: '15px' }}>この日の予定はありません</p>
            <Button className="mt-2" variant="secondary" onClick={() => { setShowEventSheet(false); setShowAddSheet(true) }}>
              予定を追加する
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDayEvents.map(event => {
              const config  = eventTypeConfig[event.type]
              const isRange = event.end_date && event.end_date !== event.date
              return (
                <div key={event.id} className="p-4 transition-shadow" style={{ backgroundColor: config.bg, borderRadius: '10px', boxShadow: event.id === highlightedId ? `0 0 0 2px ${config.text}` : 'none' }}>
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
                        <Pencil size={15} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={async () => {
                          haptic('warning')
                          if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
                            const { createClient } = await import('@/lib/supabase/client')
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const db = createClient() as any
                            const { error } = await db.from('events').delete().eq('id', event.id)
                            if (error) { showToast('削除に失敗しました'); return }
                          }
                          setEvents(prev => prev.filter(e => e.id !== event.id))
                        }}
                        className="p-2 rounded-lg transition-opacity active:opacity-50"
                        style={{ backgroundColor: 'rgba(255,255,255,0.6)', color: '#B5465A' }}
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                  {/* フライト詳細 — 全幅で下に展開 */}
                  {(flightsByEventId[event.id] ?? []).length > 0 && (
                    <div className="space-y-2 mt-3">
                      {(flightsByEventId[event.id] ?? []).map(f => (
                        <StoredFlightCard key={f.id} flight={f}
                          userId={userId} myName={myName} partnerName={partnerName} />
                      ))}
                    </div>
                  )}
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

          {/* フライト情報（visit / trip のみ） */}
          {(newType === 'visit' || newType === 'trip') && (
            <FlightDraftFormSection
              drafts={flightDrafts}
              eventDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
              myName={myName}
              partnerName={partnerName}
              showForm={showFlightForm}
              onToggle={() => {
                if (!showFlightForm && flightDrafts.length === 0) {
                  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
                  setFlightDrafts([emptyDraft(dateStr)])
                }
                setShowFlightForm(v => !v)
              }}
              onAdd={() => {
                const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
                setFlightDrafts(prev => [...prev, emptyDraft(dateStr)])
              }}
              onChange={(i, updates) => {
                setFlightDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, ...updates } : d))
              }}
              onRemove={(i) => {
                setFlightDrafts(prev => {
                  const next = prev.filter((_, idx) => idx !== i)
                  if (next.length === 0) setShowFlightForm(false)
                  return next
                })
              }}
            />
          )}

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
    </PullToRefresh>
    </PageTransition>

    {/* FAB — PageTransition外に配置して opacity アニメーションの影響を受けないようにする */}
    <button
      onClick={() => { haptic('medium'); setShowAddSheet(true) }}
      className="fixed right-4 z-30 flex items-center gap-2 px-5 py-3 active:opacity-70 transition-opacity"
      style={{ bottom: `calc(env(safe-area-inset-bottom) + 76px)`, backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: '10px' }}
    >
      <Plus size={18} strokeWidth={2} />
      <span className="text-sm font-medium">追加</span>
    </button>
    </>
  )
}

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarPageInner />
    </Suspense>
  )
}
