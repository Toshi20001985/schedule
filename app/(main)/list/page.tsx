'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Play, Check, Plus, Film, Music, Book, Tv, Trash2, Pencil, Star, ChevronDown, X } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import BottomSheet from '@/components/BottomSheet'
import { haptic } from '@/lib/haptics'
import { PullToRefresh } from '@/components/PullToRefresh'
import { SwipeableListItem } from '@/components/SwipeableListItem'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useCollection } from '@/hooks/useCollection'
import { useToast } from '@/components/ToastProvider'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { PageTransition } from '@/components/PageTransition'

// Leaflet は SSR 不可のため動的ロード
const PlacesMapDynamic = dynamic(() => import('@/components/PlacesMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F3' }}>
      <span style={{ color: '#A3A3A3', fontSize: '13px' }}>地図を読み込み中...</span>
    </div>
  ),
})

type Owner = 'me' | 'partner' | 'both'

interface Place {
  id: string
  name: string
  category: string
  location: string
  memo?: string
  is_visited: boolean
  owner: Owner
  latitude?: number
  longitude?: number
}

interface MediaItem {
  id: string
  title: string
  media_type: 'movie' | 'tv' | 'anime' | 'music' | 'book' | 'other'
  memo?: string
  is_done: boolean
  owner: Owner
}

interface Todo {
  id: string
  title: string
  category: string
  memo?: string
  is_done: boolean
  owner: Owner
}

const mediaTypeConfig = {
  movie: { icon: Film,  label: '映画',   color: '#6D5BD0', bg: '#F3F0FF' },
  tv:    { icon: Tv,    label: 'ドラマ', color: '#4A7C59', bg: '#F0F7F0' },
  anime: { icon: Play,  label: 'アニメ', color: '#C2782D', bg: '#FFF7F0' },
  music: { icon: Music, label: '音楽',   color: '#2D6B9E', bg: '#E8EFF6' },
  book:  { icon: Book,  label: '本',     color: '#737373', bg: '#F5F5F3' },
  other: { icon: Play,  label: 'その他', color: '#A3A3A3', bg: '#F5F5F3' },
}

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

/** Realtime payload の places レコードを Place にマップ */
function toPlace(r: Record<string, unknown>): Place {
  return {
    id:         r.id         as string,
    name:       r.name       as string,
    category:  (r.category   as string | null) ?? 'その他',
    location:  (r.location   as string | null) ?? '',
    memo:      (r.memo       as string | null) ?? undefined,
    is_visited: r.is_visited as boolean,
    owner:     (r.owner      as Owner) ?? 'me',
    latitude:  (r.latitude   as number | null) ?? undefined,
    longitude: (r.longitude  as number | null) ?? undefined,
  }
}

/** Realtime payload の todos レコードを Todo にマップ */
function toTodo(r: Record<string, unknown>): Todo {
  return {
    id:       r.id       as string,
    title:    r.title    as string,
    category:(r.category as string | null) ?? '',
    memo:    (r.memo     as string | null) ?? undefined,
    is_done:  r.is_done  as boolean,
    owner:   (r.owner    as Owner) ?? 'both',
  }
}

/** Realtime payload の media レコードを MediaItem にマップ */
function toMedia(r: Record<string, unknown>): MediaItem {
  return {
    id:         r.id         as string,
    title:      r.title      as string,
    media_type: r.media_type as MediaItem['media_type'],
    memo:      (r.memo       as string | null) ?? undefined,
    is_done:    r.is_done    as boolean,
    owner:     (r.owner      as Owner) ?? 'me',
  }
}

// Module-level demo cache — persists across component remounts so deletions survive tab navigation
let _demoPlaces: Place[] | null = null
let _demoMedia: MediaItem[] | null = null
let _demoTodos: Todo[] | null = null

