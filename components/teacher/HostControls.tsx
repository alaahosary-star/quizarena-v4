'use client';

import type { LiveSession, SessionStatus } from '@/lib/supabase/types';

interface HostControlsProps {
  session: LiveSession;
  currentQuestion: number;
  totalQuestions: number;
  timerRunning: boolean;
  timerLeft: number;
  onStart: () => void;
  onNext: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  loading?: boolean;
}

export function HostControls({
  session,
  currentQuestion,
  totalQuestions,
  timerRunning,
  timerLeft,
  onStart,
  onNext,
  onPause,
  onResume,
  onEnd,
  onStartTimer,
  onStopTimer,
  loading = false,
}: HostControlsProps) {
  const status: SessionStatus = session.status;
  const isWaiting = status === 'waiting';
  const isActive = status === 'active';
  const isPaused = status === 'paused';
  const isFinished = status === 'finished';
  const isLast = currentQuestion >= totalQuestions - 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ─── Status badge ─── */}
      <StatusBar status={status} currentQuestion={currentQuestion} totalQuestions={totalQuestions} />

      {/* ─── Primary action ─── */}
      {isWaiting && (
        <button
          className="btn-primary"
          style={{ padding: '18px 24px', fontSize: 17, letterSpacing: 0.5 }}
          onClick={onStart}
          disabled={loading}
        >
          🚀 بدء الجلسة
        </button>
      )}

      {isActive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Timer controls */}
          <div style={{ display: 'flex', gap: 10 }}>
            {!timerRunning ? (
              <button
                className="btn-primary"
                style={{ flex: 1, padding: '14px 20px', fontSize: 15 }}
                onClick={onStartTimer}
                disabled={loading}
              >
                ▶️ تشغيل العدّاد
              </button>
            ) : (
              <button
                className="btn-ghost"
                style={{
                  flex: 1, padding: '14px 20px', fontSize: 15,
                  borderColor: 'var(--yellow)',
                  color: 'var(--yellow)',
                }}
                onClick={onStopTimer}
                disabled={loading}
              >
                ⏸ إيقاف العدّاد
              </button>
            )}
          </div>

          {/* Next / Finish */}
          <button
            className="btn-primary"
            style={{
              padding: '14px 20px',
              fontSize: 15,
              background: isLast
                ? 'linear-gradient(135deg, var(--green), #00C853)'
                : 'linear-gradient(135deg, var(--pink), var(--pink-2))',
              boxShadow: isLast
                ? '0 8px 22px rgba(0,230,118,.4)'
                : '0 8px 22px rgba(255,51,102,.4)',
            }}
            onClick={isLast ? onEnd : onNext}
            disabled={loading}
          >
            {isLast ? '🏁 إنهاء الجلسة' : '⏭ السؤال التالي'}
          </button>

          {/* Pause */}
          <button
            className="btn-ghost"
            style={{ padding: '10px 20px', fontSize: 13 }}
            onClick={onPause}
            disabled={loading}
          >
            ⏸ إيقاف مؤقت للجلسة
          </button>
        </div>
      )}

      {isPaused && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,215,0,.1)', border: '1px solid rgba(255,215,0,.3)', textAlign: 'center', fontFamily: 'var(--font-cairo)', color: 'var(--yellow)', fontSize: 14 }}>
            ⏸ الجلسة موقوفة مؤقتًا
          </div>
          <button
            className="btn-primary"
            style={{ padding: '14px 20px', fontSize: 15 }}
            onClick={onResume}
            disabled={loading}
          >
            ▶️ استئناف الجلسة
          </button>
          <button
            className="btn-ghost"
            style={{ padding: '10px 20px', fontSize: 13, color: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={onEnd}
            disabled={loading}
          >
            🏁 إنهاء الجلسة
          </button>
        </div>
      )}

      {isFinished && (
        <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 4 }}>🏆</div>
          <h3 style={{ fontFamily: 'var(--font-cairo)', color: 'var(--yellow)', margin: 0 }}>
            انتهت الجلسة!
          </h3>
          <a
            href={`/results/${session.id}`}
            style={{
              padding: '12px 24px', borderRadius: 12,
              background: 'linear-gradient(135deg, var(--purple), var(--blue))',
              color: '#fff', textDecoration: 'none',
              fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 14,
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            📊 عرض التحليل الكامل
          </a>
        </div>
      )}

      {/* ─── Settings row ─── */}
      {(isActive || isPaused) && (
        <SessionSettings session={session} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────
function StatusBar({
  status,
  currentQuestion,
  totalQuestions,
}: {
  status: SessionStatus;
  currentQuestion: number;
  totalQuestions: number;
}) {
  const map: Record<SessionStatus, { label: string; color: string; bg: string }> = {
    waiting: { label: 'في الانتظار', color: 'var(--blue)', bg: 'rgba(61,90,254,.12)' },
    active: { label: 'جارٍ الآن', color: 'var(--green)', bg: 'rgba(0,230,118,.1)' },
    paused: { label: 'موقوف', color: 'var(--yellow)', bg: 'rgba(255,215,0,.1)' },
    finished: { label: 'منتهية', color: 'var(--muted)', bg: 'var(--bg-2)' },
  };
  const s = map[status];

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', borderRadius: 12, background: s.bg, border: `1px solid ${s.color}40`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: s.color,
          boxShadow: status === 'active' ? `0 0 8px ${s.color}` : 'none',
          animation: status === 'active' ? 'pulse 1.5s infinite' : 'none',
          display: 'inline-block',
        }} />
        <span style={{ color: s.color, fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 14 }}>
          {s.label}
        </span>
      </div>
      {totalQuestions > 0 && status !== 'waiting' && (
        <span style={{
          fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 14,
          color: 'var(--muted)',
        }}>
          {currentQuestion + 1} / {totalQuestions}
        </span>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────
function SessionSettings({ session }: { session: LiveSession }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-cairo)', fontWeight: 700, marginBottom: 4 }}>
        إعدادات الجلسة
      </div>
      <SettingRow label="🎵 الموسيقى" enabled={session.music_enabled} />
      <SettingRow label="🔊 المؤثرات الصوتية" enabled={session.sfx_enabled} />
      <SettingRow label="🏆 عرض المتصدرين" enabled={session.show_leaderboard} />
    </div>
  );
}

function SettingRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 12px', borderRadius: 8, background: 'var(--bg-2)',
      border: '1px solid var(--border)',
    }}>
      <span style={{ fontFamily: 'var(--font-cairo)', fontSize: 13, color: 'var(--text)' }}>{label}</span>
      <span style={{ fontSize: 12, color: enabled ? 'var(--green)' : 'var(--muted)' }}>
        {enabled ? '✅ مفعّل' : '⭕ معطّل'}
      </span>
    </div>
  );
}
