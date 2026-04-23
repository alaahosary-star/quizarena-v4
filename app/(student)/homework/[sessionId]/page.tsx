'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AnswerGrid } from '@/components/student/AnswerGrid';
import { FeedbackCard } from '@/components/student/FeedbackCard';
import { Leaderboard } from '@/components/shared/Leaderboard';
import { Podium } from '@/components/shared/Podium';
import { sfx } from '@/lib/sound/engine';
import { launchConfetti, randomAvatarColor } from '@/lib/utils';
import type { Question, Choice, Participant } from '@/lib/supabase/types';

const EMOJIS = ['😎', '🦁', '🐯', '🦊', '🐺', '🦅', '🐉', '🌟', '⚡', '🔥', '🎯', '🏆', '🚀', '💎', '🎮', '🦋'];

type Phase = 'loading' | 'expired' | 'join' | 'intro' | 'question' | 'feedback' | 'finished';

interface AnswerResult { isCorrect: boolean; pointsEarned: number; speedBonus: number; }

export default function HomeworkPlayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<{ id: string; ends_at: string; activity_id: string; show_leaderboard: boolean; shuffle_questions: boolean; qr_url: string | null } | null>(null);
  const [actTitle, setActTitle] = useState('');
  const [questions, setQuestions] = useState<(Question & { choices: Choice[] })[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Join form
  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
  const [avatarColor] = useState(randomAvatarColor);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [correctChoiceId, setCorrectChoiceId] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [answeredSet, setAnsweredSet] = useState<Set<string>>(new Set());

  const currentQ = questions[currentIndex];

  // ── Load session ────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: sess } = await supabase
        .from('live_sessions')
        .select('*, activities(title)')
        .eq('id', sessionId)
        .eq('mode', 'homework')
        .single();

      if (!sess) { setPhase('expired'); return; }

      // Check expired
      if (new Date(sess.ends_at) <= new Date()) { setPhase('expired'); return; }

      setSession({
        id: sess.id,
        ends_at: sess.ends_at,
        activity_id: sess.activity_id,
        show_leaderboard: sess.show_leaderboard,
        shuffle_questions: sess.shuffle_questions ?? false,
        qr_url: sess.qr_url,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = (() => { try { return JSON.parse(sess.qr_url ?? '{}'); } catch { return {}; } })();
      setActTitle(config.title_override || (sess as any).activities?.title || 'واجب');

      // Load questions
      const { data: qs } = await supabase
        .from('questions')
        .select('*, choices(*)')
        .eq('activity_id', sess.activity_id)
        .order('order_index');

      if (qs) {
        let ordered = qs.map((q) => ({ ...q, choices: (q.choices ?? []).sort((a: Choice, b: Choice) => a.order_index - b.order_index) }));
        if (sess.shuffle_questions) ordered = shuffleArray(ordered);
        setQuestions(ordered as (Question & { choices: Choice[] })[]);
      }

      // Check if already joined
      const pid = localStorage.getItem(`participant_${sessionId}`);
      if (pid) {
        const { data: p } = await supabase.from('participants').select('*').eq('id', pid).single();
        if (p) {
          setParticipant(p as Participant);
          setMyScore(p.total_score);
          // Check previous answers
          const { data: prevAnswers } = await supabase.from('answers').select('question_id').eq('participant_id', pid).eq('session_id', sessionId);
          const answered = new Set((prevAnswers ?? []).map((a: { question_id: string }) => a.question_id));
          setAnsweredSet(answered);
          // Find first unanswered
          const firstUnanswered = (qs ?? []).findIndex((q) => !answered.has(q.id));
          if (firstUnanswered === -1) { setPhase('finished'); launchConfetti(80); }
          else { setCurrentIndex(firstUnanswered); setPhase('question'); setStartedAt(Date.now()); }
          return;
        }
      }

      setPhase('join');
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Join (via API — no direct insert) ───────────────
  const handleJoin = async () => {
    if (!displayName.trim()) { setJoinError('أدخل اسمك'); return; }
    setJoinLoading(true);
    setJoinError('');

    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          display_name: displayName.trim(),
          avatar_color: avatarColor,
          avatar_emoji: selectedEmoji,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'فشل الانضمام');

      localStorage.setItem(`participant_${sessionId}`, data.id);
      setParticipant(data as Participant);
      setMyScore(data.total_score ?? 0);
      sfx.join?.();

      // لو rejoin و خلّص قبل كده، انقله مباشرة للـ finished
      if (data.rejoined) {
        const { data: prev } = await supabase
          .from('answers')
          .select('question_id')
          .eq('participant_id', data.id)
          .eq('session_id', sessionId);
        const answered = new Set((prev ?? []).map((a: { question_id: string }) => a.question_id));
        setAnsweredSet(answered);
        const firstUnanswered = questions.findIndex((q) => !answered.has(q.id));
        if (firstUnanswered === -1) { setPhase('finished'); launchConfetti(80); return; }
        setCurrentIndex(firstUnanswered);
        setStartedAt(Date.now());
        setPhase('question');
        return;
      }

      setPhase('intro');
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : 'فشل الانضمام');
    } finally {
      setJoinLoading(false);
    }
  };

  // ── Submit answer ───────────────────────────────────
  const submitAnswer = useCallback(async (choiceId: string) => {
    if (!currentQ || !participant || answeredSet.has(currentQ.id)) return;
    const timeTakenMs = Date.now() - startedAt;
    setSelectedChoiceId(choiceId);

    const res = await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, participant_id: participant.id, question_id: currentQ.id, choice_id: choiceId, time_taken_ms: timeTakenMs }),
    });
    const data = await res.json();
    const correct = currentQ.choices.find(c => c.is_correct);
    setCorrectChoiceId(correct?.id ?? null);
    setAnswerResult({ isCorrect: data.is_correct, pointsEarned: data.points_earned, speedBonus: data.bonus ?? 0 });
    setMyScore(prev => prev + (data.points_earned ?? 0));
    setAnsweredSet(prev => new Set([...prev, currentQ.id]));
    setPhase('feedback');
    if (data.is_correct) sfx.correct?.();
    else sfx.wrong?.();
  }, [currentQ, participant, answeredSet, startedAt, sessionId]);

  const submitText = useCallback(async (text: string) => {
    if (!currentQ || !participant) return;
    const timeTakenMs = Date.now() - startedAt;
    const res = await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, participant_id: participant.id, question_id: currentQ.id, answer_text: text, time_taken_ms: timeTakenMs }),
    });
    const data = await res.json();
    const correct = currentQ.choices.find(c => c.is_correct);
    setCorrectChoiceId(correct?.id ?? null);
    setAnswerResult({ isCorrect: data.is_correct, pointsEarned: data.points_earned, speedBonus: data.bonus ?? 0 });
    setMyScore(prev => prev + (data.points_earned ?? 0));
    setAnsweredSet(prev => new Set([...prev, currentQ.id]));
    setPhase('feedback');
  }, [currentQ, participant, startedAt, sessionId]);

  const goNext = async () => {
    const next = currentIndex + 1;
    if (next >= questions.length) {
      // Load all participants for leaderboard
      if (session?.show_leaderboard) {
        const { data } = await supabase.from('participants').select('*').eq('session_id', sessionId).order('total_score', { ascending: false });
        if (data) setParticipants(data as Participant[]);
      }
      setPhase('finished');
      launchConfetti(80);
      return;
    }
    setCurrentIndex(next);
    setSelectedChoiceId(null);
    setCorrectChoiceId(null);
    setAnswerResult(null);
    setStartedAt(Date.now());
    setPhase('question');
  };

  const myRank = participants.length > 0 && participant
    ? participants.findIndex(p => p.id === participant.id) + 1
    : undefined;

  // ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 20% 0%, rgba(124,77,255,.2), transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(255,51,102,.15), transparent 50%), var(--bg)' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(11,11,30,.8)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>📚</span>
          <span style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 16, color: 'var(--text)' }}>{actTitle}</span>
        </div>
        {phase === 'question' || phase === 'feedback' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(255,215,0,.12)', border: '1px solid rgba(255,215,0,.3)', color: 'var(--yellow)', fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 13 }}>
              {myScore.toLocaleString('ar-EG')} نقطة
            </span>
            <span style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(61,90,254,.12)', border: '1px solid rgba(61,90,254,.3)', color: 'var(--blue)', fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 13 }}>
              {currentIndex + 1}/{questions.length}
            </span>
          </div>
        ) : null}
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 16px' }}>

        {/* LOADING */}
        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, animation: 'spin 1s linear infinite', marginBottom: 12 }}>📚</div>
            <p style={{ fontFamily: 'var(--font-cairo)' }}>جاري التحميل...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* EXPIRED */}
        {phase === 'expired' && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⏰</div>
            <h2 style={{ fontFamily: 'var(--font-cairo)', fontSize: 24, marginBottom: 12 }}>انتهى وقت الواجب</h2>
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-tajawal)' }}>هذا الواجب لم يعد متاحًا. تواصل مع معلمك.</p>
            <button className="btn-primary" style={{ marginTop: 24 }} onClick={() => router.push('/join')}>العودة</button>
          </div>
        )}

        {/* JOIN */}
        {phase === 'join' && (
          <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📚</div>
              <h2 style={{ fontFamily: 'var(--font-cairo)', fontSize: 22, margin: '0 0 6px' }}>{actTitle}</h2>
              <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-tajawal)', fontSize: 14, margin: 0 }}>
                واجب منزلي — حلّه في أي وقت تريد!
              </p>
              {session?.ends_at && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--yellow)', fontFamily: 'var(--font-cairo)' }}>
                  ⏰ ينتهي {new Date(session.ends_at).toLocaleDateString('ar-EG', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* Avatar */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 70, height: 70, borderRadius: '50%', background: avatarColor, display: 'inline-grid', placeItems: 'center', fontSize: 32, boxShadow: `0 0 20px ${avatarColor}55`, border: '3px solid var(--text)', marginBottom: 12 }}>
                {selectedEmoji}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setSelectedEmoji(e)} style={{ fontSize: 20, width: 36, height: 36, borderRadius: 9, border: selectedEmoji === e ? '2px solid var(--pink)' : '1px solid var(--border)', background: selectedEmoji === e ? 'rgba(255,51,102,.15)' : 'var(--bg-2)', cursor: 'pointer' }}>{e}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, fontFamily: 'var(--font-cairo)' }}>✏️ اسمك</label>
              <input value={displayName} onChange={e => { setDisplayName(e.target.value); setJoinError(''); }} onKeyDown={e => e.key === 'Enter' && handleJoin()} placeholder="اكتب اسمك هنا..." className="input-field" style={{ fontFamily: 'var(--font-cairo)', fontSize: 16 }} autoFocus />
            </div>

            {joinError && <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,23,68,.12)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 13, fontFamily: 'var(--font-tajawal)' }}>{joinError}</div>}

            <button className="btn-primary" onClick={handleJoin} disabled={joinLoading || !displayName.trim()} style={{ padding: '16px', fontSize: 16 }}>
              {joinLoading ? '⏳ جاري...' : '🚀 ابدأ الواجب'}
            </button>
          </div>
        )}

        {/* INTRO */}
        {phase === 'intro' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingTop: 40 }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', background: avatarColor, display: 'grid', placeItems: 'center', fontSize: 44, boxShadow: `0 0 28px ${avatarColor}66`, border: '4px solid var(--text)' }}>{selectedEmoji}</div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-cairo)', fontSize: 22, margin: '0 0 8px' }}>أهلًا {displayName}!</h2>
              <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-tajawal)', margin: 0 }}>
                {questions.length} سؤال تنتظرك — خذ وقتك، لا يوجد ضغط!
              </p>
            </div>
            <button className="btn-primary" style={{ padding: '16px 40px', fontSize: 17 }} onClick={() => { setStartedAt(Date.now()); setPhase('question'); }}>
              ابدأ الآن ←
            </button>
          </div>
        )}

        {/* QUESTION */}
        {phase === 'question' && currentQ && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>سؤال {currentIndex + 1} من {questions.length}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>{Math.round((currentIndex / questions.length) * 100)}% مكتمل</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--border)' }}>
                <div style={{ height: '100%', width: `${(currentIndex / questions.length) * 100}%`, background: 'linear-gradient(90deg, var(--purple), var(--pink))', borderRadius: 4, transition: 'width .5s ease' }} />
              </div>
            </div>

            {/* Question */}
            <div className="card-panel" style={{ padding: '24px', textAlign: 'center' }}>
              {currentQ.image_url && <img src={currentQ.image_url} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 12, marginBottom: 16 }} />}
              <p style={{ fontFamily: 'var(--font-tajawal)', fontSize: 20, lineHeight: 1.7, color: 'var(--text)', margin: 0 }}>{currentQ.question_text}</p>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(255,215,0,.1)', color: 'var(--yellow)', fontFamily: 'var(--font-cairo)', fontSize: 12 }}>{currentQ.points} نقطة</span>
                <span style={{ padding: '3px 10px', borderRadius: 999, background: 'var(--bg-2)', color: 'var(--muted)', fontFamily: 'var(--font-cairo)', fontSize: 12 }}>خذ وقتك ⏳</span>
              </div>
            </div>

            {/* Answers */}
            {currentQ.question_type === 'fill_blank' ? (
              <FillBlankInput onSubmit={submitText} />
            ) : (
              <AnswerGrid choices={currentQ.choices} selectedId={selectedChoiceId} correctId={correctChoiceId} revealed={false} disabled={false} onSelect={submitAnswer} />
            )}
          </div>
        )}

        {/* FEEDBACK */}
        {phase === 'feedback' && answerResult && currentQ && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {currentQ.question_type !== 'fill_blank' && (
              <AnswerGrid choices={currentQ.choices} selectedId={selectedChoiceId} correctId={correctChoiceId} revealed={true} disabled={true} onSelect={() => {}} />
            )}
            <FeedbackCard isCorrect={answerResult.isCorrect} pointsEarned={answerResult.pointsEarned} speedBonus={answerResult.speedBonus} explanation={currentQ.explanation} totalScore={myScore} />
            <button className="btn-primary" style={{ padding: '16px', fontSize: 16 }} onClick={goNext}>
              {currentIndex + 1 >= questions.length ? '🏁 إنهاء الواجب' : 'السؤال التالي ←'}
            </button>
          </div>
        )}

        {/* FINISHED */}
        {phase === 'finished' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ textAlign: 'center', padding: '32px 20px', borderRadius: 24, background: 'linear-gradient(135deg, rgba(0,230,118,.15), rgba(0,200,83,.08))', border: '2px solid var(--green)' }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
              <h2 style={{ fontFamily: 'var(--font-cairo)', fontSize: 26, margin: '0 0 8px', color: 'var(--green)' }}>أحسنت! أكملت الواجب</h2>
              <div style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 48, color: 'var(--yellow)', margin: '12px 0' }}>{myScore.toLocaleString('ar-EG')}</div>
              <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-cairo)', fontSize: 14 }}>نقطة · {answeredSet.size} من {questions.length} سؤال</div>
              {myRank && <div style={{ marginTop: 12, color: 'var(--blue)', fontFamily: 'var(--font-cairo)', fontWeight: 700 }}>ترتيبك #{myRank}</div>}
            </div>

            {session?.show_leaderboard && participants.length > 1 && (
              <>
                <Podium top3={participants.slice(0, 3)} celebrate={myRank === 1} />
                <Leaderboard participants={participants} highlightId={participant?.id} />
              </>
            )}

            <button className="btn-ghost" style={{ padding: '14px' }} onClick={() => router.push('/join')}>العودة للرئيسية</button>
          </div>
        )}
      </div>
    </div>
  );
}

function FillBlankInput({ onSubmit }: { onSubmit: (t: string) => void }) {
  const [text, setText] = useState('');
  return (
    <div className="card-panel" style={{ display: 'flex', gap: 10, padding: 16 }}>
      <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && text.trim() && onSubmit(text.trim())} placeholder="اكتب إجابتك..." className="input-field" style={{ flex: 1, fontFamily: 'var(--font-tajawal)', fontSize: 16 }} autoFocus />
      <button className="btn-primary" onClick={() => text.trim() && onSubmit(text.trim())} disabled={!text.trim()} style={{ padding: '12px 20px', flexShrink: 0 }}>إرسال</button>
    </div>
  );
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
