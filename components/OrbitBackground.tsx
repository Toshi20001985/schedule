'use client';

import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';

interface OrbitBackgroundProps {
  placesVisited: number;
  daysTogether: number;
  width?: number;
  height?: number;
}

export function OrbitBackground({
  placesVisited,
  width = 380,
  height = 280,
}: OrbitBackgroundProps) {
  const reducedMotion = useReducedMotion();
  const centerX = width / 2;
  const centerY = height / 2;

  const ringCount = useMemo(() => {
    if (placesVisited < 5) return 1;
    if (placesVisited < 15) return 2;
    if (placesVisited < 30) return 3;
    return 4;
  }, [placesVisited]);

  const ringRadii = useMemo(() => {
    const base = Math.min(width, height) * 0.18;
    return [base, base * 1.55, base * 2.2, base * 2.8].slice(0, ringCount);
  }, [width, height, ringCount]);

  const ringDurations = [60, 90, 120, 160];
  const ringDirections = [1, -1, 1, -1];

  const totalSatellites = Math.max(8, Math.min(placesVisited * 2, 40));

  const satellitesPerRing = useMemo(() => {
    const ratios = [1, 1.5, 2, 2.5].slice(0, ringCount);
    const sum = ratios.reduce((a, b) => a + b, 0);
    return ratios.map(r => Math.max(3, Math.round((r / sum) * totalSatellites)));
  }, [ringCount, totalSatellites]);

  function getSatellitePositions(ringIdx: number, count: number, radius: number) {
    const positions = [];
    const baseAngle = (ringIdx * 0.7) % (Math.PI * 2);
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i / count) * Math.PI * 2;
      const jitter = ((i + ringIdx) * 7.3) % 0.4 - 0.2;
      const finalAngle = angle + jitter;
      positions.push({
        x: centerX + Math.cos(finalAngle) * radius,
        y: centerY + Math.sin(finalAngle) * radius,
        color: (i + ringIdx) % 2 === 0 ? '#7BB4FF' : '#FF9FB8',
        size: 1.8 + ((i * 0.7) % 1.2),
      });
    }
    return positions;
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {/* Orbit rings */}
      <g opacity="0.12">
        {ringRadii.map((radius, i) => (
          <circle
            key={i}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#FAFAF7"
            strokeWidth="0.4"
          />
        ))}
      </g>

      {/* Satellites per orbit */}
      {ringRadii.map((radius, ringIdx) => {
        const satellites = getSatellitePositions(ringIdx, satellitesPerRing[ringIdx], radius);
        const duration = ringDurations[ringIdx];
        const direction = ringDirections[ringIdx];
        const fromAngle = direction > 0 ? 0 : 360;
        const toAngle = direction > 0 ? 360 : 0;
        const opacity = 0.7 - ringIdx * 0.05;

        return (
          <g key={ringIdx} opacity={opacity}>
            {!reducedMotion && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`${fromAngle} ${centerX} ${centerY}`}
                to={`${toAngle} ${centerX} ${centerY}`}
                dur={`${duration}s`}
                repeatCount="indefinite"
              />
            )}
            {satellites.map((sat, i) => (
              <circle key={i} cx={sat.x} cy={sat.y} r={sat.size} fill={sat.color} />
            ))}
          </g>
        );
      })}

      {/* Central pulse */}
      <g opacity={reducedMotion ? 0.5 : undefined}>
        {!reducedMotion && (
          <animate attributeName="opacity" values="0.5;1;0.5" dur="4s" repeatCount="indefinite" />
        )}
        <circle cx={centerX} cy={centerY} r="8" fill="none" stroke="#FAFAF7" strokeWidth="0.4" opacity="0.5" />
        <circle cx={centerX} cy={centerY} r="3.5" fill="#FAFAF7" />
      </g>
    </svg>
  );
}
