'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, CalendarDays, MapPin, Film, Music, Book, Tv, Play, Clock } from 'lucide-react'
import Card from '@/components/ui/Card'
import { haptic } from '@/lib/haptics'

// ---- Types ----

const eventTypeConfig = {
  visit:       { bg: '#F3F0FF', text: '#6D5BD0', label: '会う日' },
  trip:        { bg: '#F0F7F0', text: '#4A7C59', label: '旅行' },
  online:      { bg: '#FFF7F0', text: '#C2782D', label: 'オンライン' },
  anniversary: { bg: '#FFF0F3', text: '#B5465A', label: '記念日' },
  personal:    { bg: '#F5F5F3', text: '#737373', label: '個人' },
}

const mediaTypeConfig = {
  movie: { icon: Film,  label: '映画',   color: '#6D5BD0', bg: '#F3F0FF' },
  tv:    { icon: Tv,    label: 'ドラマ', color: '#4A7C59', bg: '#F0F7F0' },
  anime: { icon: Play,  label: 'アニメ', color: '#C2782D', bg: '#FFF7F0' },
  music: { icon: Music, label: '音楽',   color: '#2D6B9E', bg: '#E8EFF6' },
  book:  { icon: Book,  label: '本',     color: '#737373', bg: '#F5F5F3' },
  other: { icon: Play,  label: 'その他', color: '#A3A3A3', bg: '#F5F5F3' },
}

interface EventResult {
  id: string
  title: string
  date: string
  type: keyof typeof eventTypeConfig
  memo?: string
}

interface PlaceResult {
  id: string
  name: string
  category: string
  location: string
  memo?: string
  is_visited: boolean
}

interface MediaResult {
  id: string
  title: string
  media_type: keyof typeof mediaTypeConfig
  memo?: string
  is_done: boolean
}

// ---- localStorage helpers ----

const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 8

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  try {
    const prev = getRecentSearches().filter(q => q !== query)
    localStorage.setItem(HISTORY_KEY, JSON.stringify([query, ...prev].slice(0, MAX_HISTORY)))
  } catch { }
}

function removeRecentSearch(query: string) {
  try {
    const next = getRecentSearches().filter(q => q !== query)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch { }
}

// ---- Highlight component ----

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ backgroundColor: '#F3F0FF', color: '#6D5BD0', borderRadius: '2px', padding: '0 1px' }}>{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

// ---- Mock data ----

const MOCK_EVENTS: EventResult[] = [
  { id: '1', title: '東京デート',       date: '2026-06-15', type: 'visit',       memo: '新宿で待ち合わせ' },
  { id: '2', title: '大阪旅行',         date: '2026-07-20', type: 'trip',        memo: 'たこ焼き食べたい' },
  { id: '3', title: '3周年記念日',      date: '2026-08-01', type: 'anniversary'  },
  { id: '4', title: 'オンラインデート', date: '2026-05-20', type: 'online'       },
]

const MOCK_PLACES: PlaceResult[] = [
  { id: '1', name: '新宿御苑',      category: '公園',   location: '東京',   memo: '春に桜を見よう！', is_visited: false },
  { id: '2', name: '横浜中華街',    category: 'グルメ', location: '神奈川', is_visited: false },
  { id: '3', name: '嵐山',          category: '観光',   location: '京都',   memo: '旅行で', is_visited: true },
  { id: '4', name: 'teamLab Planets', category: 'アート', location: '東京', is_visited: false },
]

const MOCK_MEDIA: MediaResult[] = [
  { id: '1', title: '君の名は。',              media_type: 'movie', memo: 'また一緒に観たい', is_done: true },
  { id: '2', title: 'スラムダンク',            media_type: 'anime', is_done: false },
  { id: '3', title: 'Taylor Swift - Eras Tour', media_type: 'music', is_done: false },
  { id: '4', title: '呪術廻戦',                media_type: 'tv',    is_done: false },
]

function searchMock(q: string) {
  const lower = q.toLowerCase()
  return {
    events: MOCK_EVENTS.filter(e =>
      e.title.toLowerCase().includes(lower) ||
      (e.memo ?? '').toLowerCase().includes(lower)
    ),
    places: MOCK_PLACES.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.category.toLowerCase().includes(lower) ||
      p.location.toLowerCase().includes(lower) ||
      (p.memo ?? '').toLowerCase().includes(lower)
    ),
    media: MOCK_MEDIA.filter(m =>
      m.title.toLowerCase().includes(lower) ||
      (m.memo ?? '').toLowerCase().includes(lower)
    ),
  }
}

// ---- Main page ----

