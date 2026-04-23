'use client';

import type { Choice } from '@/lib/supabase/types';
import { ARABIC_LETTERS } from '@/lib/utils';

interface AnswerGridProps {
  choices: Choice[];
  selectedId: string | null;
  correctId: string | null;      // revealed after answering
  revealed: boolean;             // show correct/wrong state
  disabled: boolean;
  onSelect: (choiceId: string) => void;
}

const COLORS = [
  { bg: '#FF3366', shadow: 'rgba(255,51,102,.45)' },
  { bg: '#3D5AFE', shadow: 'rgba(61,90,254,.45)' },
  { bg: '#FFD700', shadow: 'rgba(255,215,0,.45)' },
  { bg: '#00C853', shadow: 'rgba(0,200,83,.45)' },
];

export function AnswerGrid({ choices, selectedId, correctId, revealed, disabled, onSelect }: AnswerGridProps) {
  const isTrueFalse = choices.length === 2;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isTrueFalse ? '1fr 1fr' : 'repeat(2, 1fr)',
        gap: 12,
        width: '100%',
      }}
    >
      {choices.map((choice, i) => {
        const color = COLORS[i % COLORS.length];
        const isSelected = selectedId === choice.id;
        const isCorrect = correctId === choice.id;

        let borderColor = 'transparent';
        let opacity = 1;
        let scale = 1;
        let glowFilter = 'none';

        if (revealed) {
          if (isCorrect) {
            borderColor = 'var(--green)';
            glowFilter = '0 0 20px rgba(0,230,118,.5)';
          } else if (isSelected && !isCorrect) {
            borderColor = 'var(--danger)';
            opacity = 0.6;
          } else if (!isSelected) {
            opacity = 0.35;
          }
        } else if (isSelected) {
          scale = 0.97;
          borderColor = '#fff';
        }

        return (
          <button
            key={choice.id}
            onClick={() => !disabled && onSelect(choice.id)}
            disabled={disabled}
            style={{
              position: 'relative',
              padding: isTrueFalse ? '28px 16px' : '22px 16px',
              borderRadius: 18,
              background: color.bg,
              border: `3px solid ${borderColor}`,
              boxShadow: revealed && isCorrect
                ? glowFilter
                : isSelected
                ? `0 0 0 3px #fff4, 0 8px 24px ${color.shadow}`
                : `0 8px 24px ${color.shadow}`,
              color: '#fff',
              cursor: disabled ? 'default' : 'pointer',
              opacity,
              transform: `scale(${scale})`,
              transition: 'all .2s cubic-bezier(.34,1.56,.64,1)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: isTrueFalse ? 110 : 90,
            }}
          >
            {/* Letter badge */}
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'rgba(0,0,0,.2)',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--font-space-grotesk)',
                fontWeight: 900,
                fontSize: 15,
                flexShrink: 0,
              }}
            >
              {isTrueFalse ? (i === 0 ? '✓' : '✗') : ARABIC_LETTERS[i]}
            </span>

            {/* Choice text */}
            <span
              style={{
                fontFamily: 'var(--font-cairo)',
                fontWeight: 700,
                fontSize: isTrueFalse ? 20 : 15,
                lineHeight: 1.4,
              }}
            >
              {choice.choice_text}
            </span>

            {/* Revealed indicator */}
            {revealed && isCorrect && (
              <span style={{ fontSize: 22, position: 'absolute', top: 10, left: 12 }}>✅</span>
            )}
            {revealed && isSelected && !isCorrect && (
              <span style={{ fontSize: 22, position: 'absolute', top: 10, left: 12 }}>❌</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
