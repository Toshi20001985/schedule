'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/components/ToastProvider'

type ListTable = 'places' | 'media' | 'todos'

interface UseCollectionReturn<T extends { id: string }> {
  items: T[]
  setItems: React.Dispatch<React.SetStateAction<T[]>>
  addItem: (dbPayload: Record<string, unknown>, localItem: T) => Promise<void>
  updateItem: (id: string, updates: Record<string, unknown>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
}

/**
 * places / media / todos の CRUD を統一的に扱うカスタムフック。
 *
 * - addItem:    Supabase に insert。成功時は DB の id に差し替え、失敗・未設定時は
 *               localItem をそのままリストに追加してUIを維持する。
 * - updateItem: ローカル state を楽観的に更新してから Supabase に update。
 *               null 値は undefined に変換して TS の省略可能フィールドに合わせる。
 * - deleteItem: ローカル state から楽観的に削除してから Supabase に delete。
 * - setItems:   load() / Realtime ハンドラから直接 state を書き換えるために公開。
 *
 * ハプティックはこのフック内では発火しない。呼び出し側で制御すること。
 */
export function useCollection<T extends { id: string }>(
  table: ListTable,
  coupleId: string | null,
  myId: string | null,
): UseCollectionReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const { showToast } = useToast()

  /**
   * Supabase への insert + ローカル state 追加。
   * couple_id / added_by は自動付与するので dbPayload には含めなくてよい。
   */
  const addItem = useCallback(async (
    dbPayload: Record<string, unknown>,
    localItem: T,
  ) => {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && myId && coupleId) {
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      const { data, error } = await db
        .from(table)
        .insert({ ...dbPayload, couple_id: coupleId, added_by: myId })
        .select()
        .single()
      if (!error && data) {
        // 成功: DB の UUID を id として使う（Realtime の重複防止と整合）
        setItems(prev => [{ ...localItem, id: data.id as string } as T, ...prev])
        return
      }
      // Supabase エラー: ローカルに追加してUIを維持し、エラーを通知
      showToast('保存できませんでした', { variant: 'error' })
    }
    // Supabase 未設定 or エラー: temp id のローカルアイテムを追加してUIを維持
    setItems(prev => [localItem, ...prev])
  }, [table, coupleId, myId])

  /**
   * Supabase への update + ローカル state 楽観的更新。
   * DB では null を使うフィールドも、ローカルでは undefined に変換する。
   */
  const updateItem = useCallback(async (
    id: string,
    updates: Record<string, unknown>,
  ) => {
    const localUpdates = Object.fromEntries(
      Object.entries(updates).map(([k, v]) => [k, v === null ? undefined : v]),
    )
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...localUpdates } as T : item,
    ))
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      await db.from(table).update(updates).eq('id', id)
    }
  }, [table])

  /**
   * Supabase からの delete + ローカル state 楽観的削除。
   */
  const deleteItem = useCallback(async (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = await import('@/lib/supabase/client')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      await db.from(table).delete().eq('id', id)
    }
  }, [table])

  return { items, setItems, addItem, updateItem, deleteItem }
}
