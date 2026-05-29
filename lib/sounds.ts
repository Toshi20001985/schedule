export type SoundType = 'tap' | 'success' | 'delete' | 'pop'

const sounds: Record<SoundType, string> = {
  tap:     '/sounds/tap.mp3',
  success: '/sounds/success.mp3',
  delete:  '/sounds/delete.mp3',
  pop:     '/sounds/pop.mp3',
}

const audioCache: Partial<Record<SoundType, HTMLAudioElement>> = {}

export function playSound(type: SoundType, volume = 0.15) {
  if (typeof window === 'undefined') return
  // デフォルト OFF — ユーザーが明示的に有効化した時のみ鳴らす
  if (localStorage.getItem('sound_enabled') !== 'true') return

  try {
    if (!audioCache[type]) {
      audioCache[type] = new Audio(sounds[type])
    }
    const audio = audioCache[type]!
    audio.volume = volume
    audio.currentTime = 0
    audio.play().catch(() => {})
  } catch {
    // 失敗しても無視
  }
}
