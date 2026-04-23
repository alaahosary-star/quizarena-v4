'use client';

import { useEffect } from 'react';
import { sfx } from '@/lib/sound/engine';

interface FeedbackCardProps {
  isCorrect: boolean;
  pointsEarned: number;
  speedBonus: number;
  explanation?: string;
  totalScore: number;
  rank?: number;
  onDismiss?: () => void;
}

export function FeedbackCard({
  isCorrect,
  pointsEarned,
  speedBonus,
  explanation,
  totalScore,
  rank,
  onDismiss,
}: FeedbackCardProps) {
  useEffect(() => {
    if (isCorrect) sfx.correct();
    else sfx.wrong();
  }, [isCorrect]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        padding: '32px 24px',
        borderRadius: 24,
        background: isCorrect
          ? 'linear-gradient(135deg, rgba(0,230,118,.18), rgba(0,200,83,.08))'
          : 'linear-gradient(135deg, rgba(255,23,68,.18), rgba(255,51,102,.08))',
        border: `2px solid ${isCorrect ? 'var(--green)' : 'var(--danger)'}`,
        textAlign: 'center',
        animation: 'popIn .4s cubic-bezier(.34,1.56,.64,1)',
        width: '100%',
      }}
    >
      {/* Big emoji */}
      <div style={{ fontSize: 72, lineHeight: 1, animation: 'bounce .6s ease' }}>
        {isCorrect ? '🎉' : '😞'}
      </div>

      {/* Result label */}
      <div
        style={{
          fontFamily: 'var(--font-cairo)',
          fontWeight: 900,
          fontSize: 28,
          color: isCorrect ? 'var(--green)' : 'var(--danger)',
        }}
      >
        {isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة'}
      </div>

      {/* Points */}
      {isCorrect && pointsEarned > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontWeight: 900,
              fontSize: 48,
              color: 'var(--yellow)',
              textShadow: '0 0 30px rgba(255,215,0,.5)',
              animation: 'countUp .5s ease',
            }}
          >
            +{pointsEarned.toLocaleString('ar-EG')}
          </div>
          {speedBonus > 0 && (
            <div
              style={{
                padding: '4px 14px',
                borderRadius: 999,
                background: 'rgba(255,215,0,.15)',
                border: '1px solid rgba(255,215,0,.3)',
                fontSize: 13,
                color: 'var(--yellow)',
                fontFamily: 'var(--font-cairo)',
                fontWeight: 700,
              }}
            >
              ⚡ مكافأة السرعة +{speedBonus}
            </div>
          )}
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 14,
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.1)',
            fontSize: 14,
            fontFamily: 'var(--font-tajawal)',
            color: 'var(--muted)',
            lineHeight: 1.7,
          }}
        >
          💡 {explanation}
        </div>
      )}

      {/* Score + Rank */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <ScorePill label="مجموع نقاطك" value={totalScore.toLocaleString('ar-EG')} color="var(--yellow)" />
        {rank && <ScorePill label="ترتيبك" value={`#${rank}`} color="var(--blue)" />}
      </div>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            padding: '10px 28px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg-2)',
            color: 'var(--muted)',
            fontFamily: 'var(--font-cairo)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          في انتظار السؤال التالي...
        </button>
      )}

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          40%       { transform: translateY(-16px); }
          60%       { transform: translateY(-8px); }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(12px) scale(.8); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

function ScorePill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '10px 20px',
        borderRadius: 14,
        background: `${color}15`,
        border: `1px solid ${color}40`,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: 'var(--font-space-grotesk)' }}>
        {value}
      </div>
    </div>
  );
}
