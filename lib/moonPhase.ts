export type MoonPhase =
  | 'new'             // 🌑 新月 (28+ days)
  | 'waxing_crescent' // 🌒 三日月 (21-27 days)
  | 'first_quarter'   // 🌓 上弦の月 (14-20 days)
  | 'waxing_gibbous'  // 🌔 十三夜 (7-13 days)
  | 'full'            // 🌕 満月 (0-6 days — 再会の時)
  | 'waning_gibbous'  // 🌖 帰った後 1-7 日
  | 'last_quarter'    // 🌗 帰った後 8-14 日
  | 'waning_crescent';// 🌘 帰った後 15+ 日

/**
 * 再会までの日数からムーンフェーズを計算
 * @param daysLeft 再会までの日数（負数なら過ぎた日数）
 */
export function getMoonPhase(daysLeft: number): MoonPhase {
  if (daysLeft >= 28) return 'new';
  if (daysLeft >= 21) return 'waxing_crescent';
  if (daysLeft >= 14) return 'first_quarter';
  if (daysLeft >= 7)  return 'waxing_gibbous';
  if (daysLeft >= 0)  return 'full';
  if (daysLeft >= -7) return 'waning_gibbous';
  if (daysLeft >= -14) return 'last_quarter';
  return 'waning_crescent';
}

/** フェーズの英語表示名（aria-label 用） */
export function getMoonPhaseLabel(phase: MoonPhase): string {
  const labels: Record<MoonPhase, string> = {
    new:              'New Moon',
    waxing_crescent:  'Waxing Crescent',
    first_quarter:    'First Quarter',
    waxing_gibbous:   'Waxing Gibbous',
    full:             'Full Moon',
    waning_gibbous:   'Waning Gibbous',
    last_quarter:     'Last Quarter',
    waning_crescent:  'Waning Crescent',
  };
  return labels[phase];
}
