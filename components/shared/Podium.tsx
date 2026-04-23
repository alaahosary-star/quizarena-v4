'use client';

import { useEffect } from 'react';
import type { Participant } from '@/lib/supabase/types';
import { launchConfetti } from '@/lib/utils';
import { sfx } from '@/lib/sound/engine';

interface PodiumProps {
  top3: Participant[]; // already sorted: [1st, 2nd, 3rd]
  celebrate?: boolean;
}

/**
 * منصة الفائزين Top 3 مع confetti + صوت نصر
 * الترتيب البصري: 2nd - 1st - 3rd (1 في المنتصف أعلى)
 */
export function Podium({ top3, celebrate = true }: PodiumProps) {
  useEffect(() => {
    if (!celebrate) return;
    const t1 = setTimeout(() => sfx.winner(), 400);
    const t2 = setTimeout(() => launchConfetti(120), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [celebrate]);

  if (top3.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
        لم يُسجَّل أي متسابق
      </div>
    );
  }

  // Visual order: 2nd, 1st, 3rd
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  const cols = [
    second && { rank: 2, p: second, medal: '🥈', color: '#C0C0C0', height: 230, delay: 0.2 },
    first && { rank: 1, p: first, medal: '🥇', color: 'var(--yellow)', height: 280, delay: 0.4 },
    third && { rank: 3, p: third, medal: '🥉', color: '#CD7F32', height: 190, delay: 0 },
  ].filter(Boolean) as {
    rank: number;
    p: Participant;
    medal: string;
    color: string;
    height: number;
    delay: number;
  }[];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: cols.length === 3 ? '1fr 1.2fr 1fr' : `repeat(${cols.length}, 1fr)`,
        gap: 12,
        alignItems: 'end',
        marginBottom: 32,
        minHeight: 300,
        maxWidth: 600,
        margin: '0 auto 32px',
      }}
    >
      {cols.map(({ rank, p, medal, color, height, delay }) => {
        const gradient =
          rank === 1
            ? 'linear-gradient(180deg, rgba(255,215,0,.25), rgba(255,143,0,.1))'
            : rank === 2
            ? 'linear-gradient(180deg, rgba(192,192,192,.2), rgba(192,192,192,.05))'
            : 'linear-gradient(180deg, rgba(205,127,50,.2), rgba(205,127,50,.05))';
        return (
          <div
            key={rank}
            style={{
              background: gradient,
              border: `1px solid ${color}`,
              borderBottom: 0,
              borderRadius: '16px 16px 0 0',
              padding: '20px 14px',
              textAlign: 'center',
              height,
              animation: `riseUp .8s cubic-bezier(.34,1.56,.64,1) ${delay}s both`,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 10 }}>{medal}</div>
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: '50%',
                margin: '0 auto 10px',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                color: '#fff',
                fontSize: 24,
                fontFamily: 'var(--font-cairo)',
                background: p.avatar_color,
                border: '3px solid var(--text)',
              }}
            >
              {p.avatar_emoji || p.display_name.charAt(0)}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-cairo)',
                fontWeight: 900,
                fontSize: 17,
                marginBottom: 4,
              }}
            >
              {p.display_name}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-grotesk)',
                fontSize: 24,
                fontWeight: 700,
                color,
              }}
            >
              {p.total_score.toLocaleString('ar-EG')}
            </div>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes riseUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
