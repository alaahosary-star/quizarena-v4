'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import { createClient } from '@/lib/supabase/client';
import { formatSessionCode } from '@/lib/utils';
import type { Participant, Question } from '@/lib/supabase/types';

interface HomeworkSession {
  id: string;
  session_code: string;
  starts_at: string;
  ends_at: string;
  activity_id: string;
  qr_url: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activities: any;
}

interface SubmissionDetail {
  participant: Participant;
  answeredCount: number;
  correctCount: number;
  totalScore: number;
  accuracy: number;
  avgTimeMs: number;
  completedAt: string | null;
  isComplete: boolean;
}

export default function HomeworkMonitorPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [session, setSession] = useState<HomeworkSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'submissions' | 'questions'>('submissions');
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: sess } = await supabase
        .from('live_sessions')
        .select('*, activities(title, subject, grade)')
        .eq('id', sessionId)
        .single();

      if (!sess) { router.push('/dashboard'); return; }
      setSession(sess as HomeworkSession);

      // Questions
      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('activity_id', sess.activity_id)
        .order('order_index');
      if (qs) setQuestions(qs as Question[]);

      // Participants + their answers
      const { data: parts } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('total_score', { ascending: false });

      if (parts && qs) {
        const details: SubmissionDetail[] = await Promise.all(
          (parts as Participant[]).map(async (p) => {
            const { data: answers } = await supabase
              .from('answers')
              .select('is_correct, time_taken_ms, answered_at')
              .eq('participant_id', p.id)
              .eq('session_id', sessionId);

            const answered = answers?.length ?? 0;
            const correct = answers?.filter(a => a.is_correct).length ?? 0;
            const avgTime = answered > 0
              ? Math.round(answers!.reduce((s, a) => s + a.time_taken_ms, 0) / answered)
              : 0;
            const lastAnswer = answers?.sort((a, b) => new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime())[0];

            return {
              participant: p,
              answeredCount: answered,
              correctCount: correct,
              totalScore: p.total_score,
              accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
              avgTimeMs: avgTime,
              completedAt: answered >= qs.length ? (lastAnswer?.answered_at ?? null) : null,
              isComplete: answered >= qs.length,
            };
          })
        );
        setSubmissions(details);
      }

      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Countdown timer
  useEffect(() => {
    if (!session?.ends_at) return;
    const update = () => {
      const diff = new Date(session.ends_at).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('انتهى الوقت'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [session?.ends_at]);

  // Realtime subscription for new participants
  useEffect(() => {
    const ch = supabase
      .channel(`homework:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` },
        () => window.location.reload()
      )
      .subscribe();
    return () => { ch.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, animation: 'spin 1s linear infinite', marginBottom: 12 }}>📊</div>
        <p style={{ fontFamily: 'var(--font-cairo)' }}>جاري التحميل...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!session) return null;

  const config = (() => { try { return JSON.parse(session.qr_url ?? '{}'); } catch { return {}; } })();
  const actTitle = config.title_override || session.activities?.title || 'واجب';
  const isExpired = new Date(session.ends_at) <= new Date();
  const completedCount = submissions.filter(s => s.isComplete).length;
  const totalCount = submissions.length;
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/homework/${sessionId}` : '';

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '24px 28px', background: 'rgba(124,77,255,.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
            <Link href="/dashboard" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 20, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>←</Link>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--purple)', fontFamily: 'var(--font-cairo)', marginBottom: 4 }}>📚 واجب منزلي</div>
              <h1 style={{ fontFamily: 'var(--font-cairo)', fontSize: 24, margin: '0 0 4px' }}>{actTitle}</h1>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-tajawal)' }}>
                {session.activities?.subject} · {session.activities?.grade}
              </div>
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 28, color: isExpired ? 'var(--danger)' : 'var(--green)' }}>
                {isExpired ? '⏰ منتهي' : timeLeft}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>
                ينتهي {new Date(session.ends_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <StatPill icon="🔑" label="الكود" value={formatSessionCode(session.session_code)} color="var(--pink)" big />
            <StatPill icon="👥" label="شاركوا" value={String(totalCount)} color="var(--blue)" />
            <StatPill icon="✅" label="أكملوا" value={`${completedCount} / ${totalCount}`} color="var(--green)" />
            <StatPill icon="❓" label="الأسئلة" value={String(questions.length)} color="var(--yellow)" />
            <button
              onClick={() => navigator.clipboard.writeText(joinUrl)}
              style={{ padding: '8px 16px', borderRadius: 10, border: '1px dashed var(--border)', background: 'var(--bg-2)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-cairo)', fontSize: 12 }}
            >
              📋 نسخ رابط الطالب
            </button>
          </div>
        </div>
      </div>

      {/* Tabs + Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24, background: 'var(--bg-2)', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
          {(['submissions', 'questions'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '13px 20px', background: 'transparent', border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--purple)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--text)' : 'var(--muted)',
              fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>
              {tab === 'submissions' ? `📋 التسليمات (${totalCount})` : `📊 تحليل الأسئلة`}
            </button>
          ))}
        </div>

        {/* Submissions table */}
        {activeTab === 'submissions' && (
          submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <p style={{ fontFamily: 'var(--font-cairo)', fontSize: 16 }}>لم يبدأ أي طالب بعد</p>
              <p style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, marginTop: 8 }}>
                شارك الكود <strong style={{ color: 'var(--pink)' }}>{formatSessionCode(session.session_code)}</strong> مع طلابك
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {submissions.map((sub, i) => (
                <SubmissionRow key={sub.participant.id} sub={sub} rank={i + 1} totalQuestions={questions.length} />
              ))}
            </div>
          )
        )}

        {/* Questions analysis */}
        {activeTab === 'questions' && (
          <QuestionAnalysis questions={questions} sessionId={sessionId} />
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
function SubmissionRow({ sub, rank, totalQuestions }: { sub: SubmissionDetail; rank: number; totalQuestions: number }) {
  const progress = totalQuestions > 0 ? (sub.answeredCount / totalQuestions) * 100 : 0;
  const barColor = sub.isComplete ? 'var(--green)' : sub.answeredCount > 0 ? 'var(--blue)' : 'var(--border)';

  return (
    <div className="card-panel" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Rank */}
        <div style={{ width: 36, height: 36, borderRadius: 10, background: rank <= 3 ? 'var(--yellow)' : 'var(--bg-2)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 16, color: rank <= 3 ? '#0B0B1E' : 'var(--muted)', flexShrink: 0 }}>
          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
        </div>

        {/* Avatar */}
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: sub.participant.avatar_color, display: 'grid', placeItems: 'center', fontSize: 20, flexShrink: 0 }}>
          {sub.participant.avatar_emoji ?? sub.participant.display_name[0]}
        </div>

        {/* Name + progress */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              {sub.participant.display_name}
            </span>
            <span style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 18, color: 'var(--yellow)' }}>
              {sub.totalScore.toLocaleString('ar-EG')}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: barColor, borderRadius: 3, transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>
              {sub.answeredCount} / {totalQuestions} سؤال
            </span>
            <span style={{ fontSize: 11, color: sub.isComplete ? 'var(--green)' : 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>
              {sub.isComplete ? `✅ أكمل${sub.completedAt ? ' · ' + new Date(sub.completedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}` : sub.answeredCount > 0 ? '🔄 قيد الحل' : '⏳ لم يبدأ'}
            </span>
          </div>
        </div>

        {/* Mini stats */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <MiniStat label="دقة" value={`${sub.accuracy}%`} color={sub.accuracy >= 70 ? 'var(--green)' : sub.accuracy >= 40 ? 'var(--yellow)' : 'var(--danger)'} />
          <MiniStat label="متوسط" value={sub.avgTimeMs > 0 ? `${(sub.avgTimeMs / 1000).toFixed(1)}s` : '—'} />
        </div>
      </div>
    </div>
  );
}

function QuestionAnalysis({ questions, sessionId }: { questions: Question[]; sessionId: string }) {
  const supabase = createClient();
  const [stats, setStats] = useState<{ id: string; correct: number; total: number; avgMs: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const results = await Promise.all(questions.map(async q => {
        const { data } = await supabase
          .from('answers')
          .select('is_correct, time_taken_ms')
          .eq('session_id', sessionId)
          .eq('question_id', q.id);
        const total = data?.length ?? 0;
        const correct = data?.filter(a => a.is_correct).length ?? 0;
        const avgMs = total > 0 ? Math.round(data!.reduce((s, a) => s + a.time_taken_ms, 0) / total) : 0;
        return { id: q.id, correct, total, avgMs };
      }));
      setStats(results);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, sessionId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {questions.map((q, i) => {
        const st = stats.find(s => s.id === q.id);
        const accuracy = st && st.total > 0 ? Math.round((st.correct / st.total) * 100) : null;
        const barColor = accuracy === null ? 'var(--border)' : accuracy >= 70 ? 'var(--green)' : accuracy >= 40 ? 'var(--yellow)' : 'var(--danger)';
        return (
          <div key={q.id} className="card-panel" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--pink), var(--purple))', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 14, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'var(--font-tajawal)', fontSize: 14, color: 'var(--text)', margin: '0 0 10px', lineHeight: 1.5 }}>{q.question_text}</p>
                {st && st.total > 0 ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>{st.correct} صحيح من {st.total} إجابة</span>
                      <span style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 17, color: barColor }}>{accuracy}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${accuracy}%`, background: barColor, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--font-cairo)' }}>متوسط الوقت: {(st.avgMs / 1000).toFixed(1)}s</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>لا توجد إجابات بعد</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatPill({ icon, label, value, color, big }: { icon: string; label: string; value: string; color: string; big?: boolean }) {
  return (
    <div style={{ padding: '8px 16px', borderRadius: 12, background: `${color}12`, border: `1px solid ${color}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>{icon} {label}</div>
      <div style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: big ? 22 : 18, color }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, color = 'var(--text)' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 700, fontSize: 14, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>{label}</div>
    </div>
  );
}
