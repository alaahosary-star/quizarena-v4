'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLiveSession } from '@/hooks/useLiveSession';
import { useTimer } from '@/hooks/useTimer';
import { AnswerGrid } from '@/components/student/AnswerGrid';
import { FeedbackCard } from '@/components/student/FeedbackCard';
import { TimerRing } from '@/components/shared/TimerRing';
import { Leaderboard } from '@/components/shared/Leaderboard';
import { Podium } from '@/components/shared/Podium';
import { sfx } from '@/lib/sound/engine';
import { launchConfetti } from '@/lib/utils';
import type { Question, Choice, Participant } from '@/lib/supabase/types';

type PlayPhase = 'waiting' | 'question' | 'feedback' | 'leaderboard' | 'finished';

interface AnswerResult {
  isCorrect: boolean;
  pointsEarned: number;
  speedBonus: number;
  explanation?: string;
}

export default function PlayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const { session, participants, loading } = useLiveSession(sessionId);
  const [questions, setQuestions] = useState<(Question & { choices: Choice[] })[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [phase, setPhase] = useState<PlayPhase>('waiting');
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [correctChoiceId, setCorrectChoiceId] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [activityTitle, setActivityTitle] = useState('');

  // Track which question index we last processed
  const lastQuestionIndex = useRef(-1);

  const currentQ = questions[session?.current_question ?? 0];

  const timer = useTimer(currentQ?.time_limit ?? 30, () => {
    // Time's up — auto-submit no answer if not answered
    if (!hasAnswered && currentQ) {
      handleTimeUp();
    }
  });

  // ─── Load participant from localStorage ───
  useEffect(() => {
    const pid = localStorage.getItem(`participant_${sessionId}`);
    if (!pid) { router.replace(`/join?code=`); return; }

    const loadParticipant = async () => {
      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('id', pid)
        .single();
      if (data) {
        setParticipant(data as Participant);
        setMyScore(data.total_score);
      }
    };
    loadParticipant();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ─── Load questions ───
  useEffect(() => {
    if (!session?.activity_id) return;
    const load = async () => {
      const { data: act } = await supabase.from('activities').select('title').eq('id', session.activity_id).single();
      if (act) setActivityTitle(act.title);

      const { data: qs } = await supabase
        .from('questions')
        .select('*, choices(*)')
        .eq('activity_id', session.activity_id)
        .order('order_index');

      if (qs) {
        setQuestions(qs.map((q) => ({
          ...q,
          choices: (q.choices ?? []).sort((a: Choice, b: Choice) => a.order_index - b.order_index),
        })));
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.activity_id]);

  // ─── React to session status / question changes ───
  useEffect(() => {
    if (!session) return;

    if (session.status === 'finished') {
      setPhase('finished');
      if (participant && participants.findIndex(p => p.id === participant.id) === 0) {
        launchConfetti(100);
      }
      return;
    }

    if (session.status === 'waiting') {
      setPhase('waiting');
      return;
    }

    if (session.status === 'active') {
      const qi = session.current_question ?? 0;
      if (qi !== lastQuestionIndex.current) {
        // New question!
        lastQuestionIndex.current = qi;
        setPhase('question');
        setSelectedChoiceId(null);
        setCorrectChoiceId(null);
        setAnswerResult(null);
        setHasAnswered(false);
        timer.start();
      }
    }

    if (session.status === 'paused') {
      timer.stop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?.current_question]);

  // ─── Submit answer ───
  const submitAnswer = useCallback(async (choiceId: string) => {
    if (hasAnswered || !currentQ || !participant) return;

    const timeTakenMs = (currentQ.time_limit - timer.left) * 1000;
    timer.stop();
    setHasAnswered(true);
    setSelectedChoiceId(choiceId);

    try {
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          participant_id: participant.id,
          question_id: currentQ.id,
          choice_id: choiceId,
          time_taken_ms: timeTakenMs,
        }),
      });

      const data = await res.json();

      // Find correct choice
      const correct = currentQ.choices.find(c => c.is_correct);
      setCorrectChoiceId(correct?.id ?? null);

      setAnswerResult({
        isCorrect: data.is_correct,
        pointsEarned: data.points_earned,
        speedBonus: data.bonus ?? 0,
        explanation: currentQ.explanation,
      });

      const newScore = myScore + (data.points_earned ?? 0);
      setMyScore(newScore);
      setPhase('feedback');

      // Refresh participant score
      if (participant) {
        const { data: updated } = await supabase.from('participants').select('*').eq('id', participant.id).single();
        if (updated) setParticipant(updated as Participant);
      }
    } catch (e) {
      console.error('Answer submission error:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnswered, currentQ, participant, timer.left, myScore, sessionId]);

  // ─── Fill blank submit ───
  const submitText = useCallback(async (text: string) => {
    if (hasAnswered || !currentQ || !participant) return;

    const timeTakenMs = (currentQ.time_limit - timer.left) * 1000;
    timer.stop();
    setHasAnswered(true);

    const res = await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        participant_id: participant.id,
        question_id: currentQ.id,
        answer_text: text,
        time_taken_ms: timeTakenMs,
      }),
    });

    const data = await res.json();
    const correct = currentQ.choices.find(c => c.is_correct);
    setCorrectChoiceId(correct?.id ?? null);

    setAnswerResult({
      isCorrect: data.is_correct,
      pointsEarned: data.points_earned,
      speedBonus: data.bonus ?? 0,
      explanation: currentQ.explanation,
    });

    setMyScore((prev) => prev + (data.points_earned ?? 0));
    setPhase('feedback');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnswered, currentQ, participant, timer.left, sessionId]);

  const handleTimeUp = useCallback(async () => {
    if (hasAnswered || !currentQ || !participant) return;
    setHasAnswered(true);

    // سجّل إجابة فارغة (skipped) حتى تظهر في الإحصائيات
    try {
      await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          participant_id: participant.id,
          question_id: currentQ.id,
          choice_id: null,
          answer_text: null,
          time_taken_ms: currentQ.time_limit * 1000, // استخدم كامل الوقت
          skipped: true,
        }),
      });
    } catch (e) {
      console.error('TimeUp submit error:', e);
    }

    const correct = currentQ.choices.find(c => c.is_correct);
    setCorrectChoiceId(correct?.id ?? null);
    setAnswerResult({ isCorrect: false, pointsEarned: 0, speedBonus: 0, explanation: currentQ.explanation });
    setPhase('feedback');
    sfx.wrong?.();
  }, [hasAnswered, currentQ, participant, sessionId]);

  // My rank
  const myRank = participant
    ? [...participants].sort((a, b) => b.total_score - a.total_score).findIndex(p => p.id === participant.id) + 1
    : undefined;

  // ──────────────────────────────────────────────────────
  if (loading) return <LoadingScreen />;
  if (!session) return <NotFound onClick={() => router.replace('/join')} />;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(ellipse at 20% 0%, rgba(124,77,255,.2), transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(255,51,102,.15), transparent 50%), var(--bg)',
      }}
    >
      {/* ─── Top bar ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        background: 'rgba(11,11,30,.8)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 15, color: 'var(--text)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activityTitle}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {participant && (
            <ScorePill
              label={participant.display_name}
              value={myScore.toLocaleString('ar-EG')}
              emoji={participant.avatar_emoji}
              color={participant.avatar_color}
            />
          )}
          {myRank && myRank > 0 && (
            <RankPill rank={myRank} />
          )}
        </div>
      </div>

      {/* ─── Main content ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 16px', maxWidth: 640, width: '100%', margin: '0 auto', gap: 20 }}>

        {/* WAITING */}
        {phase === 'waiting' && (
          <WaitingScreen
            activityTitle={activityTitle}
            participantCount={participants.length}
            displayName={participant?.display_name ?? ''}
            avatarColor={participant?.avatar_color ?? 'var(--pink)'}
            avatarEmoji={participant?.avatar_emoji ?? '😎'}
          />
        )}

        {/* QUESTION */}
        {phase === 'question' && currentQ && (
          <>
            {/* Progress + Timer row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <TimerRing
                left={timer.left}
                percent={timer.percent}
                phase={timer.phase}
                size={72}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-cairo)', marginBottom: 4 }}>
                  سؤال {(session.current_question ?? 0) + 1} من {questions.length}
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(((session.current_question ?? 0) + 1) / questions.length) * 100}%`,
                    background: 'linear-gradient(90deg, var(--pink), var(--purple))',
                    transition: 'width .4s ease',
                    borderRadius: 3,
                  }} />
                </div>
              </div>
            </div>

            {/* Question text */}
            <div className="card-panel" style={{ padding: '20px 22px', textAlign: 'center' }}>
              {currentQ.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentQ.image_url} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 12, marginBottom: 16 }} />
              )}
              <p style={{ fontFamily: 'var(--font-tajawal)', fontSize: 19, lineHeight: 1.7, color: 'var(--text)', margin: 0 }}>
                {currentQ.question_text}
              </p>
            </div>

            {/* Choices */}
            {currentQ.question_type === 'fill_blank' ? (
              <FillBlankInput onSubmit={submitText} disabled={hasAnswered} />
            ) : (
              <AnswerGrid
                choices={currentQ.choices}
                selectedId={selectedChoiceId}
                correctId={correctChoiceId}
                revealed={false}
                disabled={hasAnswered}
                onSelect={submitAnswer}
              />
            )}

            {hasAnswered && !answerResult && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-cairo)', fontSize: 14, animation: 'pulse 1.5s infinite' }}>
                ⏳ في انتظار النتيجة...
              </div>
            )}
          </>
        )}

        {/* FEEDBACK */}
        {phase === 'feedback' && answerResult && currentQ && (
          <>
            {/* Show correct/wrong on choices */}
            {currentQ.question_type !== 'fill_blank' && (
              <AnswerGrid
                choices={currentQ.choices}
                selectedId={selectedChoiceId}
                correctId={correctChoiceId}
                revealed={true}
                disabled={true}
                onSelect={() => {}}
              />
            )}
            <FeedbackCard
              isCorrect={answerResult.isCorrect}
              pointsEarned={answerResult.pointsEarned}
              speedBonus={answerResult.speedBonus}
              explanation={answerResult.explanation}
              totalScore={myScore}
              rank={myRank}
            />
          </>
        )}

        {/* LEADERBOARD mid-game */}
        {phase === 'leaderboard' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-cairo)', textAlign: 'center', marginBottom: 20 }}>🏆 الترتيب الحالي</h2>
            <Leaderboard participants={participants} highlightId={participant?.id} limit={10} />
          </div>
        )}

        {/* FINISHED */}
        {phase === 'finished' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>🏁</div>
              <h2 style={{ fontFamily: 'var(--font-cairo)', fontSize: 26, margin: '0 0 8px' }}>انتهت المسابقة!</h2>
              <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-tajawal)', margin: 0 }}>
                مجموع نقاطك: <strong style={{ color: 'var(--yellow)' }}>{myScore.toLocaleString('ar-EG')}</strong>
                {myRank && ` — المركز #${myRank}`}
              </p>
            </div>

            <Podium
              top3={[...participants].sort((a, b) => b.total_score - a.total_score).slice(0, 3)}
              celebrate={myRank === 1}
            />

            <Leaderboard participants={participants} highlightId={participant?.id} />

            <button
              className="btn-primary"
              onClick={() => router.push('/join')}
              style={{ padding: '16px 24px', fontSize: 16 }}
            >
              🚀 انضم لجلسة جديدة
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────

