'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Table = 'events' | 'places' | 'media'

interface Options {
  table: Table
  coupleId: string | null
  myId: string | null
  onInsert: (record: Record<string, unknown>, isPartner: boolean) => void
  onUpdate: (record: Record<string, unknown>, isPartner: boolean) => void
  onDelete: (id: string) => void
}

/**
 * Supabase Realtime で指定テーブルの変更をサブスクライブする。
 * - coupleId が null の間は購読を開始しない
 * - コンポーネントアンマウント時にチャンネルをクリーンアップ
 * - myId でパートナーの変更かどうかを判定（isPartner）
 *
 * ⚠️ Supabase Realtime が動作するには Dashboard で
 *    Database → Replication → events / places / media テーブルを有効化が必要
 */
export function useRealtimeSync({
  table,
  coupleId,
  myId,
  onInsert,
  onUpdate,
  onDelete,
}: Options) {
  // コールバックを ref に持つことで useEffect の再登録を防ぐ
  const myIdRef    = useRef(myId)
  const insertRef  = useRef(onInsert)
  const updateRef  = useRef(onUpdate)
  const deleteRef  = useRef(onDelete)

  useEffect(() => { myIdRef.current   = myId     }, [myId])
  useEffect(() => { insertRef.current = onInsert }, [onInsert])
  useEffect(() => { updateRef.current = onUpdate }, [onUpdate])
  useEffect(() => { deleteRef.current = onDelete }, [onDelete])

  useEffect(() => {
    if (!coupleId || !process.env.NEXT_PUBLIC_SUPABASE_URL) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const channelName = `${table}:${coupleId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `couple_id=eq.${coupleId}` },
        (payload: {
          eventType: 'INSERT' | 'UPDATE' | 'DELETE'
          new: Record<string, unknown>
          old: Record<string, unknown>
        }) => {
          const newRec = payload.new ?? {}
          const oldRec = payload.old ?? {}

          // INSERT/UPDATE の作成者で判定（DELETE は old に id しかない場合が多い）
          const creatorId = (newRec.created_by ?? newRec.added_by) as string | undefined
          const isPartner = !!(myIdRef.current && creatorId && creatorId !== myIdRef.current)

          if (payload.eventType === 'INSERT') {
            insertRef.current(newRec, isPartner)
          } else if (payload.eventType === 'UPDATE') {
            updateRef.current(newRec, isPartner)
          } else if (payload.eventType === 'DELETE') {
            deleteRef.current((oldRec.id as string) ?? '')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, coupleId]) // coupleId が確定したら購読開始
}
