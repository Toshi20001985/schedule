'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, Check, LogOut, Calendar, User, Link2, ChevronRight, Vibrate, Volume2, MapPin, Download, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import IconCircle from '@/components/ui/IconCircle'
import { PageTransition } from '@/components/PageTransition'
import { useToast } from '@/components/ToastProvider'

const AVATAR_COLORS = [
  '#1A1A1A', '#6D5BD0', '#2D6B9E', '#4A7C59', '#B5465A',
  '#C2782D', '#737373', '#8B6914', '#5C7A9E', '#7E5A9E',
]

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

export default function SettingsPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [myId, setMyId] = useState<string | null>(null)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [myName, setMyName] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [myColor, setMyColor] = useState('#6D5BD0')
  const [partnerColor, setPartnerColor] = useState('#2D6B9E')
  const [anniversary, setAnniversary] = useState('')
  const [inviteCode, setInviteCode] = useState('--------')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(true)
  const [backfilling,       setBackfilling]       = useState(false)
  const [backfillProgress,  setBackfillProgress]  = useState<{ done: number; total: number } | null>(null)
  const [backfillMessage,   setBackfillMessage]   = useState('')
  const [hapticsEnabled, setHapticsEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const savedTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current)  clearTimeout(savedTimerRef.current)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  useEffect(() => {
    setHapticsEnabled(localStorage.getItem('haptics_enabled') !== 'false')
    setSoundEnabled(localStorage.getItem('sound_enabled') === 'true')
  }, [])

  function toggleHaptics() {
    const next = !hapticsEnabled
    setHapticsEnabled(next)
    localStorage.setItem('haptics_enabled', next ? 'true' : 'false')
    if (next) {
      import('@/lib/haptics').then(({ haptic }) => haptic('success'))
    }
  }

  function toggleSound() {
    const next = !soundEnabled
    setSoundEnabled(next)
    localStorage.setItem('sound_enabled', next ? 'true' : 'false')
    if (next) {
      import('@/lib/sounds').then(({ playSound }) => {
        // 一時的にONにしてサンプル音を鳴らす
        localStorage.setItem('sound_enabled', 'true')
        playSound('tap')
      })
    }
  }

  useEffect(() => {
    async function load() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // デモデータ
        setMyName('さくら'); setPartnerName('けんた')
        setInviteCode('DEMO1234')
        setLoading(false)
        return
      }

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      setMyId(user.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      // 自分のプロフィール取得
      const { data: me } = await db
        .from('users')
        .select('display_name, avatar_color, invite_code, couple_id')
        .eq('id', user.id)
        .single()

      if (me) {
        setMyName(me.display_name || '')
        setMyColor(me.avatar_color || '#6D5BD0')
        setInviteCode(me.invite_code || '--------')
        setCoupleId(me.couple_id)

        // カップル情報取得（記念日・次の約束日）
        if (me.couple_id) {
          const { data: couple } = await db
            .from('couples')
            .select('anniversary, next_meeting_date, user1_id, user2_id')
            .eq('id', me.couple_id)
            .single()

          if (couple) {
            setAnniversary(couple.anniversary || '')

            // パートナーのID特定
            const pid = couple.user1_id === user.id ? couple.user2_id : couple.user1_id
            if (pid) {
              setPartnerId(pid)
              const { data: partner } = await db
                .from('users')
                .select('display_name, avatar_color')
                .eq('id', pid)
                .single()
              if (partner) {
                setPartnerName(partner.display_name || '')
                setPartnerColor(partner.avatar_color || '#2D6B9E')
              }
            }
          }
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaveError('')
    setSaving(true)

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !myId) {
        setSaved(true)
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
        return
      }

      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any

      // 自分のプロフィール更新
      const { error: meError } = await db
        .from('users')
        .update({ display_name: myName, avatar_color: myColor })
        .eq('id', myId)

      if (meError) throw new Error('プロフィールの更新に失敗しました')

      // カップル情報更新（記念日）
      if (coupleId) {
        const { error: coupleError } = await db
          .from('couples')
          .update({ anniversary: anniversary || null })
          .eq('id', coupleId)

        if (coupleError) throw new Error('日付の更新に失敗しました')
      }

      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(inviteCode).catch(() => {})
    setCopied(true)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  async function handleBackfill() {
    if (!coupleId || backfilling) return
    setBackfilling(true)
    setBackfillMessage('')

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setBackfillMessage('デモ環境では利用できません')
        return
      }
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any

      // 座標のない場所を取得
      const { data: places } = await db
        .from('places')
        .select('id, name, location')
        .eq('couple_id', coupleId)
        .or('latitude.is.null,longitude.is.null')

      if (!places || places.length === 0) {
        setBackfillMessage('更新が必要な場所はありませんでした')
        return
      }

      setBackfillProgress({ done: 0, total: places.length })

      const { geocode } = await import('@/lib/geocoding')
      let updated = 0

      for (let i = 0; i < places.length; i++) {
        const place = places[i]
        const query = [place.name, place.location].filter(Boolean).join(' ')
        const coords = await geocode(query)
        if (coords) {
          await db
            .from('places')
            .update({ latitude: coords.lat, longitude: coords.lon })
            .eq('id', place.id)
          updated++
        }
        setBackfillProgress({ done: i + 1, total: places.length })
        // Nominatim レート制限: 1リクエスト/秒
        if (i < places.length - 1) {
          await new Promise(r => setTimeout(r, 1100))
        }
      }

      setBackfillMessage(`${updated} 件の座標を更新しました`)
    } finally {
      setBackfilling(false)
      setBackfillProgress(null)
    }
  }

  async function handleRefreshAllCoordinates() {
    if (!coupleId || backfilling) return
    setBackfilling(true)
    setBackfillMessage('')

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setBackfillMessage('デモ環境では利用できません')
        return
      }
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any

      // 座標の有無にかかわらず全件取得
      const { data: places } = await db
        .from('places')
        .select('id, name, location')
        .eq('couple_id', coupleId)

      if (!places || places.length === 0) {
        setBackfillMessage('場所が登録されていません')
        return
      }

      setBackfillProgress({ done: 0, total: places.length })

      const { geocode } = await import('@/lib/geocoding')
      let updated = 0
      let failed = 0

      for (let i = 0; i < places.length; i++) {
        const place = places[i]
        const query = [place.name, place.location].filter(Boolean).join(' ')
        const coords = await geocode(query)
        if (coords) {
          await db
            .from('places')
            .update({ latitude: coords.lat, longitude: coords.lon })
            .eq('id', place.id)
          updated++
        } else {
          // 誤データをクリア
          await db
            .from('places')
            .update({ latitude: null, longitude: null })
            .eq('id', place.id)
          failed++
        }
        setBackfillProgress({ done: i + 1, total: places.length })
        if (i < places.length - 1) {
          await new Promise(r => setTimeout(r, 1100))
        }
      }

      setBackfillMessage(`再取得完了: ${updated} 件成功 / ${failed} 件取得不可`)
    } finally {
      setBackfilling(false)
      setBackfillProgress(null)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const response = await fetch('/api/export')
      if (!response.ok) throw new Error('export failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `layover-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('データをエクスポートしました', { variant: 'success' })
    } catch {
      showToast('エクスポートに失敗しました', { variant: 'error' })
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('本当にすべてのデータを削除しますか？\n\nこの操作は元に戻せません。')) return
    const text = window.prompt('確認のため「DELETE」と入力してください')
    if (text !== 'DELETE') return

    setDeleting(true)
    try {
      const response = await fetch('/api/delete-account', { method: 'DELETE' })
      if (!response.ok) throw new Error('delete failed')
      showToast('データを削除しました')
      router.push('/auth/login')
    } catch {
      showToast('削除に失敗しました', { variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  async function handleLogout() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { router.push('/auth/login'); return }
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh" style={{ color: '#A3A3A3' }}>
        <span className="text-sm">読み込み中...</span>
      </div>
    )
  }

  return (
    <PageTransition>
    <div className="px-4 pt-6 pb-8 max-w-lg mx-auto space-y-5">
      <h1 className="text-lg font-semibold" style={{ color: '#1A1A1A' }}>設定</h1>

      {/* Couple Preview */}
      <Card padding="md">
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="flex flex-col items-center gap-2">
            <IconCircle initial={myName || '?'} color={myColor} size="lg" />
            <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{myName || '未設定'}</span>
            <span className="text-xs" style={{ color: '#A3A3A3' }}>わたし</span>
          </div>
          <div className="divider-soft w-8" />
          <div className="flex flex-col items-center gap-2">
            <IconCircle initial={partnerName || '?'} color={partnerColor} size="lg" />
            <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{partnerName || '未設定'}</span>
            <span className="text-xs" style={{ color: '#A3A3A3' }}>パートナー</span>
          </div>
        </div>
      </Card>

      {/* Profile */}
      <Card>
        <h2 className="text-xs font-medium uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: '#A3A3A3' }}>
          <User size={13} strokeWidth={1.5} /> プロフィール
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: '#737373' }}>あなたの名前</label>
            <input type="text" value={myName} onChange={e => setMyName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#737373' }}>アイコンカラー</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map(color => (
                <button key={color} onClick={() => setMyColor(color)}
                  className="w-7 h-7 rounded-full transition-transform active:scale-90"
                  style={{ backgroundColor: color, outline: myColor === color ? `2px solid ${color}` : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>

          {partnerId && (
            <div style={{ borderTop: '0.5px solid #E5E5E5', paddingTop: '16px' }}>
              <label className="block text-sm mb-1.5" style={{ color: '#737373' }}>パートナーの名前</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#F5F5F3' }}>
                <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: partnerColor }} />
                <span className="text-sm" style={{ color: '#1A1A1A' }}>
                  {partnerName || '（未設定）'}
                </span>
                <span className="text-xs ml-auto" style={{ color: '#A3A3A3' }}>パートナーが変更できます</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Dates */}
      <Card>
        <h2 className="text-xs font-medium uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: '#A3A3A3' }}>
          <Calendar size={13} strokeWidth={1.5} /> 日付
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: '#737373' }}>記念日</label>
            <input type="date" value={anniversary} onChange={e => setAnniversary(e.target.value)} style={inputStyle} />
          </div>
        </div>
      </Card>

      {saveError && (
        <p className="text-sm px-4 py-3" style={{ color: '#B5465A', backgroundColor: '#FFF0F3', borderRadius: '10px' }}>
          {saveError}
        </p>
      )}

      <Button fullWidth onClick={handleSave} disabled={saving}>
        {saving ? '保存中...' : saved ? '保存しました' : '設定を保存する'}
      </Button>

      {/* Invite Code */}
      <Card>
        <h2 className="text-xs font-medium uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#A3A3A3' }}>
          <Link2 size={13} strokeWidth={1.5} /> 招待コード
        </h2>
        <p className="text-xs mb-2" style={{ color: '#737373' }}>
          あなたのコードをパートナーに共有してください
        </p>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 text-center py-3 text-lg font-semibold tracking-[0.2em]"
            style={{ backgroundColor: '#F5F5F3', color: '#1A1A1A', borderRadius: '10px' }}>
            {inviteCode}
          </div>
          <button onClick={copyCode} className="p-3 transition-opacity active:opacity-50"
            style={{ backgroundColor: '#F5F5F3', color: copied ? '#4A7C59' : '#737373', borderRadius: '10px' }}>
            {copied ? <Check size={18} strokeWidth={1.5} /> : <Copy size={18} strokeWidth={1.5} />}
          </button>
        </div>
        {/* パートナーのコードを入力するボタン */}
        {!partnerId && (
          <Link
            href="/auth/pair"
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium transition-opacity active:opacity-70"
            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: '10px' }}
          >
            パートナーのコードを入力する
            <ChevronRight size={15} strokeWidth={1.5} />
          </Link>
        )}
        {partnerId && (
          <p className="text-xs text-center" style={{ color: '#4A7C59' }}>✓ パートナーと繋がっています</p>
        )}
      </Card>

      {/* Map Data */}
      {coupleId && (
        <Card>
          <h2 className="text-xs font-medium uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#A3A3A3' }}>
            <MapPin size={13} strokeWidth={1.5} /> 地図データ
          </h2>
          <p className="text-xs mb-3" style={{ color: '#737373' }}>
            場所に座標情報がない場合、地図に表示されません。
            ボタンをタップすると既存の場所の座標を一括取得します。
          </p>
          {backfillProgress && (
            <p className="text-xs mb-2" style={{ color: '#737373' }}>
              取得中... {backfillProgress.done} / {backfillProgress.total} 件
            </p>
          )}
          {backfillMessage && (
            <p className="text-xs mb-2" style={{ color: '#4A7C59' }}>{backfillMessage}</p>
          )}
          <button
            onClick={handleBackfill}
            disabled={backfilling || !coupleId}
            className="w-full py-2.5 text-sm font-medium transition-opacity disabled:opacity-40 mb-2"
            style={{ backgroundColor: '#F5F5F3', color: '#1A1A1A', borderRadius: '10px' }}
          >
            {backfilling ? '取得中...' : '座標のない場所を取得する'}
          </button>
          <button
            onClick={handleRefreshAllCoordinates}
            disabled={backfilling || !coupleId}
            className="w-full py-2.5 text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ backgroundColor: '#FFF8E6', color: '#8B6914', borderRadius: '10px', border: '0.5px solid #C4963A' }}
          >
            {backfilling ? '取得中...' : 'すべての座標を再取得（誤判定修正）'}
          </button>
        </Card>
      )}

      {/* Data Management */}
      <Card>
        <h2 className="text-xs font-medium uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#A3A3A3' }}>
          <Download size={13} strokeWidth={1.5} /> データ管理
        </h2>
        <p className="text-xs mb-3" style={{ color: '#737373' }}>
          すべてのデータを JSON 形式でダウンロードできます。
          定期的にエクスポートしてバックアップとして保存してください。
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          data-testid="export-button"
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-opacity disabled:opacity-40 mb-3"
          style={{ backgroundColor: '#F5F5F3', color: '#1A1A1A', borderRadius: '10px' }}
        >
          <Download size={15} strokeWidth={1.5} />
          {exporting ? 'エクスポート中...' : 'すべてのデータをエクスポート'}
        </button>
        <div style={{ borderTop: '0.5px solid #E5E5E5', paddingTop: '12px' }}>
          <p className="text-xs mb-2" style={{ color: '#A3A3A3' }}>
            危険ゾーン — データを削除するとパートナーとの共有データも失われます
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            data-testid="delete-account-button"
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ backgroundColor: '#FFF0F3', color: '#B5465A', borderRadius: '10px', border: '0.5px solid #B5465A' }}
          >
            <Trash2 size={15} strokeWidth={1.5} />
            {deleting ? '削除中...' : 'データを削除してログアウト'}
          </button>
        </div>
      </Card>

      {/* 触感 */}
      <Card padding="none">
        <h2 className="text-xs font-medium uppercase tracking-widest px-4 pt-4 pb-2 flex items-center gap-2" style={{ color: '#A3A3A3' }}>
          <Vibrate size={13} strokeWidth={1.5} /> 触感
        </h2>
        {/* バイブレーション */}
        <button
          data-testid="haptic-toggle"
          aria-checked={hapticsEnabled}
          onClick={toggleHaptics}
          className="w-full flex items-center justify-between px-4 py-3.5"
          style={{ borderTop: '0.5px solid #F0F0F0' }}
        >
          <div className="flex items-center gap-3">
            <Vibrate size={16} strokeWidth={1.5} style={{ color: '#737373' }} />
            <div className="text-left">
              <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>バイブレーション</span>
              <p className="text-xs mt-0.5" style={{ color: '#A3A3A3' }}>タップや操作時に振動</p>
            </div>
          </div>
          <div
            className="w-11 h-6 rounded-full transition-colors relative flex-shrink-0"
            style={{ backgroundColor: hapticsEnabled ? '#1A1A1A' : '#E5E5E5' }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: hapticsEnabled ? 'translateX(20px)' : 'translateX(2px)' }}
            />
          </div>
        </button>
        {/* サウンド */}
        <button
          data-testid="sound-toggle"
          aria-checked={soundEnabled}
          onClick={toggleSound}
          className="w-full flex items-center justify-between px-4 py-3.5"
          style={{ borderTop: '0.5px solid #F0F0F0' }}
        >
          <div className="flex items-center gap-3">
            <Volume2 size={16} strokeWidth={1.5} style={{ color: '#737373' }} />
            <div className="text-left">
              <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>サウンド</span>
              <p className="text-xs mt-0.5" style={{ color: '#A3A3A3' }}>タップや成功時に音（デフォルト OFF）</p>
            </div>
          </div>
          <div
            className="w-11 h-6 rounded-full transition-colors relative flex-shrink-0"
            style={{ backgroundColor: soundEnabled ? '#1A1A1A' : '#E5E5E5' }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: soundEnabled ? 'translateX(20px)' : 'translateX(2px)' }}
            />
          </div>
        </button>
      </Card>

      {/* Logout */}
      <Card padding="none">
        <button onClick={handleLogout} className="w-full flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <LogOut size={16} strokeWidth={1.5} style={{ color: '#B5465A' }} />
            <span className="text-sm font-medium" style={{ color: '#B5465A' }}>ログアウト</span>
          </div>
          <ChevronRight size={14} strokeWidth={1.5} style={{ color: '#A3A3A3' }} />
        </button>
      </Card>

      <p className="text-center text-xs" style={{ color: '#A3A3A3' }}>Layover v1.0.0</p>
    </div>
    </PageTransition>
  )
}
