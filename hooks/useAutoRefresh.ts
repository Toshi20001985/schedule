'use client'

import { useEffect, useRef } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * オンライン復帰時（offline → online の遷移）に load() を自動再実行するフック。
 *
 * 用途：オフライン中にパートナーが行った操作をオンライン復帰後に即座に反映する。
 * Realtime が途切れていた間の差分を load() で補完する。
 *
 * - 初回マウント時は呼ばない（mount 直後の load() は各ページの useEffect で行われる）
 * - false → true の変化のみ検知する（true → false は無視）
 */
export function useAutoRefresh(load: () => void) {
  const isOnline = useOnlineStatus()
  const prevOnlineRef = useRef(isOnline)

  useEffect(() => {
    if (isOnline && !prevOnlineRef.current) {
      load()
    }
    prevOnlineRef.current = isOnline
  }, [isOnline, load])
}
