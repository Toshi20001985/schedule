import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Supabase未設定ならスキップ
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 未ログイン → ログインページ以外はリダイレクト
  if (!user) {
    if (pathname === '/auth/login' || pathname === '/auth/signup') {
      return supabaseResponse
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // ログイン済み → login/signup には入れない（pair はOK）
  if (pathname === '/auth/login' || pathname === '/auth/signup') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ペアリング未完了 → /auth/pair 以外はリダイレクト
  if (pathname !== '/auth/pair') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userData } = await (supabase as any)
      .from('users')
      .select('couple_id')
      .eq('id', user.id)
      .single()

    if (userData && !userData.couple_id) {
      return NextResponse.redirect(new URL('/auth/pair', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)',
  ],
}
