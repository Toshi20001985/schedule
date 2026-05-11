'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, ArrowRight } from 'lucide-react'

export default function PairPage() {
  const router = useRouter()
  const [partnerCode, setPartnerCode] = useState('')
  const [myCode, setMyCode] = useState('--------')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchMyCode() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setMyCode('DEMO1234')
        return
      }
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('users')
        .select('invite_code')
        .eq('id', user.id)
        .single()
      if (data?.invite_code) setMyCode(data.invite_code)
    }
    fetchMyCode()
  }, [])

  async function handlePair(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        router.push('/')
        return
      }

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data: partnerData } = await db
        .from('users')
        .select('id, couple_id, invite_code')
        .eq('invite_code', partnerCode.toUpperCase())
        .maybeSingle()

      if (!partnerData) {
        setError('招待コードが見つかりません。')
        return
      }

      const partner = partnerData as { id: string; couple_id: string | null }

      if (partner.id === user.id) {
        setError('自分のコードは使えません。')
        return
      }

      const { error: updateError } = await db
        .from('users')
        .update({ couple_id: partner.couple_id })
        .eq('id', user.id)

      if (updateError) {
        setError('ペアリングに失敗しました。')
        return
      }

      await db
        .from('couples')
        .update({ user2_id: user.id })
        .eq('id', partner.couple_id)

      router.push('/')
      router.refresh()
    } catch {
      setError('エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(myCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="flex-1 flex flex-col justify-center px-6 py-16 max-w-sm mx-auto w-full">

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-semibold tracking-tight" style={{ color: '#1A1A1A' }}>
            Layover
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#737373' }}>
            パートナーと繋がる
          </p>
        </div>

        {/* My Code */}
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#A3A3A3' }}>
            あなたの招待コード
          </p>
          <div
            className="flex items-center gap-3 px-4 py-4"
            style={{
              border: '0.5px solid #E5E5E5',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
            }}
          >
            <span
              className="flex-1 text-center text-2xl font-semibold tracking-[0.2em]"
              style={{ color: '#1A1A1A' }}
            >
              {myCode}
            </span>
            <button
              onClick={copyCode}
              className="p-2 transition-colors"
              style={{
                color: copied ? '#4A7C59' : '#A3A3A3',
                borderRadius: '6px',
              }}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <p className="mt-2 text-xs" style={{ color: '#A3A3A3' }}>
            このコードをパートナーに共有してください
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ backgroundColor: '#E5E5E5' }} />
          <span className="text-xs" style={{ color: '#A3A3A3' }}>または</span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#E5E5E5' }} />
        </div>

        {/* Partner Code Input */}
        <form onSubmit={handlePair} className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#A3A3A3' }}>
              パートナーのコードを入力
            </p>
            <input
              type="text"
              value={partnerCode}
              onChange={e => setPartnerCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-4 text-center text-xl font-semibold tracking-[0.2em] outline-none"
              style={{
                border: '0.5px solid #E5E5E5',
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
              }}
              placeholder="XXXXXXXX"
              maxLength={8}
              required
            />
          </div>

          {error && (
            <p className="text-sm px-4 py-3" style={{
              color: '#B5465A',
              backgroundColor: '#FFF0F3',
              borderRadius: '10px',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || partnerCode.length !== 8}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-opacity disabled:opacity-40"
            style={{
              backgroundColor: '#1A1A1A',
              color: '#FFFFFF',
              borderRadius: '10px',
            }}
          >
            {loading ? 'ペアリング中...' : 'ペアリングする'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <button
          onClick={() => router.push('/')}
          className="w-full text-center text-sm mt-6 py-2 underline underline-offset-4"
          style={{ color: '#A3A3A3' }}
        >
          あとで設定する
        </button>
      </div>
    </div>
  )
}
