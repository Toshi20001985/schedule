import { createClient } from '@/lib/supabase/server'

// アカウント削除エンドポイント
// RLS の制約上、以下の範囲でデータを削除する：
//   - todos, flights: couple_id スコープ（メンバー全員のデータを削除可能）
//   - events, places, media: created_by/added_by = 自分のデータのみ削除
//   - auth ユーザー自体の削除は service_role キーが必要なため省略
//     （Supabase Dashboard > Authentication > Users から手動削除可能）
export async function DELETE() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return new Response('Not available in demo mode', { status: 503 })
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: userData } = await db
    .from('users')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  const coupleId = userData?.couple_id

  if (coupleId) {
    // couple メンバーなら全件削除できるテーブル
    await db.from('todos').delete().eq('couple_id', coupleId)
    await db.from('flights').delete().eq('couple_id', coupleId)

    // 自分が追加したデータのみ削除（パートナーのデータはRLS上削除不可）
    await db.from('media').delete().eq('added_by', user.id)
    await db.from('places').delete().eq('added_by', user.id)
    await db.from('events').delete().eq('created_by', user.id)
  }

  // セッション終了
  await supabase.auth.signOut()

  return Response.json({ success: true })
}
