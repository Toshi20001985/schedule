'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        router.push('/auth/pair')
        return
      }

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data: authData, error: signupError } = await supabase.auth.signUp({ email, password })

      if (signupError || !authData.user) {
        setError('[auth] ' + (signupError?.message || '登録に失敗しました'))
        return
      }

      const inviteCode = generateInviteCode()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      const { error: userError } = await db.from('users').insert({
        id: authData.user.id,
        email,
        display_name: displayName,
        invite_code: inviteCode,
      })

      if (userError) {
        setError('プロフィールの作成に失敗しました: ' + userError.message)
        return
      }

      const { data: couple, error: coupleError } = await db
        .from('couples')
        .insert({ user1_id: authData.user.id })
        .select()
        .single()

      if (coupleError || !couple) {
        setError('カップル情報の作成に失敗しました: ' + coupleError?.message)
        return
      }

      const { error: linkError } = await db
        .from('users')
        .update({ couple_id: couple.id })
        .eq('id', authData.user.id)

      if (linkError) {
        setError('カップルの紐付けに失敗しました: ' + linkError.message)
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('エラーが発生しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: '#FAFAF7' }}>
      <div className="flex-1 flex flex-col justify-center px-6 py-16 max-w-sm mx-auto w-full">

        {/* Logo */}
        <div className="mb-12">
          <h1 className="text-4xl font-semibold tracking-tight" style={{ color: '#1A1A1A' }}>
            Layover
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#737373' }}>
            アカウントを作成
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#1A1A1A' }}>
              ニックネーム
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 text-sm outline-none"
              style={{
                border: '0.5px solid #E5E5E5',
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
              }}
              placeholder="あなたの名前"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#1A1A1A' }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-sm outline-none"
              style={{
                border: '0.5px solid #E5E5E5',
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
              }}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#1A1A1A' }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-sm outline-none"
              style={{
                border: '0.5px solid #E5E5E5',
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
              }}
              placeholder="8文字以上"
              minLength={8}
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
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{
              backgroundColor: '#1A1A1A',
              color: '#FFFFFF',
              borderRadius: '10px',
            }}
          >
            {loading ? '登録中...' : 'アカウントを作成'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="mt-8 text-sm text-center" style={{ color: '#737373' }}>
          すでにアカウントをお持ちの方は{' '}
          <Link href="/auth/login" className="font-medium underline underline-offset-4" style={{ color: '#1A1A1A' }}>
            ログイン
          </Link>
        </p>
      </div>
    </div>
  )
}
