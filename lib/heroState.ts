import { differenceInDays, differenceInMonths, isSameDay } from 'date-fns'

export interface HeroEvent {
  id: string
  title: string
  date: string       // event_date（開始日）YYYY-MM-DD
  end_date?: string  // 終了日 YYYY-MM-DD
  type: string
}

export interface HeroFlight {
  departureTime: Date
  departureAirport?: string
}

export type HeroState =
  | { kind: 'no_meeting' }
  | { kind: 'upcoming';      event: HeroEvent; daysLeft: number }
  | { kind: 'departure_day'; event?: HeroEvent; flight: HeroFlight }
  | { kind: 'together';      event: HeroEvent; daysLeft: number }
  | { kind: 'last_day';      event: HeroEvent }
  | { kind: 'anniversary';   months: number }

/**
 * 現在の状況からヒーローエリアに表示すべき状態を計算する。
 *
 * @param upcomingEvents  event_date >= today のイベント一覧
 * @param currentEvent    現在進行中（start < today <= end）の visit/trip、なければ null
 * @param nextFlight      次の visit/trip に紐づくフライト情報、なければ null
 * @param anniversaryDate カップルの記念日、なければ null
 */
export function calculateHeroState(
  upcomingEvents: HeroEvent[],
  currentEvent: HeroEvent | null,
  nextFlight: HeroFlight | null,
  anniversaryDate: Date | null,
): HeroState {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // ── 1. 記念日チェック（月日が一致する月間記念日）────────────────────────
  if (anniversaryDate) {
    const anniv = new Date(
      anniversaryDate.getFullYear(),
      anniversaryDate.getMonth(),
      anniversaryDate.getDate(),
    )
    if (
      today.getDate()  === anniv.getDate() &&
      today.getMonth() === anniv.getMonth() &&
      today > anniv
    ) {
      return { kind: 'anniversary', months: differenceInMonths(today, anniv) }
    }
  }

  // ── 2. 現在進行中のイベント（旅行・会う日が開始済みで終了前）──────────────
  if (currentEvent) {
    const endStr = currentEvent.end_date ?? currentEvent.date
    const endDay = new Date(endStr.replace(/-/g, '/'))
    const endDate = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate())
    const daysLeft = differenceInDays(endDate, today)

    if (daysLeft <= 0) return { kind: 'last_day', event: currentEvent }
    return { kind: 'together', event: currentEvent, daysLeft }
  }

  // ── 3. 今日が出発日（フライトが今日かつ出発前）──────────────────────────
  if (nextFlight && isSameDay(nextFlight.departureTime, today) && now < nextFlight.departureTime) {
    const event = upcomingEvents.find(e =>
      isSameDay(new Date(e.date.replace(/-/g, '/')), today)
    )
    return { kind: 'departure_day', flight: nextFlight, event }
  }

  // ── 4. 未来の visit/trip ─────────────────────────────────────────────────
  const nextVisitTrip = upcomingEvents.find(e => e.type === 'visit' || e.type === 'trip')
  if (nextVisitTrip) {
    const startDay = new Date(nextVisitTrip.date.replace(/-/g, '/'))
    const startDate = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate())
    return { kind: 'upcoming', event: nextVisitTrip, daysLeft: differenceInDays(startDate, today) }
  }

  // ── 5. 予定なし ──────────────────────────────────────────────────────────
  return { kind: 'no_meeting' }
}
