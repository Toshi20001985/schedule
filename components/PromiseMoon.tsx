'use client';

import { useReducedMotion } from 'framer-motion';
import { getMoonPhase, getMoonPhaseLabel, type MoonPhase } from '@/lib/moonPhase';

interface PromiseMoonProps {
  daysLeft: number;
  size?: number;
}

export function PromiseMoon({ daysLeft, size = 28 }: PromiseMoonProps) {
  const reducedMotion = useReducedMotion();
  const phase = getMoonPhase(daysLeft);
  const isFull = phase === 'full';
  const radius = size / 2;

  const daysLabel = daysLeft === 0
    ? 'today'
    : daysLeft > 0
      ? `${daysLeft} days until next layover`
      : `${Math.abs(daysLeft)} days since last layover`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      // overflow visible lets the full-moon halo extend beyond the SVG element;
      // the hero card's overflow:hidden keeps it contained within the card
      overflow="visible"
      role="img"
      aria-label={`${getMoonPhaseLabel(phase)} — ${daysLabel}`}
    >
      <defs>
        <clipPath id="moon-clip">
          <circle cx={radius} cy={radius} r={radius} />
        </clipPath>
      </defs>

      {/* Full moon halo (two concentric glows) */}
      {isFull && (
        <>
          <circle cx={radius} cy={radius} r={radius * 2.2} fill="#FAFAF7" opacity="0.08">
            {!reducedMotion && (
              <animate
                attributeName="opacity"
                values="0.05;0.13;0.05"
                dur="3s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          <circle cx={radius} cy={radius} r={radius * 1.5} fill="#FAFAF7" opacity="0.16" />
        </>
      )}

      {/* Moon body — dark base */}
      <circle
        cx={radius}
        cy={radius}
        r={radius}
        fill="#FAFAF7"
        opacity={isFull ? 0.95 : 0.12}
      />

      {/* Outline ring for non-full phases */}
      {!isFull && (
        <circle
          cx={radius}
          cy={radius}
          r={radius}
          fill="none"
          stroke="#FAFAF7"
          strokeWidth="0.5"
          opacity="0.4"
        />
      )}

      {/* Lit portion, clipped to the moon circle */}
      <g clipPath="url(#moon-clip)">
        <MoonLight phase={phase} radius={radius} />
      </g>
    </svg>
  );
}

function MoonLight({ phase, radius }: { phase: MoonPhase; radius: number }) {
  const size = radius * 2;
  const lit = 0.85;

  switch (phase) {
    case 'new':
      return null;

    case 'waxing_crescent':
      // 細い右側三日月
      return (
        <ellipse cx={radius + radius * 0.5} cy={radius} rx={radius * 0.4} ry={radius} fill="#FAFAF7" opacity={lit} />
      );

    case 'first_quarter':
      // 右半分
      return <rect x={radius} y={0} width={radius} height={size} fill="#FAFAF7" opacity={lit} />;

    case 'waxing_gibbous':
      // 右半分 + 左の丸み
      return (
        <>
          <rect x={radius} y={0} width={radius} height={size} fill="#FAFAF7" opacity={lit} />
          <ellipse cx={radius - radius * 0.5} cy={radius} rx={radius * 0.5} ry={radius} fill="#FAFAF7" opacity={lit} />
        </>
      );

    case 'full':
      // 本体が既に明るいので追加描画不要
      return null;

    case 'waning_gibbous':
      // 左半分 + 右の丸み
      return (
        <>
          <rect x={0} y={0} width={radius} height={size} fill="#FAFAF7" opacity={lit} />
          <ellipse cx={radius + radius * 0.5} cy={radius} rx={radius * 0.5} ry={radius} fill="#FAFAF7" opacity={lit} />
        </>
      );

    case 'last_quarter':
      // 左半分
      return <rect x={0} y={0} width={radius} height={size} fill="#FAFAF7" opacity={lit} />;

    case 'waning_crescent':
      // 細い左側三日月
      return (
        <ellipse cx={radius - radius * 0.5} cy={radius} rx={radius * 0.4} ry={radius} fill="#FAFAF7" opacity={lit} />
      );
  }
}
