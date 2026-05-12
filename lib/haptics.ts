type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning'

export function haptic(type: HapticType = 'light') {
  if (typeof window === 'undefined') return
  if (!('vibrate' in navigator)) return
  if (localStorage.getItem('haptics_enabled') === 'false') return

  const patterns: Record<HapticType, number | number[]> = {
    light:   10,
    medium:  20,
    heavy:   30,
    success: [10, 50, 10],
    warning: [20, 100, 20],
  }

  try {
    navigator.vibrate(patterns[type])
  } catch {
    // 振動非対応の端末では無視
  }
}