function ListPageInner() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'places' | 'media' | 'todos'>(
    searchParams.get('tab') === 'media'  ? 'media'  :
    searchParams.get('tab') === 'todos'  ? 'todos'  : 'places'
  )

  const [myId, setMyId] = useState<string | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [myName, setMyName] = useState('わたし')
  const [partnerName, setPartnerName] = useState('パートナー')

  // ── コレクション（CRUD ロジックをフックに集約） ──────────────────
  const {
    items: places, setItems: setPlaces,
    addItem: addPlaceItem, updateItem: updatePlaceItem, deleteItem: deletePlaceItem,
  } = useCollection<Place>('places', coupleId, myId)

  const {
    items: media, setItems: setMedia,
    addItem: addMediaItem, updateItem: updateMediaItem, deleteItem: deleteMediaItem,
  } = useCollection<MediaItem>('media', coupleId, myId)

  const {
    items: todos, setItems: setTodos,
    addItem: addTodoItem, updateItem: updateTodoItem, deleteItem: deleteTodoItem,
  } = useCollection<Todo>('todos', coupleId, myId)

  const [showSheet, setShowSheet] = useState(false)
  const [editingPlace, setEditingPlace] = useState<Place | null>(null)
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null)
  const [editingTodo,  setEditingTodo]  = useState<Todo | null>(null)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newMediaTitle, setNewMediaTitle] = useState('')
  const [newMediaType, setNewMediaType] = useState<MediaItem['media_type']>('movie')
  const [newTodoTitle,    setNewTodoTitle]    = useState('')
  const [newTodoCategory, setNewTodoCategory] = useState('')
  const [newMemo, setNewMemo] = useState('')
  const [newOwner, setNewOwner] = useState<Owner>('both')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [geocoding,     setGeocoding]     = useState(false)
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'success'>('idle')
  const [confirmingPlace, setConfirmingPlace] = useState<{
    id: string; name: string; lat: number; lon: number; displayName: string
  } | null>(null)
  const [manualCoords, setManualCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapPickerCoords, setMapPickerCoords] = useState<{ lat: number; lon: number } | null>(null)
  const { showToast } = useToast()

  type GroupBy = 'none' | 'category' | 'addedBy'
  const [groupBy, setGroupBy] = useState<GroupBy>(() => {
    try {
      const s = localStorage.getItem('listGroupBy')
      if (s === 'category' || s === 'addedBy') return s
    } catch {}
    return 'none'
  })
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // owner ラベルを名前から生成
  const ownerOptions: { value: Owner; label: string; bg: string; color: string }[] = [
    { value: 'me',      label: myName,      bg: '#EEECF9', color: '#6D5BD0' },
    { value: 'partner', label: partnerName, bg: '#E8EFF6', color: '#2D6B9E' },
    { value: 'both',    label: 'ふたり',    bg: '#F5F5F3', color: '#737373' },
  ]

  function ownerLabel(owner: Owner) {
    if (owner === 'me')      return myName
    if (owner === 'partner') return partnerName
    return 'ふたり'
  }

  function toggleCollapsed(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function computeGroups<T extends { owner: Owner }>(
    items: T[],
    getCategoryKey: (item: T) => string,
  ): Array<{ key: string; label: string; items: T[] }> {
    const map = new Map<string, T[]>()
    for (const item of items) {
      const key = groupBy === 'category' ? getCategoryKey(item) : item.owner
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    let entries = Array.from(map.entries())
    if (groupBy === 'addedBy') {
      const ownerOrder: Record<string, number> = { me: 0, partner: 1, both: 2 }
      entries.sort((a, b) => (ownerOrder[a[0]] ?? 99) - (ownerOrder[b[0]] ?? 99))
    }
    return entries.map(([key, grpItems]) => ({
      key,
      label: groupBy === 'addedBy' ? ownerLabel(key as Owner) : key,
      items: grpItems,
    }))
  }

  const load = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      if (_demoPlaces === null) {
        _demoPlaces = [
          { id: '1', name: '新宿御苑',      category: '公園',   location: '東京',   memo: '春に桜を見よう！', is_visited: false, owner: 'both' },
          { id: '2', name: '横浜中華街',    category: 'グルメ', location: '神奈川', is_visited: false, owner: 'me' },
          { id: '3', name: '嵐山',          category: '観光',   location: '京都',   memo: '旅行で', is_visited: true, owner: 'both' },
          { id: '4', name: 'teamLab Planets', category: 'アート', location: '東京', is_visited: false, owner: 'partner' },
        ]
        _demoMedia = [
          { id: '1', title: '君の名は。',              media_type: 'movie', memo: 'また一緒に観たい', is_done: true,  owner: 'both' },
          { id: '2', title: 'スラムダンク',            media_type: 'anime', is_done: false, owner: 'partner' },
          { id: '3', title: 'Taylor Swift - Eras Tour', media_type: 'music', is_done: false, owner: 'me' },
          { id: '4', title: '呪術廻戦',                media_type: 'tv',    is_done: false, owner: 'both' },
        ]
        _demoTodos = [
          { id: '1', title: '富士山に登る',     category: 'アウトドア', is_done: false, owner: 'both' },
          { id: '2', title: '花火大会に行く',   category: 'イベント',   is_done: false, owner: 'both' },
          { id: '3', title: '手料理をふるまう', category: 'グルメ',     memo: '得意料理を作りたい', is_done: true, owner: 'me' },
        ]
      }
      setPlaces(_demoPlaces)
      setMedia(_demoMedia!)
      setTodos(_demoTodos!)
      return
    }

    const { createClient } = await import('@/lib/supabase/client')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any
    const { data: { user } } = await db.auth.getUser()
    if (!user) return
    setMyId(user.id)

    // 自分とパートナーの名前を取得
    const { data: userData } = await db
      .from('users')
      .select('display_name, couple_id')
      .eq('id', user.id)
      .single()
    if (!userData) return
    if (userData.display_name) setMyName(userData.display_name)
    if (!userData.couple_id) return
    setCoupleId(userData.couple_id)
    const cId = userData.couple_id

    const { data: coupleData } = await db
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', cId)
      .single()
    if (coupleData) {
      const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
      if (partnerId) {
        const { data: partnerData } = await db
          .from('users')
          .select('display_name')
          .eq('id', partnerId)
          .single()
        if (partnerData?.display_name) setPartnerName(partnerData.display_name)
      }
    }

    const [placesResult, { data: mediaData }, { data: todosData }] = await Promise.all([
      db.from('places')
        .select('id, name, category, location, memo, is_visited, owner, latitude, longitude')
        .eq('couple_id', cId)
        .order('created_at', { ascending: false }),
      db.from('media')
        .select('id, title, media_type, memo, is_done, owner')
        .eq('couple_id', cId)
        .order('created_at', { ascending: false }),
      db.from('todos')
        .select('id, title, category, memo, is_done, owner')
        .eq('couple_id', cId)
        .order('created_at', { ascending: false }),
    ])

    // latitude/longitude カラムが DB 未追加の場合はフォールバック
    let placesData = placesResult.data
    if (placesResult.error && !placesData) {
      const fallback = await db.from('places')
        .select('id, name, category, location, memo, is_visited, owner')
        .eq('couple_id', cId)
        .order('created_at', { ascending: false })
      placesData = fallback.data
    }

    if (placesData) {
      setPlaces(placesData.map((p: {
        id: string; name: string; category: string; location: string
        memo?: string; is_visited: boolean; owner?: Owner
        latitude?: number | null; longitude?: number | null
      }) => ({
        id: p.id, name: p.name,
        category: p.category ?? 'その他',
        location: p.location ?? '',
        memo: p.memo ?? undefined,
        is_visited: p.is_visited,
        owner: (p.owner as Owner) ?? 'me',
        latitude:  p.latitude  ?? undefined,
        longitude: p.longitude ?? undefined,
      })))
    }
    if (mediaData) {
      setMedia(mediaData.map((m: {
        id: string; title: string; media_type: MediaItem['media_type']
        memo?: string; is_done: boolean; owner?: Owner
      }) => ({
        id: m.id, title: m.title,
        media_type: m.media_type,
        memo: m.memo ?? undefined,
        is_done: m.is_done,
        owner: (m.owner as Owner) ?? 'me',
      })))
    }
    if (todosData) {
      setTodos(todosData.map((t: {
        id: string; title: string; category?: string
        memo?: string; is_done: boolean; owner?: Owner
      }) => ({
        id: t.id, title: t.title,
        category: t.category ?? '',
        memo: t.memo ?? undefined,
        is_done: t.is_done,
        owner: (t.owner as Owner) ?? 'both',
      })))
    }
  }, [setPlaces, setMedia, setTodos])

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

  // グループ設定を localStorage に永続化
  useEffect(() => {
    try { localStorage.setItem('listGroupBy', groupBy) } catch {}
  }, [groupBy])

  // タブ切り替え時に折りたたみ状態をリセット
  useEffect(() => {
    setCollapsed(new Set())
  }, [tab])

  // デモモード: 状態変化をモジュールキャッシュに同期（リマウント時に削除が復活しないよう）
  // 注意: places=[] は useState の初期値として発火するケースがある（React Strict Mode の
  // 二重 effect 実行など）。その場合にキャッシュを空で上書きしないよう、
  // 「places に実データがある」か「キャッシュがすでに空（ユーザーが全削除済み）」の場合のみ同期する。
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL && _demoPlaces !== null) {
      if (places.length > 0 || _demoPlaces.length === 0) {
        _demoPlaces = places
      }
    }
  }, [places])
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL && _demoMedia !== null) {
      if (media.length > 0 || _demoMedia.length === 0) {
        _demoMedia = media
      }
    }
  }, [media])
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL && _demoTodos !== null) {
      if (todos.length > 0 || _demoTodos.length === 0) {
        _demoTodos = todos
      }
    }
  }, [todos])

  // Realtime 購読 — places
  useRealtimeSync({
    table: 'places',
    coupleId,
    myId,
    onInsert: (rec, isPartner) => {
      const p = toPlace(rec)
      setPlaces(prev => prev.some(x => x.id === p.id) ? prev : [p, ...prev])
      if (isPartner) {
        haptic('light')
        setHighlightedId(p.id)
        showToast(`「${p.name}」が追加されました`)
      }
    },
    onUpdate: (rec, isPartner) => {
      const p = toPlace(rec)
      setPlaces(prev => prev.map(x => x.id === p.id ? p : x))
      if (isPartner) haptic('light')
    },
    onDelete: (id) => setPlaces(prev => prev.filter(x => x.id !== id)),
  })

  // Realtime 購読 — todos
  useRealtimeSync({
    table: 'todos',
    coupleId,
    myId,
    onInsert: (rec, isPartner) => {
      const t = toTodo(rec)
      setTodos(prev => prev.some(x => x.id === t.id) ? prev : [t, ...prev])
      if (isPartner) {
        haptic('light')
        setHighlightedId(t.id)
        showToast(`「${t.title}」が追加されました`)
      }
    },
    onUpdate: (rec, isPartner) => {
      const t = toTodo(rec)
      setTodos(prev => prev.map(x => x.id === t.id ? t : x))
      if (isPartner) haptic('light')
    },
    onDelete: (id) => setTodos(prev => prev.filter(x => x.id !== id)),
  })

  // Realtime 購読 — media
  useRealtimeSync({
    table: 'media',
    coupleId,
    myId,
    onInsert: (rec, isPartner) => {
      const m = toMedia(rec)
      setMedia(prev => prev.some(x => x.id === m.id) ? prev : [m, ...prev])
      if (isPartner) {
        haptic('light')
        setHighlightedId(m.id)
        showToast(`「${m.title}」が追加されました`)
      }
    },
    onUpdate: (rec, isPartner) => {
      const m = toMedia(rec)
      setMedia(prev => prev.map(x => x.id === m.id ? m : x))
      if (isPartner) haptic('light')
    },
    onDelete: (id) => setMedia(prev => prev.filter(x => x.id !== id)),
  })

  const activePlaces  = places.filter(p => !p.is_visited)
  const visitedPlaces = places.filter(p => p.is_visited)

  // ── トグル ────────────────────────────────────────────────────────
  async function togglePlaceVisited(id: string) {
    haptic('light')
    const place = places.find(p => p.id === id)
    if (!place) return
    await updatePlaceItem(id, { is_visited: !place.is_visited })
  }

  async function toggleMediaDone(id: string) {
    haptic('light')
    const item = media.find(m => m.id === id)
    if (!item) return
    await updateMediaItem(id, { is_done: !item.is_done })
  }

  async function toggleTodoDone(id: string) {
    haptic('light')
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    await updateTodoItem(id, { is_done: !todo.is_done })
  }

  // ── 削除 ────────────────────────────────────────────────────────
  async function deletePlace(id: string) {
    haptic('warning')
    await deletePlaceItem(id)
  }

  async function deleteTodo(id: string) {
    haptic('warning')
    await deleteTodoItem(id)
  }

  async function deleteMedia(id: string) {
    haptic('warning')
    await deleteMediaItem(id)
  }

  // ── フォームリセット・編集開始 ──────────────────────────────────
  function resetForm() {
    setNewName(''); setNewCategory(''); setNewLocation('')
    setNewMediaTitle(''); setNewMemo(''); setNewOwner('both')
    setNewMediaType('movie')
    setNewTodoTitle(''); setNewTodoCategory('')
    setEditingPlace(null); setEditingMedia(null); setEditingTodo(null)
    setManualCoords(null)
  }

  function openEditPlace(place: Place) {
    setEditingPlace(place)
    setNewName(place.name)
    setNewCategory(place.category)
    setNewLocation(place.location)
    setNewMemo(place.memo ?? '')
    setNewOwner(place.owner)
    setTab('places')
    setShowSheet(true)
  }

  function openEditTodo(todo: Todo) {
    setEditingTodo(todo)
    setNewTodoTitle(todo.title)
    setNewTodoCategory(todo.category)
    setNewMemo(todo.memo ?? '')
    setNewOwner(todo.owner)
    setTab('todos')
    setShowSheet(true)
  }

  function openEditMedia(item: MediaItem) {
    setEditingMedia(item)
    setNewMediaTitle(item.title)
    setNewMediaType(item.media_type)
    setNewMemo(item.memo ?? '')
    setNewOwner(item.owner)
    setTab('media')
    setShowSheet(true)
  }

  // ── 追加ハンドラ ─────────────────────────────────────────────────
  async function handleAddPlace() {
    if (!newName) return
    // geocoding state で追加完了まで全体をガード（ボタン二重タップ防止）
    setGeocoding(true)
    try {
      // 手動指定があればそれを優先、なければ Nominatim でジオコーディング
      let coords: { lat: number; lon: number; displayName: string } | null = null
      if (manualCoords) {
        coords = { ...manualCoords, displayName: '手動で指定した位置' }
      } else {
        const { geocode } = await import('@/lib/geocoding')
        const query = [newName, newLocation].filter(Boolean).join(' ')
        coords = await geocode(query)
      }

      const tempName = newName  // resetForm() 前に名前を退避
      const localTempId = Date.now().toString()
      const newId = await addPlaceItem(
        { name: newName, category: newCategory || 'その他', location: newLocation, memo: newMemo || null, is_visited: false, owner: newOwner, latitude: coords?.lat ?? null, longitude: coords?.lon ?? null },
        { id: localTempId, name: newName, category: newCategory || 'その他', location: newLocation, memo: newMemo || undefined, is_visited: false, owner: newOwner, latitude: coords?.lat, longitude: coords?.lon },
      )
      haptic('success')
      resetForm(); setShowSheet(false)

      // newId が localTempId と同じ = Supabase insert 失敗のフォールバック
      // その場合は確認モーダルを表示しない（"保存できませんでした" トーストが既に出ている）
      const insertSucceeded = newId !== localTempId
      if (coords && insertSucceeded) {
        // 位置確認モーダルを表示
        setConfirmingPlace({ id: newId, name: tempName, lat: coords.lat, lon: coords.lon, displayName: coords.displayName })
      } else if (!coords) {
        showToast(`「${tempName}」を追加しました（地図の座標を取得できませんでした）`)
      }
    } catch {
      showToast('保存に失敗しました')
    } finally {
      setGeocoding(false)
    }
  }

  async function handleAddTodo() {
    if (!newTodoTitle) return
    setSubmitState('saving')
    await addTodoItem(
      { title: newTodoTitle, category: newTodoCategory || '', memo: newMemo || null, is_done: false, owner: newOwner },
      { id: Date.now().toString(), title: newTodoTitle, category: newTodoCategory || '', memo: newMemo || undefined, is_done: false, owner: newOwner },
    )
    haptic('success')
    setSubmitState('success')
    await new Promise(r => setTimeout(r, 700))
    resetForm(); setShowSheet(false); setSubmitState('idle')
  }

  async function handleAddMedia() {
    if (!newMediaTitle) return
    setSubmitState('saving')
    await addMediaItem(
      { title: newMediaTitle, media_type: newMediaType, memo: newMemo || null, is_done: false, owner: newOwner },
      { id: Date.now().toString(), title: newMediaTitle, media_type: newMediaType, memo: newMemo || undefined, is_done: false, owner: newOwner },
    )
    haptic('success')
    setSubmitState('success')
    await new Promise(r => setTimeout(r, 700))
    resetForm(); setShowSheet(false); setSubmitState('idle')
  }

  // ── 更新ハンドラ ─────────────────────────────────────────────────
  async function handleUpdatePlace() {
    if (!editingPlace || !newName) return
    setSubmitState('saving')
    await updatePlaceItem(editingPlace.id, {
      name: newName, category: newCategory || 'その他',
      location: newLocation, memo: newMemo || null, owner: newOwner,
    })
    haptic('success')
    setSubmitState('success')
    await new Promise(r => setTimeout(r, 700))
    resetForm(); setShowSheet(false); setSubmitState('idle')
  }

  async function handleUpdateTodo() {
    if (!editingTodo || !newTodoTitle) return
    setSubmitState('saving')
    await updateTodoItem(editingTodo.id, {
      title: newTodoTitle, category: newTodoCategory,
      memo: newMemo || null, owner: newOwner,
    })
    haptic('success')
    setSubmitState('success')
    await new Promise(r => setTimeout(r, 700))
    resetForm(); setShowSheet(false); setSubmitState('idle')
  }

  async function handleUpdateMedia() {
    if (!editingMedia || !newMediaTitle) return
    setSubmitState('saving')
    await updateMediaItem(editingMedia.id, {
      title: newMediaTitle, media_type: newMediaType,
      memo: newMemo || null, owner: newOwner,
    })
    haptic('success')
    setSubmitState('success')
    await new Promise(r => setTimeout(r, 700))
    resetForm(); setShowSheet(false); setSubmitState('idle')
  }

  return (
    <>
    <PageTransition>
    <PullToRefresh onRefresh={load}>
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-lg font-semibold mb-5" style={{ color: '#1A1A1A' }}>リスト</h1>

      {/* Tab Switcher */}
      <div className="flex p-0.5 mb-5" style={{ backgroundColor: '#F5F5F3', borderRadius: '10px' }}>
        {[
          { key: 'places', icon: MapPin, label: '行きたい場所' },
          { key: 'media',  icon: Play,   label: '観たい・聴きたい' },
          { key: 'todos',  icon: Star,   label: 'やりたいこと' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => { haptic('selection'); setTab(key as 'places' | 'media' | 'todos') }}
            className="flex-1 flex items-center justify-center gap-1 py-2 font-medium transition-all"
            style={{
              fontSize: '11px',
              backgroundColor: tab === key ? '#FFFFFF' : 'transparent',
              color: tab === key ? '#1A1A1A' : '#737373',
              borderRadius: '8px',
              border: tab === key ? '0.5px solid #E5E5E5' : 'none',
            }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Group-by selector */}
      <div className="flex gap-1.5 mb-4">
        {([
          { key: 'none',     label: 'すべて' },
          { key: 'category', label: 'カテゴリ' },
          { key: 'addedBy',  label: '追加者' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { haptic('selection'); setGroupBy(key); setCollapsed(new Set()) }}
            className="text-xs px-3 py-1.5 font-medium transition-all active:opacity-60"
            style={{
              backgroundColor: groupBy === key ? '#1A1A1A' : '#F5F5F3',
              color: groupBy === key ? '#FFFFFF' : '#737373',
              borderRadius: '8px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Places Tab */}
      {tab === 'places' && (
        <div className="space-y-2.5">
          {/* 地図ページへのリンク */}
          <div className="flex justify-end">
            <Link href="/map" style={{ color: '#6D5BD0', fontSize: '12px' }}>
              地図で見る →
            </Link>
          </div>

          {groupBy === 'none' ? (
            <>
              <p className="text-xs px-1" style={{ color: '#A3A3A3' }}>未訪問 {activePlaces.length}件</p>
              {activePlaces.length === 0 && (
                <div className="flex flex-col items-center py-14 text-center gap-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-trip-soft), var(--color-visit-soft))' }}>
                    <MapPin size={26} strokeWidth={1.5} style={{ color: 'var(--color-foreground-secondary)' }} />
                  </div>
                  <div className="space-y-1.5">
                    <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--color-foreground)', fontSize: '18px', fontWeight: 400 }}>
                      ふたりの世界地図を作ろう
                    </p>
                    <p style={{ color: 'var(--color-foreground-tertiary)', fontSize: '13px', lineHeight: 1.6 }}>
                      行きたい場所を追加して、<br />ふたりだけのリストを育てよう
                    </p>
                  </div>
                  <button
                    onClick={() => { haptic('medium'); setShowSheet(true) }}
                    className="mt-2 px-5 py-2 rounded-full text-sm font-medium transition-opacity active:opacity-60"
                    style={{ backgroundColor: 'var(--color-foreground)', color: 'var(--color-background)' }}
                  >
                    最初の場所を追加
                  </button>
                </div>
              )}
              {activePlaces.map(place => (
                <SwipeableListItem key={place.id} onEdit={() => openEditPlace(place)} onDelete={() => deletePlace(place.id)}>
                <Card padding="md" style={{ boxShadow: place.id === highlightedId ? '0 0 0 2px #6D5BD0' : undefined }}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => togglePlaceVisited(place.id)} className="w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ borderColor: '#E5E5E5', borderWidth: '0.5px' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{place.name}</span>
                        <Tag label={ownerLabel(place.owner)} owner={place.owner} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-muted)', borderRadius: '100px' }}>{place.category}</span>
                        {place.location && <span className="text-xs inline-flex items-center gap-0.5 px-2 py-0.5" style={{ color: 'var(--color-foreground-quaternary)', backgroundColor: 'var(--color-surface)', borderRadius: '100px' }}><MapPin size={9} strokeWidth={1.5} /> {place.location}</span>}
                      </div>
                      {place.memo && <p className="text-xs mt-1.5" style={{ color: '#737373' }}>{place.memo}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEditPlace(place)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Pencil size={14} strokeWidth={1.5} /></button>
                      <button onClick={() => deletePlace(place.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Trash2 size={15} strokeWidth={1.5} /></button>
                    </div>
                  </div>
                </Card>
                </SwipeableListItem>
              ))}
              {visitedPlaces.length > 0 && (
                <>
                  <p className="text-xs px-1 mt-4" style={{ color: '#A3A3A3' }}>訪問済み {visitedPlaces.length}件</p>
                  {visitedPlaces.map(place => (
                    <SwipeableListItem key={place.id} onEdit={() => openEditPlace(place)} onDelete={() => deletePlace(place.id)}>
                    <Card padding="md" style={{ opacity: 0.5 }}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => togglePlaceVisited(place.id)} className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#F0F7F0' }}>
                          <Check size={12} strokeWidth={1.5} style={{ color: '#4A7C59' }} />
                        </button>
                        <span className="flex-1 text-sm line-through" style={{ color: '#737373' }}>{place.name}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openEditPlace(place)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Pencil size={14} strokeWidth={1.5} /></button>
                          <button onClick={() => deletePlace(place.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Trash2 size={15} strokeWidth={1.5} /></button>
                        </div>
                      </div>
                    </Card>
                    </SwipeableListItem>
                  ))}
                </>
              )}
            </>
          ) : places.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-trip-soft), var(--color-visit-soft))' }}>
                <MapPin size={22} strokeWidth={1.5} style={{ color: 'var(--color-foreground-secondary)' }} />
              </div>
              <p style={{ color: 'var(--color-foreground-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                ふたりで行きたい場所を<br />リストアップしよう
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {computeGroups(places, p => p.category || 'その他').map(group => (
                <section key={group.key}>
                  <button
                    className="w-full flex items-center justify-between px-1 mb-2 active:opacity-60 transition-opacity"
                    onClick={() => toggleCollapsed(group.key)}
                  >
                    <span className="text-xs font-medium uppercase" style={{ color: '#A3A3A3', letterSpacing: '0.08em' }}>{group.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: '#C5C5C5' }}>{group.items.length}</span>
                      <ChevronDown size={12} style={{ color: '#A3A3A3', transform: collapsed.has(group.key) ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </div>
                  </button>
                  {!collapsed.has(group.key) && (
                    <div className="space-y-2">
                      {group.items.map(place => (
                        <SwipeableListItem key={place.id} onEdit={() => openEditPlace(place)} onDelete={() => deletePlace(place.id)}>
                        <Card padding="md" style={{ opacity: place.is_visited ? 0.5 : 1, boxShadow: !place.is_visited && place.id === highlightedId ? '0 0 0 2px #6D5BD0' : undefined }}>
                          {place.is_visited ? (
                            <div className="flex items-center gap-3">
                              <button onClick={() => togglePlaceVisited(place.id)} className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#F0F7F0' }}>
                                <Check size={12} strokeWidth={1.5} style={{ color: '#4A7C59' }} />
                              </button>
                              <span className="flex-1 text-sm line-through" style={{ color: '#737373' }}>{place.name}</span>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => openEditPlace(place)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Pencil size={14} strokeWidth={1.5} /></button>
                                <button onClick={() => deletePlace(place.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Trash2 size={15} strokeWidth={1.5} /></button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <button onClick={() => togglePlaceVisited(place.id)} className="w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ borderColor: '#E5E5E5', borderWidth: '0.5px' }} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{place.name}</span>
                                  <Tag label={ownerLabel(place.owner)} owner={place.owner} />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs px-2 py-0.5" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-muted)', borderRadius: '100px' }}>{place.category}</span>
                                  {place.location && <span className="text-xs inline-flex items-center gap-0.5 px-2 py-0.5" style={{ color: 'var(--color-foreground-quaternary)', backgroundColor: 'var(--color-surface)', borderRadius: '100px' }}><MapPin size={9} strokeWidth={1.5} /> {place.location}</span>}
                                </div>
                                {place.memo && <p className="text-xs mt-1.5" style={{ color: '#737373' }}>{place.memo}</p>}
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => openEditPlace(place)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Pencil size={14} strokeWidth={1.5} /></button>
                                <button onClick={() => deletePlace(place.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Trash2 size={15} strokeWidth={1.5} /></button>
                              </div>
                            </div>
                          )}
                        </Card>
                        </SwipeableListItem>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Media Tab */}
      {tab === 'media' && (
        <div className="space-y-2.5">
          {groupBy === 'none' ? (
            <>
              <p className="text-xs px-1" style={{ color: '#A3A3A3' }}>未完了 {media.filter(m => !m.is_done).length}件</p>
              {media.filter(m => !m.is_done).length === 0 && (
                <div className="flex flex-col items-center py-14 text-center gap-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-online-soft), #FFF7F0)' }}>
                    <Play size={26} strokeWidth={1.5} style={{ color: 'var(--color-foreground-secondary)' }} />
                  </div>
                  <div className="space-y-1.5">
                    <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--color-foreground)', fontSize: '18px', fontWeight: 400 }}>
                      ふたりの鑑賞リスト
                    </p>
                    <p style={{ color: 'var(--color-foreground-tertiary)', fontSize: '13px', lineHeight: 1.6 }}>
                      一緒に観たい映画、聴きたい音楽を<br />貯めておこう
                    </p>
                  </div>
                  <button
                    onClick={() => { haptic('medium'); setShowSheet(true) }}
                    className="mt-2 px-5 py-2 rounded-full text-sm font-medium transition-opacity active:opacity-60"
                    style={{ backgroundColor: 'var(--color-foreground)', color: 'var(--color-background)' }}
                  >
                    最初のアイテムを追加
                  </button>
                </div>
              )}
              {media.filter(m => !m.is_done).map(item => {
                const config = mediaTypeConfig[item.media_type]
                const Icon = config.icon
                return (
                  <SwipeableListItem key={item.id} onEdit={() => openEditMedia(item)} onDelete={() => deleteMedia(item.id)}>
                  <Card padding="md" style={{ boxShadow: item.id === highlightedId ? '0 0 0 2px #6D5BD0' : undefined }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.bg }}>
                        <Icon size={15} strokeWidth={1.5} style={{ color: config.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{item.title}</span>
                          <Tag label={ownerLabel(item.owner)} owner={item.owner} />
                        </div>
                        <span className="text-xs px-2 py-0.5" style={{ backgroundColor: config.bg, color: config.color, borderRadius: '100px' }}>{config.label}</span>
                        {item.memo && <p className="text-xs mt-1" style={{ color: '#737373' }}>{item.memo}</p>}
                      </div>
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <button onClick={() => toggleMediaDone(item.id)} className="w-5 h-5 rounded border flex items-center justify-center" style={{ borderColor: '#E5E5E5', borderWidth: '0.5px' }} />
                        <div className="flex gap-0.5">
                          <button onClick={() => openEditMedia(item)} className="p-1 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Pencil size={13} /></button>
                          <button onClick={() => deleteMedia(item.id)} className="p-1 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  </Card>
                  </SwipeableListItem>
                )
              })}
              {media.filter(m => m.is_done).length > 0 && (
                <>
                  <p className="text-xs px-1 mt-4" style={{ color: '#A3A3A3' }}>完了 {media.filter(m => m.is_done).length}件</p>
                  {media.filter(m => m.is_done).map(item => {
                    const config = mediaTypeConfig[item.media_type]
                    const Icon = config.icon
                    return (
                      <SwipeableListItem key={item.id} onEdit={() => openEditMedia(item)} onDelete={() => deleteMedia(item.id)}>
                      <Card padding="md" style={{ opacity: 0.5 }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F5F5F3' }}>
                            <Icon size={15} strokeWidth={1.5} style={{ color: '#A3A3A3' }} />
                          </div>
                          <span className="flex-1 text-sm line-through" style={{ color: '#737373' }}>{item.title}</span>
                          <button onClick={() => toggleMediaDone(item.id)} className="p-1"><Check size={16} strokeWidth={1.5} style={{ color: '#4A7C59' }} /></button>
                          <button onClick={() => openEditMedia(item)} className="p-1 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Pencil size={13} strokeWidth={1.5} /></button>
                          <button onClick={() => deleteMedia(item.id)} className="p-1 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Trash2 size={15} strokeWidth={1.5} /></button>
                        </div>
                      </Card>
                      </SwipeableListItem>
                    )
                  })}
                </>
              )}
            </>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-online-soft), #FFF7F0)' }}>
                <Play size={22} strokeWidth={1.5} style={{ color: 'var(--color-foreground-secondary)' }} />
              </div>
              <p style={{ color: 'var(--color-foreground-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                一緒に観たい・聴きたいものを<br />貯めていこう
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {computeGroups(media, m => mediaTypeConfig[m.media_type].label).map(group => (
                <section key={group.key}>
                  <button
                    className="w-full flex items-center justify-between px-1 mb-2 active:opacity-60 transition-opacity"
                    onClick={() => toggleCollapsed(group.key)}
                  >
                    <span className="text-xs font-medium uppercase" style={{ color: '#A3A3A3', letterSpacing: '0.08em' }}>{group.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: '#C5C5C5' }}>{group.items.length}</span>
                      <ChevronDown size={12} style={{ color: '#A3A3A3', transform: collapsed.has(group.key) ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </div>
                  </button>
                  {!collapsed.has(group.key) && (
                    <div className="space-y-2">
                      {group.items.map(item => {
                        const config = mediaTypeConfig[item.media_type]
                        const Icon = config.icon
                        return (
                          <SwipeableListItem key={item.id} onEdit={() => openEditMedia(item)} onDelete={() => deleteMedia(item.id)}>
                          <Card padding="md" style={{ opacity: item.is_done ? 0.5 : 1, boxShadow: !item.is_done && item.id === highlightedId ? '0 0 0 2px #6D5BD0' : undefined }}>
                            {item.is_done ? (
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F5F5F3' }}>
                                  <Icon size={15} strokeWidth={1.5} style={{ color: '#A3A3A3' }} />
                                </div>
                                <span className="flex-1 text-sm line-through" style={{ color: '#737373' }}>{item.title}</span>
                                <button onClick={() => toggleMediaDone(item.id)} className="p-1"><Check size={16} strokeWidth={1.5} style={{ color: '#4A7C59' }} /></button>
                                <button onClick={() => openEditMedia(item)} className="p-1 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Pencil size={13} strokeWidth={1.5} /></button>
                                <button onClick={() => deleteMedia(item.id)} className="p-1 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Trash2 size={15} strokeWidth={1.5} /></button>
                              </div>
                            ) : (
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.bg }}>
                                  <Icon size={15} strokeWidth={1.5} style={{ color: config.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{item.title}</span>
                                    <Tag label={ownerLabel(item.owner)} owner={item.owner} />
                                  </div>
                                  <span className="text-xs px-2 py-0.5" style={{ backgroundColor: config.bg, color: config.color, borderRadius: '100px' }}>{config.label}</span>
                                  {item.memo && <p className="text-xs mt-1" style={{ color: '#737373' }}>{item.memo}</p>}
                                </div>
                                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                  <button onClick={() => toggleMediaDone(item.id)} className="w-5 h-5 rounded border flex items-center justify-center" style={{ borderColor: '#E5E5E5', borderWidth: '0.5px' }} />
                                  <div className="flex gap-0.5">
                                    <button onClick={() => openEditMedia(item)} className="p-1 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Pencil size={13} /></button>
                                    <button onClick={() => deleteMedia(item.id)} className="p-1 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Trash2 size={14} /></button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Card>
                          </SwipeableListItem>
                        )
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Todos Tab */}
      {tab === 'todos' && (
        <div className="space-y-2.5">
          {groupBy === 'none' ? (
            <>
              <p className="text-xs px-1" style={{ color: '#A3A3A3' }}>未完了 {todos.filter(t => !t.is_done).length}件</p>
              {todos.filter(t => !t.is_done).length === 0 && (
                <div className="flex flex-col items-center py-14 text-center gap-3">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF8EC, #FFF3D6)' }}>
                    <Star size={26} strokeWidth={1.5} style={{ color: 'var(--color-foreground-secondary)' }} />
                  </div>
                  <div className="space-y-1.5">
                    <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--color-foreground)', fontSize: '18px', fontWeight: 400 }}>
                      Bucket List
                    </p>
                    <p style={{ color: 'var(--color-foreground-tertiary)', fontSize: '13px', lineHeight: 1.6 }}>
                      ふたりでやりたいことを書き出して、<br />会う日に全部叶えよう
                    </p>
                  </div>
                  <button
                    onClick={() => { haptic('medium'); setShowSheet(true) }}
                    className="mt-2 px-5 py-2 rounded-full text-sm font-medium transition-opacity active:opacity-60"
                    style={{ backgroundColor: 'var(--color-foreground)', color: 'var(--color-background)' }}
                  >
                    最初のリストを追加
                  </button>
                </div>
              )}
              {todos.filter(t => !t.is_done).map(todo => (
                <SwipeableListItem key={todo.id} onEdit={() => openEditTodo(todo)} onDelete={() => deleteTodo(todo.id)}>
                <Card padding="md" style={{ boxShadow: todo.id === highlightedId ? '0 0 0 2px #B07D2C' : undefined }}>
                  <div className="flex items-start gap-3">
                    <motion.button
                      onClick={() => toggleTodoDone(todo.id)}
                      whileTap={{ scale: 0.80 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="w-5 h-5 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center"
                      style={{ border: '2px solid var(--color-border-strong)', backgroundColor: 'transparent' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{todo.title}</span>
                        <Tag label={ownerLabel(todo.owner)} owner={todo.owner} />
                      </div>
                      {todo.category && <span className="text-xs px-2 py-0.5" style={{ backgroundColor: '#FFF8EC', color: '#B07D2C', borderRadius: '100px' }}>{todo.category}</span>}
                      {todo.memo && <p className="text-xs mt-1.5" style={{ color: '#737373' }}>{todo.memo}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEditTodo(todo)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Pencil size={14} strokeWidth={1.5} /></button>
                      <button onClick={() => deleteTodo(todo.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Trash2 size={15} strokeWidth={1.5} /></button>
                    </div>
                  </div>
                </Card>
                </SwipeableListItem>
              ))}
              {todos.filter(t => t.is_done).length > 0 && (
                <>
                  <p className="text-xs px-1 mt-4" style={{ color: '#A3A3A3' }}>完了 {todos.filter(t => t.is_done).length}件</p>
                  {todos.filter(t => t.is_done).map(todo => (
                    <SwipeableListItem key={todo.id} onEdit={() => openEditTodo(todo)} onDelete={() => deleteTodo(todo.id)}>
                    <Card padding="md" style={{ opacity: 0.5 }}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleTodoDone(todo.id)} className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#FFF8EC' }}>
                          <Check size={12} strokeWidth={1.5} style={{ color: '#B07D2C' }} />
                        </button>
                        <span className="flex-1 text-sm line-through" style={{ color: '#737373' }}>{todo.title}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openEditTodo(todo)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Pencil size={14} strokeWidth={1.5} /></button>
                          <button onClick={() => deleteTodo(todo.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Trash2 size={15} strokeWidth={1.5} /></button>
                        </div>
                      </div>
                    </Card>
                    </SwipeableListItem>
                  ))}
                </>
              )}
            </>
          ) : todos.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF8EC, #FFF3D6)' }}>
                <Star size={22} strokeWidth={1.5} style={{ color: 'var(--color-foreground-secondary)' }} />
              </div>
              <p style={{ color: 'var(--color-foreground-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                ふたりでやりたいことを<br />書き出してみよう
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {computeGroups(todos, t => t.category || 'その他').map(group => (
                <section key={group.key}>
                  <button
                    className="w-full flex items-center justify-between px-1 mb-2 active:opacity-60 transition-opacity"
                    onClick={() => toggleCollapsed(group.key)}
                  >
                    <span className="text-xs font-medium uppercase" style={{ color: '#A3A3A3', letterSpacing: '0.08em' }}>{group.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: '#C5C5C5' }}>{group.items.length}</span>
                      <ChevronDown size={12} style={{ color: '#A3A3A3', transform: collapsed.has(group.key) ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </div>
                  </button>
                  {!collapsed.has(group.key) && (
                    <div className="space-y-2">
                      {group.items.map(todo => (
                        <SwipeableListItem key={todo.id} onEdit={() => openEditTodo(todo)} onDelete={() => deleteTodo(todo.id)}>
                        <Card padding="md" style={{ opacity: todo.is_done ? 0.5 : 1, boxShadow: !todo.is_done && todo.id === highlightedId ? '0 0 0 2px #B07D2C' : undefined }}>
                          {todo.is_done ? (
                            <div className="flex items-center gap-3">
                              <button onClick={() => toggleTodoDone(todo.id)} className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#FFF8EC' }}>
                                <Check size={12} strokeWidth={1.5} style={{ color: '#B07D2C' }} />
                              </button>
                              <span className="flex-1 text-sm line-through" style={{ color: '#737373' }}>{todo.title}</span>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => openEditTodo(todo)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Pencil size={14} strokeWidth={1.5} /></button>
                                <button onClick={() => deleteTodo(todo.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Trash2 size={15} strokeWidth={1.5} /></button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <motion.button
                                onClick={() => toggleTodoDone(todo.id)}
                                whileTap={{ scale: 0.80 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                className="w-5 h-5 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center"
                                style={{ border: '2px solid var(--color-border-strong)', backgroundColor: 'transparent' }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{todo.title}</span>
                                  <Tag label={ownerLabel(todo.owner)} owner={todo.owner} />
                                </div>
                                {todo.category && <span className="text-xs px-2 py-0.5" style={{ backgroundColor: '#FFF8EC', color: '#B07D2C', borderRadius: '100px' }}>{todo.category}</span>}
                                {todo.memo && <p className="text-xs mt-1.5" style={{ color: '#737373' }}>{todo.memo}</p>}
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => openEditTodo(todo)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Pencil size={14} strokeWidth={1.5} /></button>
                                <button onClick={() => deleteTodo(todo.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Trash2 size={15} strokeWidth={1.5} /></button>
                              </div>
                            </div>
                          )}
                        </Card>
                        </SwipeableListItem>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Sheet */}
      <BottomSheet
        open={showSheet}
        onClose={() => { setShowSheet(false); resetForm(); setSubmitState('idle') }}
        title={
          tab === 'places' ? (editingPlace ? '場所を編集'         : '場所を追加') :
          tab === 'media'  ? (editingMedia ? 'アイテムを編集'     : 'アイテムを追加') :
                             (editingTodo  ? 'やりたいことを編集' : 'やりたいことを追加')
        }
      >
        {tab === 'todos' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>やりたいこと</label>
              <input type="text" value={newTodoTitle} onChange={e => setNewTodoTitle(e.target.value)} style={inputStyle} placeholder="例：富士山に登る" />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>カテゴリ（任意）</label>
              <input type="text" value={newTodoCategory} onChange={e => setNewTodoCategory(e.target.value)} style={inputStyle} placeholder="例：アウトドア" />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>追加者</label>
              <div className="flex gap-2">
                {ownerOptions.map(o => (
                  <button key={o.value} onClick={() => setNewOwner(o.value)}
                    className="flex-1 py-2 text-sm font-medium transition-opacity"
                    style={{ backgroundColor: newOwner === o.value ? o.bg : '#F5F5F3', color: newOwner === o.value ? o.color : '#737373', borderRadius: '8px', border: `0.5px solid ${newOwner === o.value ? o.color : '#E5E5E5'}` }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>メモ（任意）</label>
              <textarea value={newMemo} onChange={e => setNewMemo(e.target.value)} style={{ ...inputStyle, resize: 'none' }} rows={2} placeholder="メモ..." />
            </div>
            {editingTodo
              ? <Button fullWidth onClick={handleUpdateTodo} disabled={!newTodoTitle} loading={submitState === 'saving'} success={submitState === 'success'}>更新する</Button>
              : <Button fullWidth onClick={handleAddTodo}    disabled={!newTodoTitle} loading={submitState === 'saving'} success={submitState === 'success'}>追加する</Button>
            }
          </div>
        ) : tab === 'places' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>場所の名前</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle} placeholder="例：新宿御苑" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>カテゴリ</label>
                <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} style={inputStyle} placeholder="例：グルメ" />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>場所</label>
                <input type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)} style={inputStyle} placeholder="例：東京" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>追加者</label>
              <div className="flex gap-2">
                {ownerOptions.map(o => (
                  <button key={o.value} onClick={() => setNewOwner(o.value)}
                    className="flex-1 py-2 text-sm font-medium transition-opacity"
                    style={{ backgroundColor: newOwner === o.value ? o.bg : '#F5F5F3', color: newOwner === o.value ? o.color : '#737373', borderRadius: '8px', border: `0.5px solid ${newOwner === o.value ? o.color : '#E5E5E5'}` }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>メモ（任意）</label>
              <textarea value={newMemo} onChange={e => setNewMemo(e.target.value)} style={{ ...inputStyle, resize: 'none' }} rows={2} placeholder="メモ..." />
            </div>
            {/* 手動位置指定 */}
            {!editingPlace && (
              <div>
                {manualCoords ? (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: '#F0F7F0', border: '0.5px solid #4A7C59' }}>
                    <span style={{ fontSize: '12px', color: '#4A7C59' }}>
                      📍 手動位置指定済み ({manualCoords.lat.toFixed(4)}, {manualCoords.lon.toFixed(4)})
                    </span>
                    <button onClick={() => setManualCoords(null)} style={{ color: '#737373', padding: '2px' }}>
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setMapPickerCoords(null); setShowMapPicker(true) }}
                    className="w-full py-2 text-sm transition-opacity active:opacity-60"
                    style={{ backgroundColor: '#F5F5F3', color: '#737373', borderRadius: '10px', border: '0.5px solid #E5E5E5' }}
                  >
                    地図で位置を指定（任意）
                  </button>
                )}
              </div>
            )}
            {editingPlace
              ? <Button fullWidth onClick={handleUpdatePlace} disabled={!newName} loading={submitState === 'saving'} success={submitState === 'success'}>更新する</Button>
              : <Button fullWidth onClick={handleAddPlace}    disabled={!newName || geocoding} loading={geocoding}>追加する</Button>
            }
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>タイトル</label>
              <input type="text" value={newMediaTitle} onChange={e => setNewMediaTitle(e.target.value)} style={inputStyle} placeholder="例：君の名は。" />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>種類</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(mediaTypeConfig).map(([type, config]) => {
                  const Icon = config.icon
                  return (
                    <button key={type} onClick={() => setNewMediaType(type as MediaItem['media_type'])}
                      className="py-2 px-2 text-xs font-medium flex items-center justify-center gap-1 transition-opacity"
                      style={{ backgroundColor: newMediaType === type ? config.bg : '#F5F5F3', color: newMediaType === type ? config.color : '#737373', borderRadius: '8px', border: `0.5px solid ${newMediaType === type ? config.color : '#E5E5E5'}` }}>
                      <Icon size={12} /> {config.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>追加者</label>
              <div className="flex gap-2">
                {ownerOptions.map(o => (
                  <button key={o.value} onClick={() => setNewOwner(o.value)}
                    className="flex-1 py-2 text-sm font-medium transition-opacity"
                    style={{ backgroundColor: newOwner === o.value ? o.bg : '#F5F5F3', color: newOwner === o.value ? o.color : '#737373', borderRadius: '8px', border: `0.5px solid ${newOwner === o.value ? o.color : '#E5E5E5'}` }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#A3A3A3' }}>メモ（任意）</label>
              <textarea value={newMemo} onChange={e => setNewMemo(e.target.value)} style={{ ...inputStyle, resize: 'none' }} rows={2} />
            </div>
            {editingMedia
              ? <Button fullWidth onClick={handleUpdateMedia} disabled={!newMediaTitle} loading={submitState === 'saving'} success={submitState === 'success'}>更新する</Button>
              : <Button fullWidth onClick={handleAddMedia}    disabled={!newMediaTitle} loading={submitState === 'saving'} success={submitState === 'success'}>追加する</Button>
            }
          </div>
        )}
      </BottomSheet>
    </div>
    </PullToRefresh>
    </PageTransition>

    {/* FAB — PageTransition外に配置して opacity アニメーションの影響を受けないようにする */}
    <motion.button
      data-testid="fab-add"
      onClick={() => { haptic('medium'); setShowSheet(true) }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="fixed right-4 z-30 flex items-center gap-2 px-5 py-3 active:opacity-70"
      style={{ bottom: `calc(env(safe-area-inset-bottom) + 76px)`, backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: '10px' }}
    >
      <Plus size={18} strokeWidth={2} />
      <span className="text-sm font-medium">追加</span>
    </motion.button>

    {/* 位置確認モーダル — 場所追加直後に表示 */}
    <BottomSheet
      open={!!confirmingPlace}
      onClose={() => setConfirmingPlace(null)}
      title="この場所で合っていますか？"
    >
      {confirmingPlace && (
        <div className="space-y-4">
          <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: '#F5F5F3' }}>
            <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{confirmingPlace.name}</p>
            <p className="text-xs mt-1" style={{ color: '#737373' }}>📍 {confirmingPlace.displayName}</p>
          </div>
          {/* ミニマップ */}
          <div style={{ height: '200px', borderRadius: '12px', overflow: 'hidden' }}>
            <PlacesMapDynamic
              places={[{
                id: confirmingPlace.id,
                name: confirmingPlace.name,
                category: '',
                is_visited: false,
                latitude: confirmingPlace.lat,
                longitude: confirmingPlace.lon,
              }]}
              height="100%"
              zoom={10}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmingPlace(null)}
              className="flex-1 py-3 text-sm font-medium transition-opacity active:opacity-70"
              style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: '10px' }}
            >
              この場所で OK
            </button>
            <button
              onClick={() => {
                updatePlaceItem(confirmingPlace.id, { latitude: null, longitude: null })
                setConfirmingPlace(null)
                showToast('座標をクリアしました。設定画面から再取得できます')
              }}
              className="py-3 px-4 text-sm font-medium transition-opacity active:opacity-70"
              style={{ backgroundColor: '#F5F5F3', color: '#737373', borderRadius: '10px' }}
            >
              違う
            </button>
          </div>
        </div>
      )}
    </BottomSheet>

    {/* 手動マップピッカー — position: fixed で PageTransition 外に配置 */}
    {showMapPicker && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#000',
      }}>
        {/* ヘッダー */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `calc(env(safe-area-inset-top) + 12px) 16px 12px`,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
        }}>
          <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 500 }}>
            {mapPickerCoords ? '位置を確認してください' : '場所をタップして位置を指定'}
          </span>
          <button onClick={() => setShowMapPicker(false)} style={{ color: '#FFFFFF', padding: '4px' }}>
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        {/* 地図 */}
        <div style={{ flex: 1 }}>
          <PlacesMapDynamic
            places={mapPickerCoords ? [{
              id: 'picker',
              name: '選択した位置',
              category: '',
              is_visited: false,
              latitude: mapPickerCoords.lat,
              longitude: mapPickerCoords.lon,
            }] : []}
            height="100%"
            zoom={mapPickerCoords ? 12 : 5}
            editable
            onMapClick={(lat, lon) => setMapPickerCoords({ lat, lon })}
          />
        </div>
        {/* フッター */}
        {mapPickerCoords && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: `16px 16px calc(env(safe-area-inset-bottom) + 16px)`,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
            display: 'flex', gap: '8px',
          }}>
            <button
              onClick={() => { setManualCoords(mapPickerCoords); setShowMapPicker(false) }}
              className="flex-1 py-3 text-sm font-semibold transition-opacity active:opacity-70"
              style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: '10px' }}
            >
              この位置を使う
            </button>
            <button
              onClick={() => setMapPickerCoords(null)}
              className="py-3 px-4 text-sm font-medium transition-opacity active:opacity-70"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF', borderRadius: '10px' }}
            >
              やり直す
            </button>
          </div>
        )}
      </div>
    )}
    </>
  )
}

export default function ListPage() {
  return (
    <Suspense>
      <ListPageInner />
    </Suspense>
  )
}
