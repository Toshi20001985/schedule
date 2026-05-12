'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MapPin, Play, Check, Plus, Film, Music, Book, Tv, Trash2, Pencil } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import BottomSheet from '@/components/BottomSheet'
import { haptic } from '@/lib/haptics'

type Owner = 'me' | 'partner' | 'both'

interface Place {
  id: string
  name: string
  category: string
  location: string
  memo?: string
  is_visited: boolean
  owner: Owner
}

interface MediaItem {
  id: string
  title: string
  media_type: 'movie' | 'tv' | 'anime' | 'music' | 'book' | 'other'
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

function ListPageInner() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'places' | 'media'>(
    searchParams.get('tab') === 'media' ? 'media' : 'places'
  )
  const [places, setPlaces] = useState<Place[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [myName, setMyName] = useState('わたし')
  const [partnerName, setPartnerName] = useState('パートナー')

  const [showSheet, setShowSheet] = useState(false)
  const [editingPlace, setEditingPlace] = useState<Place | null>(null)
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newMediaTitle, setNewMediaTitle] = useState('')
  const [newMediaType, setNewMediaType] = useState<MediaItem['media_type']>('movie')
  const [newMemo, setNewMemo] = useState('')
  const [newOwner, setNewOwner] = useState<Owner>('both')

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

  useEffect(() => {
    async function load() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setPlaces([
          { id: '1', name: '新宿御苑',      category: '公園',   location: '東京',   memo: '春に桜を見よう！', is_visited: false, owner: 'both' },
          { id: '2', name: '横浜中華街',    category: 'グルメ', location: '神奈川', is_visited: false, owner: 'me' },
          { id: '3', name: '嵐山',          category: '観光',   location: '京都',   memo: '旅行で', is_visited: true, owner: 'both' },
          { id: '4', name: 'teamLab Planets', category: 'アート', location: '東京', is_visited: false, owner: 'partner' },
        ])
        setMedia([
          { id: '1', title: '君の名は。',              media_type: 'movie', memo: 'また一緒に観たい', is_done: true,  owner: 'both' },
          { id: '2', title: 'スラムダンク',            media_type: 'anime', is_done: false, owner: 'partner' },
          { id: '3', title: 'Taylor Swift - Eras Tour', media_type: 'music', is_done: false, owner: 'me' },
          { id: '4', title: '呪術廻戦',                media_type: 'tv',    is_done: false, owner: 'both' },
        ])
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

      const [{ data: placesData }, { data: mediaData }] = await Promise.all([
        db.from('places')
          .select('id, name, category, location, memo, is_visited, owner')
          .eq('couple_id', cId)
          .order('created_at', { ascending: false }),
        db.from('media')
          .select('id, title, media_type, memo, is_done, owner')
          .eq('couple_id', cId)
          .order('created_at', { ascending: false }),
      ])

      if (placesData) {
        setPlaces(placesData.map((p: {
          id: string; name: string; category: string; location: string
          memo?: string; is_visited: boolean; owner?: Owner
        }) => ({
          id: p.id, name: p.name,
          category: p.category ?? 'その他',
          location: p.location ?? '',
          memo: p.memo ?? undefined,
          is_visited: p.is_visited,
          owner: (p.owner as Owner) ?? 'me',
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
    }
    load()
  }, [])

  const activePlaces  = places.filter(p => !p.is_visited)
  const visitedPlaces = places.filter(p => p.is_visited)

  async function togglePlaceVisited(id: string) {
    haptic('light')
    const place = places.find(p => p.id === id)
    if (!place) return
    const next = !place.is_visited
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, is_visited: next } : p))
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      await db.from('places').update({ is_visited: next }).eq('id', id)
    }
  }

