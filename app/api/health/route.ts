import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  // Supabase 未設定（デモ環境）でも常に応答する
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'skipped',
      },
    })
  }

  try {
    const supabase = await createClient()
    // anon キーでの疎通確認（RLS により結果は空だが、エラーなし = DB 接続成功）
    const { error } = await supabase.from('couples').select('id').limit(1)

    return NextResponse.json({
      status: error ? 'unhealthy' : 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: error ? 'failed' : 'ok',
      },
    }, { status: error ? 503 : 200 })
  } catch (e) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: e instanceof Error ? e.message : 'Unknown error',
      checks: {
        database: 'failed',
      },
    }, { status: 503 })
  }
}