function WaitingScreen({ activityTitle, participantCount, displayName, avatarColor, avatarEmoji }: {
  activityTitle: string;
  participantCount: number;
  displayName: string;
  avatarColor: string;
  avatarEmoji: string;
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, textAlign: 'center', paddingTop: 40 }}>
      {/* Avatar */}
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: avatarColor, display: 'grid', placeItems: 'center',
        fontSize: 48, boxShadow: `0 0 32px ${avatarColor}66`,
        border: '4px solid var(--text)',
        animation: 'float 3s ease-in-out infinite',
      }}>
        {avatarEmoji}
      </div>

      <div>
        <h2 style={{ fontFamily: 'var(--font-cairo)', fontSize: 22, margin: '0 0 6px' }}>{displayName}</h2>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-tajawal)', fontSize: 15, margin: 0 }}>
          {activityTitle}
        </p>
      </div>

      <div style={{
        padding: '16px 28px', borderRadius: 16,
        background: 'rgba(61,90,254,.12)', border: '1px solid rgba(61,90,254,.3)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font-cairo)' }}>
          في انتظار المعلم
        </div>
        <div style={{
          fontSize: 40, fontFamily: 'var(--font-space-grotesk)', fontWeight: 900,
          color: 'var(--blue)', animation: 'pulse 2s infinite',
        }}>
          {participantCount}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>طالب منضم</div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--pink)',
            animation: `bounce 1.2s ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes bounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
      `}</style>
    </div>
  );
}