  async function toggleMediaDone(id: string) {
    haptic('light')
    const item = media.find(m => m.id === id)
    if (!item) return
    const next = !item.is_done
    setMedia(prev => prev.map(m => m.id === id ? { ...m, is_done: next } : m))
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      await db.from('media').update({ is_done: next }).eq('id', id)
    }
  }

  async function deletePlace(id: string) {
    haptic('warning')
    setPlaces(prev => prev.filter(p => p.id !== id))
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      await db.from('places').delete().eq('id', id)
    }
  }

  async function deleteMedia(id: string) {
    haptic('warning')
    setMedia(prev => prev.filter(m => m.id !== id))
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      await db.from('media').delete().eq('id', id)
    }
  }

  function resetForm() {
    setNewName(''); setNewCategory(''); setNewLocation('')
    setNewMediaTitle(''); setNewMemo(''); setNewOwner('both')
    setNewMediaType('movie')
    setEditingPlace(null); setEditingMedia(null)
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

  function openEditMedia(item: MediaItem) {
    setEditingMedia(item)
    setNewMediaTitle(item.title)
    setNewMediaType(item.media_type)
    setNewMemo(item.memo ?? '')
    setNewOwner(item.owner)
    setTab('media')
    setShowSheet(true)
  }

  async function handleAddPlace() {
    if (!newName) return
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && myId && coupleId) {
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      const { data, error } = await db.from('places').insert({
        couple_id: coupleId, added_by: myId,
        name: newName, category: newCategory || 'その他',
        location: newLocation, memo: newMemo || null,
        is_visited: false, owner: newOwner,
      }).select().single()
      if (!error && data) {
        setPlaces(prev => [{ id: data.id, name: data.name, category: data.category, location: data.location, memo: data.memo ?? undefined, is_visited: false, owner: newOwner }, ...prev])
      }
    } else {
      setPlaces(prev => [{ id: Date.now().toString(), name: newName, category: newCategory || 'その他', location: newLocation, memo: newMemo || undefined, is_visited: false, owner: newOwner }, ...prev])
    }
    haptic('success')
    resetForm(); setShowSheet(false)
  }

  async function handleAddMedia() {
    if (!newMediaTitle) return
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && myId && coupleId) {
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      const { data, error } = await db.from('media').insert({
        couple_id: coupleId, added_by: myId,
        title: newMediaTitle, media_type: newMediaType,
        memo: newMemo || null, is_done: false, owner: newOwner,
      }).select().single()
      if (!error && data) {
        setMedia(prev => [{ id: data.id, title: data.title, media_type: data.media_type, memo: data.memo ?? undefined, is_done: false, owner: newOwner }, ...prev])
      }
    } else {
      setMedia(prev => [{ id: Date.now().toString(), title: newMediaTitle, media_type: newMediaType, memo: newMemo || undefined, is_done: false, owner: newOwner }, ...prev])
    }
    haptic('success')
    resetForm(); setShowSheet(false)
  }

  async function handleUpdatePlace() {
    if (!editingPlace || !newName) return
    const updates = { name: newName, category: newCategory || 'その他', location: newLocation, memo: newMemo || null, owner: newOwner }
    setPlaces(prev => prev.map(p => p.id === editingPlace.id ? { ...p, ...updates, memo: newMemo || undefined } : p))
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      await db.from('places').update(updates).eq('id', editingPlace.id)
    }
    haptic('success')
    resetForm(); setShowSheet(false)
  }

  async function handleUpdateMedia() {
    if (!editingMedia || !newMediaTitle) return
    const updates = { title: newMediaTitle, media_type: newMediaType, memo: newMemo || null, owner: newOwner }
    setMedia(prev => prev.map(m => m.id === editingMedia.id ? { ...m, ...updates, memo: newMemo || undefined } : m))
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      await db.from('media').update(updates).eq('id', editingMedia.id)
    }
    haptic('success')
    resetForm(); setShowSheet(false)
  }

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-lg font-semibold mb-5" style={{ color: '#1A1A1A' }}>リスト</h1>

      {/* Tab Switcher */}
      <div className="flex p-0.5 mb-5" style={{ backgroundColor: '#F5F5F3', borderRadius: '10px' }}>
        {[
          { key: 'places', icon: MapPin, label: '行きたい場所' },
          { key: 'media',  icon: Play,   label: '観たい・聴きたい' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => { haptic('light'); setTab(key as 'places' | 'media') }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === key ? '#FFFFFF' : 'transparent',
              color: tab === key ? '#1A1A1A' : '#737373',
              borderRadius: '8px',
              border: tab === key ? '0.5px solid #E5E5E5' : 'none',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Places Tab */}
      {tab === 'places' && (
        <div className="space-y-2.5">
          <p className="text-xs px-1" style={{ color: '#A3A3A3' }}>未訪問 {activePlaces.length}件</p>
          {activePlaces.map(place => (
            <Card key={place.id} padding="md">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => togglePlaceVisited(place.id)}
                  className="w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center"
                  style={{ borderColor: '#E5E5E5', borderWidth: '0.5px' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{place.name}</span>
                    <Tag label={ownerLabel(place.owner)} owner={place.owner} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5" style={{ backgroundColor: '#F5F5F3', color: '#737373', borderRadius: '6px' }}>{place.category}</span>
                    {place.location && (
                      <span className="text-xs flex items-center gap-0.5" style={{ color: '#A3A3A3' }}>
                        <MapPin size={10} /> {place.location}
                      </span>
                    )}
                  </div>
                  {place.memo && <p className="text-xs mt-1.5" style={{ color: '#737373' }}>{place.memo}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEditPlace(place)} className="p-1.5 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deletePlace(place.id)} className="p-1.5 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}

          {visitedPlaces.length > 0 && (
            <>
              <p className="text-xs px-1 mt-4" style={{ color: '#A3A3A3' }}>訪問済み {visitedPlaces.length}件</p>
              {visitedPlaces.map(place => (
                <Card key={place.id} padding="md" style={{ opacity: 0.5 }}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => togglePlaceVisited(place.id)} className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#F0F7F0' }}>
                      <Check size={12} style={{ color: '#4A7C59' }} />
                    </button>
                    <span className="flex-1 text-sm line-through" style={{ color: '#737373' }}>{place.name}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEditPlace(place)} className="p-1.5 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deletePlace(place.id)} className="p-1.5 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* Media Tab */}
      {tab === 'media' && (
        <div className="space-y-2.5">
          <p className="text-xs px-1" style={{ color: '#A3A3A3' }}>未完了 {media.filter(m => !m.is_done).length}件</p>
          {media.filter(m => !m.is_done).map(item => {
            const config = mediaTypeConfig[item.media_type]
            const Icon = config.icon
            return (
              <Card key={item.id} padding="md">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.bg }}>
                    <Icon size={15} style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{item.title}</span>
                      <Tag label={ownerLabel(item.owner)} owner={item.owner} />
                    </div>
                    <span className="text-xs px-2 py-0.5" style={{ backgroundColor: config.bg, color: config.color, borderRadius: '6px' }}>{config.label}</span>
                    {item.memo && <p className="text-xs mt-1" style={{ color: '#737373' }}>{item.memo}</p>}
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleMediaDone(item.id)} className="w-5 h-5 rounded border flex items-center justify-center" style={{ borderColor: '#E5E5E5', borderWidth: '0.5px' }} />
                    <div className="flex gap-0.5">
                      <button onClick={() => openEditMedia(item)} className="p-1 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteMedia(item.id)} className="p-1 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}

          {media.filter(m => m.is_done).length > 0 && (
            <>
              <p className="text-xs px-1 mt-4" style={{ color: '#A3A3A3' }}>完了 {media.filter(m => m.is_done).length}件</p>
              {media.filter(m => m.is_done).map(item => {
                const config = mediaTypeConfig[item.media_type]
                const Icon = config.icon
                return (
                  <Card key={item.id} padding="md" style={{ opacity: 0.5 }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F5F5F3' }}>
                        <Icon size={15} style={{ color: '#A3A3A3' }} />
                      </div>
                      <span className="flex-1 text-sm line-through" style={{ color: '#737373' }}>{item.title}</span>
                      <button onClick={() => toggleMediaDone(item.id)} className="p-1"><Check size={16} style={{ color: '#4A7C59' }} /></button>
                      <button onClick={() => openEditMedia(item)} className="p-1 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Pencil size={13} /></button>
                      <button onClick={() => deleteMedia(item.id)} className="p-1 transition-opacity active:opacity-50" style={{ color: '#A3A3A3' }}><Trash2 size={15} /></button>
                    </div>
                  </Card>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { haptic('medium'); setShowSheet(true) }}
        className="fixed right-4 z-30 flex items-center gap-2 px-5 py-3 active:opacity-70 transition-opacity"
        style={{ bottom: `calc(env(safe-area-inset-bottom) + 76px)`, backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: '10px' }}
      >
        <Plus size={18} strokeWidth={2} />
        <span className="text-sm font-medium">追加</span>
      </button>

      {/* Add / Edit Sheet */}
      <BottomSheet
        open={showSheet}
        onClose={() => { setShowSheet(false); resetForm() }}
        title={tab === 'places' ? (editingPlace ? '場所を編集' : '場所を追加') : (editingMedia ? 'アイテムを編集' : 'アイテムを追加')}
      >
        {tab === 'places' ? (
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
            {editingPlace
              ? <Button fullWidth onClick={handleUpdatePlace} disabled={!newName}>更新する</Button>
              : <Button fullWidth onClick={handleAddPlace}    disabled={!newName}>追加する</Button>
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
              ? <Button fullWidth onClick={handleUpdateMedia} disabled={!newMediaTitle}>更新する</Button>
              : <Button fullWidth onClick={handleAddMedia}    disabled={!newMediaTitle}>追加する</Button>
            }
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

export default function ListPage() {
  return (
    <Suspense>
      <ListPageInner />
    </Suspense>
  )
}
