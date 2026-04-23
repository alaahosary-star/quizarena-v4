'use client';

import type { Participant } from '@/lib/supabase/types';
import { formatMs } from '@/lib/utils';

interface LeaderboardProps {
  participants: Participant[];
  highlightId?: string;
  showTime?: boolean;
  limit?: number;
}

/**
 * قائمة الترتيب اللحظي — مرتّبة حسب النقاط مع كسر التعادل بالزمن
 */
export function Leaderboard({
  participants,
  highlightId,
  showTime = true,
  limit,
}: LeaderboardProps) {
  const sorted = [...participants].sort((a, b) => {
    if (a.total_score !== b.total_score) return b.total_score - a.total_score;
    return a.avg_time_ms - b.avg_time_ms;
  });
  const shown = limit ? sorted.slice(0, limit) : sorted;

  if (shown.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: 'center',
          color: 'var(--muted)',
          fontFamily: 'var(--font-cairo)',
        }}
      >
        لا يوجد مشاركون بعد
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {shown.map((p, i) => {
        const rank = i + 1;
        const isMe = p.id === highlightId;
        return (
          <div
            key={p.id}
            style={{
              display: 'grid',
              gridTemplateColumns: showTime ? '50px 50px 1fr auto auto' : '50px 50px 1fr auto',
              gap: 14,
              alignItems: 'center',
              padding: '14px 18px',
              borderBottom: i < shown.length - 1 ? '1px solid var(--border)' : undefined,
              background: isMe ? 'rgba(255,51,102,.1)' : undefined,
              transition: 'background .25s',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-grotesk)',
                fontWeight: 700,
                fontSize: 18,
                color: rank <= 3 ? 'var(--yellow)' : 'var(--muted)',
                textAlign: 'center',
              }}
            >
              #{rank}
            </div>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: p.avatar_color,
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                color: '#fff',
                fontFamily: 'var(--font-cairo)',
                fontSize: 14,
              }}
            >
              {p.avatar_emoji || p.display_name.charAt(0)}
            </div>
            <div style={{ fontFamily: 'var(--font-cairo)', fontWeight: 700 }}>
              {p.display_name}
              {isMe && (
                <span style={{ color: 'var(--pink)', fontSize: 12, marginInlineStart: 8 }}>
                  (أنت)
                </span>
              )}
            </div>
            {showTime && p.avg_time_ms > 0 && (
              <div
                style={{
                  color: 'var(--muted)',
                  fontFamily: 'var(--font-grotesk)',
                  fontSize: 13,
                }}
              >
                {formatMs(p.avg_time_ms)}
              </div>
            )}
            <div
              style={{
                fontFamily: 'var(--font-grotesk)',
                fontWeight: 700,
                fontSize: 18,
                color: 'var(--yellow)',
              }}
            >
              {p.total_score.toLocaleString('ar-EG')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
