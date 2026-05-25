import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  // デモ環境（Supabase 未設定）は非対応
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

  if (!userData?.couple_id) {
    return new Response('No couple found', { status: 404 })
  }

  const coupleId = userData.couple_id

  const [events, places, media, todos, flights, users, couple] = await Promise.all([
    db.from('events').select('*').eq('couple_id', coupleId),
    db.from('places').select('*').eq('couple_id', coupleId),
    db.from('media').select('*').eq('couple_id', coupleId),
    db.from('todos').select('*').eq('couple_id', coupleId),
    db.from('flights').select('*').eq('couple_id', coupleId),
    db.from('users').select('id, display_name, avatar_color').eq('couple_id', coupleId),
    db.from('couples').select('*').eq('id', coupleId).single(),
  ])

  const exportData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    couple: couple.data,
    users: users.data,
    events: events.data,
    places: places.data,
    media: media.data,
    todos: todos.data,
    flights: flights.data,
  }

  const json = JSON.stringify(exportData, null, 2)
  const filename = `layover-backup-${new Date().toISOString().split('T')[0]}.json`

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
