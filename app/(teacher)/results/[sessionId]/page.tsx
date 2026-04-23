'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import { Leaderboard } from '@/components/shared/Leaderboard';
import { Podium } from '@/components/shared/Podium';
import { createClient } from '@/lib/supabase/client';
import { launchConfetti } from '@/lib/utils';
import type { Participant, Question } from '@/lib/supabase/types';

interface QuestionStat {
  question: Question;
  totalAnswers: number;
  correctAnswers: number;
  avgTimeMs: number;
  accuracy: number;
}

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);
  const [activityTitle, setActivityTitle] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'questions'>('leaderboard');

  useEffect(() => {
    const load = async () => {
      // Session + activity
      const { data: session } = await supabase
        .from('live_sessions')
        .select('*, activities(title)')
        .eq('id', sessionId)
        .single();

      if (!session) { router.push('/dashboard'); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setActivityTitle((session as any).activities?.title ?? 'جلسة');
      setSessionCode(session.session_code);

      // Participants sorted by score
      const { data: parts } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('total_score', { ascending: false });
      if (parts) setParticipants(parts as Participant[]);

      // Questions + answers stats
      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('activity_id', session.activity_id)
        .order('order_index');

      if (qs) {
        const stats: QuestionStat[] = await Promise.all(
          qs.map(async (q) => {
            const { data: answers } = await supabase
              .from('answers')
              .select('is_correct, time_taken_ms')
              .eq('session_id', sessionId)
              .eq('question_id', q.id);

            const total = answers?.length ?? 0;
            const correct = answers?.filter(a => a.is_correct).length ?? 0;
            const avgTime = total > 0
              ? Math.round(answers!.reduce((s, a) => s + a.time_taken_ms, 0) / total)
              : 0;

            return {
              question: q as Question,
              totalAnswers: total,
              correctAnswers: correct,
              avgTimeMs: avgTime,
              accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
            };
          })
        );
        setQuestionStats(stats);
      }

      setLoading(false);
      launchConfetti(60);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12, animation: 'spin 1s linear infinite' }}>📊</div>
        <p style={{ fontFamily: 'var(--font-cairo)' }}>جاري تحميل النتائج...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const top3 = participants.slice(0, 3);
  const totalParticipants = participants.length;
  const avgScore = totalParticipants > 0
    ? Math.round(participants.reduce((s, p) => s + p.total_score, 0) / totalParticipants)
    : 0;
  const avgAccuracy = questionStats.length > 0
    ? Math.round(questionStats.reduce((s, q) => s + q.accuracy, 0) / questionStats.length)
    : 0;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(124,77,255,.15), transparent)',
        borderBottom: '1px solid var(--border)',
        padding: '32px 28px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-cairo)', marginBottom: 8 }}>
          نتائج جلسة <span style={{ color: 'var(--pink)', fontFamily: 'var(--font-space-grotesk)', fontWeight: 900 }}>{sessionCode}</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-cairo)', fontSize: 28, margin: '0 0 24px' }}>{activityTitle}</h1>

        {/* Summary stats */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <SummaryCard icon="👥" label="المشاركون" value={String(totalParticipants)} color="var(--blue)" />
          <SummaryCard icon="⭐" label="متوسط النقاط" value={avgScore.toLocaleString('ar-EG')} color="var(--yellow)" />
          <SummaryCard icon="✅" label="نسبة الإجابات الصحيحة" value={`${avgAccuracy}%`} color="var(--green)" />
          <SummaryCard icon="❓" label="عدد الأسئلة" value={String(questionStats.length)} color="var(--purple)" />
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Podium */}
        {top3.length > 0 && <Podium top3={top3} celebrate={false} />}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28, background: 'var(--bg-2)', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
          {(['leaderboard', 'questions'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '14px 20px', background: 'transparent', border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--pink)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--text)' : 'var(--muted)',
              fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>
              {tab === 'leaderboard' ? `🏆 ترتيب الطلاب (${totalParticipants})` : `📊 تحليل الأسئلة (${questionStats.length})`}
            </button>
          ))}
        </div>

        {/* Leaderboard tab */}
        {activeTab === 'leaderboard' && (
          <Leaderboard participants={participants} showTime />
        )}

        {/* Questions tab */}
        {activeTab === 'questions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {questionStats.map((qs, i) => (
              <QuestionStatCard key={qs.question.id} stat={qs} index={i} />
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
          <Link href="/dashboard" className="btn-ghost" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', minWidth: 160 }}>
            ← لوحة التحكم
          </Link>
          <button
            className="btn-primary"
            style={{ flex: 1, minWidth: 160 }}
            onClick={() => router.push(`/builder/${sessionId}`)}
          >
            🔁 تشغيل مرة أخرى
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
function SummaryCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '16px 24px', borderRadius: 16,
      background: `${color}12`, border: `1px solid ${color}35`,
      textAlign: 'center', minWidth: 130,
    }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 26, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-cairo)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function QuestionStatCard({ stat, index }: { stat: QuestionStat; index: number }) {
  const accuracy = stat.accuracy;
  const barColor = accuracy >= 70 ? 'var(--green)' : accuracy >= 40 ? 'var(--yellow)' : 'var(--danger)';

  return (
    <div className="card-panel" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
        {/* Number badge */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'conic-gradient(from 45deg, var(--pink), var(--yellow), var(--green), var(--blue), var(--pink))',
          display: 'grid', placeItems: 'center',
          fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 16, color: '#0B0B1E',
        }}>
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'var(--font-tajawal)', fontSize: 15, color: 'var(--text)', margin: '0 0 10px', lineHeight: 1.5 }}>
            {stat.question.question_text}
          </p>
          {/* Accuracy bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>
                {stat.correctAnswers} من {stat.totalAnswers} إجابة صحيحة
              </span>
              <span style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 18, color: barColor }}>
                {accuracy}%
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${accuracy}%`,
                background: barColor, borderRadius: 4,
                transition: 'width 1s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Mini stats row */}
      <div style={{ display: 'flex', gap: 12 }}>
        <MiniStat label="وقت متوسط" value={`${(stat.avgTimeMs / 1000).toFixed(1)}s`} />
        <MiniStat label="أجاب" value={String(stat.totalAnswers)} />
        <MiniStat label="النقاط" value={String(stat.question.points)} color="var(--yellow)" />
        <MiniStat label="الوقت" value={`${stat.question.time_limit}s`} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color = 'var(--text)' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      flex: 1, padding: '8px 10px', borderRadius: 10,
      background: 'var(--bg-2)', border: '1px solid var(--border)', textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 700, fontSize: 16, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-cairo)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
