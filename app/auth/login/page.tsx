'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
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
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError('メールアドレスまたはパスワードが正しくありません')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('ログインに失敗しました。もう一度お試しください。')
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
            for two, across the distance
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#1A1A1A' }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-sm outline-none transition-colors"
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
              placeholder="••••••••"
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
            {loading ? 'ログイン中...' : 'ログイン'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-sm text-center" style={{ color: '#737373' }}>
          アカウントをお持ちでない方は{' '}
          <Link href="/auth/signup" className="font-medium underline underline-offset-4" style={{ color: '#1A1A1A' }}>
            新規登録
          </Link>
        </p>
      </div>
    </div>
  )
}
