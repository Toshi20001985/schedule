'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

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

    // 入力チェック（noValidate により HTML5 バリデーションが無効なため JS で補完）
    if (!displayName.trim()) {
      setError('ニックネームを入力してください。')
      return
    }
    if (!email.trim()) {
      setError('メールアドレスを入力してください。')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上にしてください。')
      return
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('パスワードは英字と数字を両方含めてください。')
      return
    }

    setLoading(true)

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        router.push('/auth/pair')
        return
      }

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // display_name を raw_user_meta_data に含めて送信
      // DBトリガー (handle_new_user) が自動でユーザープロフィールとカップルを作成する
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      })

      if (signupError) {
        setError('[auth] ' + signupError.message)
        return
      }

      if (!authData.user) {
        setError('アカウントの作成に失敗しました。')
        return
      }

      // セッションがある場合（メール確認不要）→ そのままアプリへ
      if (authData.session) {
        router.push('/')
        router.refresh()
        return
      }

      // セッションがない場合（メール確認が必要）→ 確認メールを送った旨を表示
      setError('確認メールを送信しました。メールを確認してからログインしてください。')
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
        <form onSubmit={handleSignup} noValidate className="space-y-4">
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
              placeholder="英字+数字を含む8文字以上"
              minLength={8}
              required
            />
          </div>

          {error && (
            <p
              className="text-sm px-4 py-3"
              style={{
                color: error.startsWith('確認メール') ? '#4A7C59' : '#B5465A',
                backgroundColor: error.startsWith('確認メール') ? '#F0F7F0' : '#FFF0F3',
                borderRadius: '10px',
              }}
            >
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
