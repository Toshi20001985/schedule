'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, LogOut, Calendar, User, Link2, ChevronRight } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import IconCircle from '@/components/ui/IconCircle'

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
      if (!user) return

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
        setTimeout(() => setSaved(false), 2000)
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

      // パートナー名・カラー更新
      if (partnerId) {
        await db
          .from('users')
          .update({ display_name: partnerName, avatar_color: partnerColor })
          .eq('id', partnerId)
      }

      // カップル情報更新（記念日）
      if (coupleId) {
        const { error: coupleError } = await db
          .from('couples')
          .update({ anniversary: anniversary || null })
          .eq('id', coupleId)

        if (coupleError) throw new Error('日付の更新に失敗しました')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(inviteCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          <div className="w-8 h-px" style={{ backgroundColor: '#E5E5E5' }} />
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
          <User size={13} /> プロフィール
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

          <div style={{ borderTop: '0.5px solid #E5E5E5', paddingTop: '16px' }}>
            <label className="block text-sm mb-1.5" style={{ color: '#737373' }}>パートナーの名前</label>
            <input type="text" value={partnerName} onChange={e => setPartnerName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#737373' }}>パートナーのアイコンカラー</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map(color => (
                <button key={color} onClick={() => setPartnerColor(color)}
                  className="w-7 h-7 rounded-full transition-transform active:scale-90"
                  style={{ backgroundColor: color, outline: partnerColor === color ? `2px solid ${color}` : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Dates */}
      <Card>
        <h2 className="text-xs font-medium uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: '#A3A3A3' }}>
          <Calendar size={13} /> 日付
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
          <Link2 size={13} /> 招待コード
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-center py-3 text-lg font-semibold tracking-[0.2em]"
            style={{ backgroundColor: '#F5F5F3', color: '#1A1A1A', borderRadius: '10px' }}>
            {inviteCode}
          </div>
          <button onClick={copyCode} className="p-3 transition-opacity active:opacity-50"
            style={{ backgroundColor: '#F5F5F3', color: copied ? '#4A7C59' : '#737373', borderRadius: '10px' }}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </Card>

      {/* Logout */}
      <Card padding="none">
        <button onClick={handleLogout} className="w-full flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <LogOut size={16} style={{ color: '#B5465A' }} />
            <span className="text-sm font-medium" style={{ color: '#B5465A' }}>ログアウト</span>
          </div>
          <ChevronRight size={14} style={{ color: '#A3A3A3' }} />
        </button>
      </Card>

      <p className="text-center text-xs" style={{ color: '#A3A3A3' }}>Layover v1.0.0</p>
    </div>
  )
}
