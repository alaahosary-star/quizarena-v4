'use client';

import type { TimerPhase } from '@/hooks/useTimer';

interface TimerRingProps {
  left: number;
  percent: number;
  phase: TimerPhase;
  size?: number;
}

/**
 * عدّاد دائري SVG — يتغيّر لونه حسب المرحلة
 * ok = أخضر / warning = أصفر / danger = وردي مع نبض
 */
export function TimerRing({ left, percent, phase, size = 120 }: TimerRingProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent);

  const stroke =
    phase === 'danger' ? 'var(--pink)' : phase === 'warning' ? 'var(--yellow)' : 'var(--green)';

  return (
    <div
      className={phase === 'danger' ? 'animate-pulse-ring' : ''}
      style={{ width: size, height: size, position: 'relative', margin: '0 auto' }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke .3s' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--font-grotesk)',
          fontSize: size * 0.33,
          fontWeight: 700,
          color: phase === 'danger' ? 'var(--pink)' : 'var(--text)',
          animation: phase === 'danger' ? 'blink .5s infinite' : undefined,
        }}
      >
        {left}
      </div>
    </div>
  );
}
