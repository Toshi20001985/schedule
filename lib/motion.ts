import type { Transition } from 'framer-motion';

/**
 * Apple ライクなスプリング設定プリセット
 */
export const springs = {
  // 標準：ほぼすべての UI 要素に
  default: {
    type: 'spring',
    damping: 25,
    stiffness: 350,
    mass: 0.5,
  } as Transition,

  // 柔らかい：シート、モーダル、大きな要素
  gentle: {
    type: 'spring',
    damping: 30,
    stiffness: 280,
    mass: 0.8,
  } as Transition,

  // キビキビ：ボタン、トグル、小さな要素
  snappy: {
    type: 'spring',
    damping: 22,
    stiffness: 450,
    mass: 0.4,
  } as Transition,

  // バウンス：注目を引きたい時（記念日、成功演出）
  bouncy: {
    type: 'spring',
    damping: 15,
    stiffness: 350,
    mass: 0.6,
  } as Transition,

  // ゆったり：ヒーロー、ローディング
  slow: {
    type: 'spring',
    damping: 35,
    stiffness: 200,
    mass: 1,
  } as Transition,
} as const;

/**
 * 標準イージング
 */
export const eases = {
  smooth: [0.4, 0, 0.2, 1] as const,
  out:    [0.16, 1, 0.3, 1] as const,
  in:     [0.4, 0, 1, 1] as const,
};

/**
 * 標準デュレーション（秒）
 */
export const durations = {
  instant: 0.08,
  fast:    0.16,
  normal:  0.24,
  slow:    0.4,
  slower:  0.6,
};
