export type HapticType =
  | 'selection'  // タブ切替など最も軽いフィードバック
  | 'light'      // 通常のボタンタップ
  | 'medium'     // FAB・ドラッグ開始など
  | 'heavy'      // 重要な操作
  | 'success'    // 完了・保存
  | 'warning'    // 削除確認など
  | 'error'      // エラー発生
  | 'soft'       // トグルOFF・月フェーズ変化など
  | 'rigid'      // 長押し開始

export function haptic(type: HapticType = 'light') {
  if (typeof window === 'undefined') return
  if (!('vibrate' in navigator)) return
  if (localStorage.getItem('haptics_enabled') === 'false') return

  const patterns: Record<HapticType, number | number[]> = {
    selection: 5,
    light:     10,
    medium:    20,
    heavy:     30,
    success:   [10, 30, 10],
    warning:   [20, 80, 20],
    error:     [30, 50, 30, 50, 30],
    soft:      8,
    rigid:     15,
  }

  try {
    navigator.vibrate(patterns[type])
  } catch {
    // 振動非対応の端末では無視
  }
}