function FillBlankInput({ onSubmit, disabled }: { onSubmit: (text: string) => void; disabled: boolean }) {
  const [text, setText] = useState('');
  return (
    <div className="card-panel" style={{ display: 'flex', gap: 10, padding: 16 }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && text.trim() && onSubmit(text.trim())}
        placeholder="اكتب إجابتك هنا..."
        disabled={disabled}
        style={{
          flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 16px', color: 'var(--text)',
          fontFamily: 'var(--font-tajawal)', fontSize: 16, outline: 'none',
        }}
        autoFocus
      />
      <button
        className="btn-primary"
        onClick={() => text.trim() && onSubmit(text.trim())}
        disabled={disabled || !text.trim()}
        style={{ padding: '12px 20px', fontSize: 15, flexShrink: 0 }}
      >
        إرسال
      </button>
    </div>
  );
}

function ScorePill({ label, value, emoji, color }: { label: string; value: string; emoji?: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 12px', borderRadius: 999,
      background: `${color}20`, border: `1px solid ${color}55`,
    }}>
      <span style={{ fontSize: 18 }}>{emoji ?? '⭐'}</span>
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-cairo)', lineHeight: 1 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--yellow)', fontFamily: 'var(--font-space-grotesk)', lineHeight: 1.2 }}>{value}</div>
      </div>
    </div>
  );
}

function RankPill({ rank }: { rank: number }) {
  return (
    <div style={{
      padding: '6px 14px', borderRadius: 999,
      background: 'rgba(255,215,0,.12)', border: '1px solid rgba(255,215,0,.3)',
      fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 14, color: 'var(--yellow)',
    }}>
      #{rank}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ fontSize: 40, animation: 'spin 1s linear infinite', marginBottom: 12 }}>🎮</div>
        <p style={{ fontFamily: 'var(--font-cairo)' }}>جاري الدخول...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function NotFound({ onClick }: { onClick: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontFamily: 'var(--font-cairo)', marginBottom: 20 }}>الجلسة غير موجودة</h2>
        <button className="btn-primary" onClick={onClick}>العودة للانضمام</button>
      </div>
    </div>
  );
}