export default function SearchPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<EventResult[]>([])
  const [places, setPlaces] = useState<PlaceResult[]>([])
  const [media, setMedia]   = useState<MediaResult[]>([])
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    setHistory(getRecentSearches())
  }, [])

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setEvents([]); setPlaces([]); setMedia([])
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // mock
      await new Promise(r => setTimeout(r, 150))
      const result = searchMock(trimmed)
      setEvents(result.events)
      setPlaces(result.places)
      setMedia(result.media)
      setLoading(false)
      return
    }

    try {
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
      const cId = userData.couple_id

      const ilike = `%${trimmed}%`

      const [evRes, plRes, mdRes] = await Promise.all([
        db.from('events')
          .select('id, title, event_date, event_type, memo')
          .eq('couple_id', cId)
          .or(`title.ilike.${ilike},memo.ilike.${ilike}`)
          .order('event_date', { ascending: true })
          .limit(20),
        db.from('places')
          .select('id, name, category, location, memo, is_visited')
          .eq('couple_id', cId)
          .or(`name.ilike.${ilike},location.ilike.${ilike},category.ilike.${ilike},memo.ilike.${ilike}`)
          .order('created_at', { ascending: false })
          .limit(20),
        db.from('media')
          .select('id, title, media_type, memo, is_done')
          .eq('couple_id', cId)
          .or(`title.ilike.${ilike},memo.ilike.${ilike}`)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      setEvents((evRes.data ?? []).map((e: { id: string; title: string; event_date: string; event_type: string; memo?: string }) => ({
        id: e.id, title: e.title, date: e.event_date,
        type: e.event_type as keyof typeof eventTypeConfig,
        memo: e.memo ?? undefined,
      })))
      setPlaces((plRes.data ?? []).map((p: { id: string; name: string; category: string; location: string; memo?: string; is_visited: boolean }) => ({
        id: p.id, name: p.name,
        category: p.category ?? 'その他',
        location: p.location ?? '',
        memo: p.memo ?? undefined,
        is_visited: p.is_visited,
      })))
      setMedia((mdRes.data ?? []).map((m: { id: string; title: string; media_type: string; memo?: string; is_done: boolean }) => ({
        id: m.id, title: m.title,
        media_type: m.media_type as keyof typeof mediaTypeConfig,
        memo: m.memo ?? undefined,
        is_done: m.is_done,
      })))
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(t)
  }, [query, doSearch])

  function handleHistoryTap(q: string) {
    haptic('light')
    setQuery(q)
    inputRef.current?.focus()
  }

  function handleDeleteHistory(q: string) {
    haptic('light')
    removeRecentSearch(q)
    setHistory(getRecentSearches())
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && query.trim()) {
      saveRecentSearch(query.trim())
      setHistory(getRecentSearches())
    }
  }

  function handleEventTap(event: EventResult) {
    haptic('light')
    saveRecentSearch(query.trim())
    setHistory(getRecentSearches())
    router.push(`/calendar?date=${event.date}`)
  }

  function handlePlaceTap() {
    haptic('light')
    saveRecentSearch(query.trim())
    setHistory(getRecentSearches())
    router.push('/list')
  }

  function handleMediaTap() {
    haptic('light')
    saveRecentSearch(query.trim())
    setHistory(getRecentSearches())
    router.push('/list?tab=media')
  }

  const totalResults = events.length + places.length + media.length
  const hasResults = totalResults > 0

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto pb-8">
      <h1 className="text-lg font-semibold mb-4" style={{ color: '#1A1A1A' }}>検索</h1>

      {/* Search input */}
      <div
        className="flex items-center gap-2 px-3 mb-5"
        style={{
          backgroundColor: '#F5F5F3',
          borderRadius: '12px',
          border: '0.5px solid #E5E5E5',
          height: '44px',
        }}
      >
        <Search size={17} style={{ color: '#A3A3A3', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="予定・場所・コンテンツを検索"
          style={{
            flex: 1,
            background: 'transparent',
            outline: 'none',
            border: 'none',
            fontSize: '15px',
            color: '#1A1A1A',
          }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {query && (
          <button onClick={() => setQuery('')} className="transition-opacity active:opacity-50">
            <X size={16} style={{ color: '#A3A3A3' }} />
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-10">
          <div
            className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: '#E5E5E5', borderTopColor: '#6D5BD0' }}
          />
        </div>
      )}

      {/* Empty state — no query */}
      {!loading && !query && (
        <>
          {history.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#A3A3A3' }}>最近の検索</p>
              <div className="space-y-1">
                {history.map(q => (
                  <div key={q} className="flex items-center gap-2 py-2">
                    <Clock size={15} style={{ color: '#A3A3A3', flexShrink: 0 }} />
                    <button
                      className="flex-1 text-left text-sm"
                      style={{ color: '#1A1A1A' }}
                      onClick={() => handleHistoryTap(q)}
                    >
                      {q}
                    </button>
                    <button
                      onClick={() => handleDeleteHistory(q)}
                      className="p-1 transition-opacity active:opacity-50"
                    >
                      <X size={14} style={{ color: '#A3A3A3' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {history.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-3">
              <Search size={32} style={{ color: '#E5E5E5' }} />
              <p className="text-sm" style={{ color: '#A3A3A3' }}>キーワードで検索してみよう</p>
            </div>
          )}
        </>
      )}

      {/* No results */}
      {!loading && searched && query && !hasResults && (
        <div className="flex flex-col items-center py-16 gap-3">
          <Search size={32} style={{ color: '#E5E5E5' }} />
          <p className="text-sm" style={{ color: '#A3A3A3' }}>「{query}」の検索結果はありません</p>
        </div>
      )}

      {/* Results */}
      {!loading && hasResults && (
        <div className="space-y-6">
          {/* Events section */}
          {events.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <CalendarDays size={14} style={{ color: '#6D5BD0' }} />
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: '#A3A3A3' }}>
                  予定 <span style={{ color: '#6D5BD0' }}>{events.length}</span>
                </p>
              </div>
              <div className="space-y-2">
                {events.map(event => {
                  const config = eventTypeConfig[event.type] ?? eventTypeConfig.personal
                  const [y, m, d] = event.date.split('-').map(Number)
                  const dateLabel = `${y}年${m}月${d}日`
                  return (
                    <Card key={event.id} padding="md">
                      <button className="w-full text-left" onClick={() => handleEventTap(event)}>
                        <div className="flex items-start gap-3">
                          <span
                            className="text-xs font-medium px-2 py-0.5 flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: config.bg, color: config.text, borderRadius: '6px' }}
                          >
                            {config.label}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
                              <Highlight text={event.title} query={query} />
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: '#A3A3A3' }}>{dateLabel}</p>
                            {event.memo && (
                              <p className="text-xs mt-1 truncate" style={{ color: '#737373' }}>
                                <Highlight text={event.memo} query={query} />
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          {/* Places section */}
          {places.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin size={14} style={{ color: '#4A7C59' }} />
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: '#A3A3A3' }}>
                  行きたい場所 <span style={{ color: '#4A7C59' }}>{places.length}</span>
                </p>
              </div>
              <div className="space-y-2">
                {places.map(place => (
                  <Card key={place.id} padding="md">
                    <button className="w-full text-left" onClick={handlePlaceTap}>
                      <div className="flex items-start gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: '#F0F7F0' }}
                        >
                          <MapPin size={14} style={{ color: '#4A7C59' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: place.is_visited ? '#A3A3A3' : '#1A1A1A' }}>
                            <Highlight text={place.name} query={query} />
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs px-1.5 py-0.5" style={{ backgroundColor: '#F5F5F3', color: '#737373', borderRadius: '5px' }}>
                              <Highlight text={place.category} query={query} />
                            </span>
                            {place.location && (
                              <span className="text-xs" style={{ color: '#A3A3A3' }}>
                                <Highlight text={place.location} query={query} />
                              </span>
                            )}
                          </div>
                          {place.memo && (
                            <p className="text-xs mt-1 truncate" style={{ color: '#737373' }}>
                              <Highlight text={place.memo} query={query} />
                            </p>
                          )}
                        </div>
                        {place.is_visited && (
                          <span className="text-xs flex-shrink-0" style={{ color: '#A3A3A3' }}>訪問済み</span>
                        )}
                      </div>
                    </button>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Media section */}
          {media.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <Film size={14} style={{ color: '#2D6B9E' }} />
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: '#A3A3A3' }}>
                  観たい・聴きたい <span style={{ color: '#2D6B9E' }}>{media.length}</span>
                </p>
              </div>
              <div className="space-y-2">
                {media.map(item => {
                  const config = mediaTypeConfig[item.media_type] ?? mediaTypeConfig.other
                  const Icon = config.icon
                  return (
                    <Card key={item.id} padding="md">
                      <button className="w-full text-left" onClick={handleMediaTap}>
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: item.is_done ? '#F5F5F3' : config.bg }}
                          >
                            <Icon size={14} style={{ color: item.is_done ? '#A3A3A3' : config.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: item.is_done ? '#A3A3A3' : '#1A1A1A' }}>
                              <Highlight text={item.title} query={query} />
                            </p>
                            <span
                              className="text-xs px-1.5 py-0.5 mt-0.5 inline-block"
                              style={{ backgroundColor: item.is_done ? '#F5F5F3' : config.bg, color: item.is_done ? '#A3A3A3' : config.color, borderRadius: '5px' }}
                            >
                              {config.label}
                            </span>
                            {item.memo && (
                              <p className="text-xs mt-1 truncate" style={{ color: '#737373' }}>
                                <Highlight text={item.memo} query={query} />
                              </p>
                            )}
                          </div>
                          {item.is_done && (
                            <span className="text-xs flex-shrink-0" style={{ color: '#A3A3A3' }}>完了</span>
                          )}
                        </div>
                      </button>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
