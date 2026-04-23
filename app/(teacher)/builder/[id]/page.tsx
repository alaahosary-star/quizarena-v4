'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import { QuestionBuilder, QuestionDraft, defaultChoicesFor } from '@/components/teacher/QuestionBuilder';
import { createClient } from '@/lib/supabase/client';
import { sfx } from '@/lib/sound/engine';
import type { Activity, Question } from '@/lib/supabase/types';

// ──────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────
function makeBlankQuestion(index: number): QuestionDraft {
  return {
    question_text: '',
    question_type: 'mcq',
    time_limit: 30,
    points: 1000,
    speed_bonus: true,
    order_index: index,
    choices: defaultChoicesFor('mcq'),
  };
}

// ──────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────
export default function BuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [questions, setQuestions] = useState<QuestionDraft[]>([makeBlankQuestion(0)]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [activeTab, setActiveTab] = useState<'questions' | 'settings'>('questions');

  // ─── Load ───
  useEffect(() => {
    const load = async () => {
      const { data: act } = await supabase
        .from('activities')
        .select('*')
        .eq('id', id)
        .single();

      if (!act) { router.push('/dashboard'); return; }

      setActivity(act as Activity);
      setTitle(act.title);
      setDescription(act.description ?? '');
      setSubject(act.subject ?? '');
      setGrade(act.grade ?? '');

      const { data: qs } = await supabase
        .from('questions')
        .select('*, choices(*)')
        .eq('activity_id', id)
        .order('order_index');

      if (qs && qs.length > 0) {
        setQuestions(
          qs.map((q: Question) => ({
            ...q,
            choices: (q.choices ?? []).sort((a, b) => a.order_index - b.order_index),
          })) as QuestionDraft[]
        );
      }

      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ─── Update question ───
  const updateQuestion = useCallback((index: number, updated: QuestionDraft) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
  }, []);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, makeBlankQuestion(prev.length)]);
    sfx.correct?.();
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
  };

  const deleteQuestion = (index: number) => {
    setQuestions((prev) =>
      prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, order_index: i }))
    );
  };

  const duplicateQuestion = (index: number) => {
    setQuestions((prev) => {
      const copy = { ...prev[index], order_index: index + 1 };
      const next = [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
      return next.map((q, i) => ({ ...q, order_index: i }));
    });
  };

  // ─── Save ───
  const save = async (publish = false) => {
    if (!title.trim()) { alert('من فضلك أدخل عنوان النشاط'); return; }
    const invalid = questions.findIndex((q) => !q.question_text.trim());
    if (invalid !== -1) { alert(`السؤال ${invalid + 1} فارغ — أكمله قبل الحفظ`); return; }

    setSaving(true);
    setSaveMsg('');

    try {
      // 1. Update activity metadata
      const actRes = await fetch(`/api/activities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          subject: subject.trim() || null,
          grade: grade.trim() || null,
          status: publish ? 'published' : (activity?.status ?? 'draft'),
          total_questions: questions.length,
          estimated_time: questions.reduce((s, q) => s + q.time_limit, 0),
        }),
      });
      const actData = await actRes.json();
      if (!actRes.ok) throw new Error(actData.error ?? 'Failed to update activity');

      // 2. Bulk replace questions + choices (server handles delete+insert+choices atomically)
      const qRes = await fetch(`/api/activities/${id}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questions.map((q) => ({
            question_text: q.question_text,
            question_type: q.question_type,
            image_url: q.image_url ?? null,
            time_limit: q.time_limit,
            points: q.points,
            speed_bonus: q.speed_bonus,
            explanation: q.explanation ?? null,
            choices: (q.choices ?? []).map((c) => ({
              choice_text: c.choice_text,
              is_correct: c.is_correct,
              image_url: c.image_url ?? null,
            })),
          })),
        }),
      });
      const qData = await qRes.json();
      if (!qRes.ok) throw new Error(qData.error ?? 'Failed to save questions');

      sfx.correct?.();
      setSaveMsg(publish ? '✅ تم النشر!' : '✅ تم الحفظ');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ';
      setSaveMsg(`❌ ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // ─── Launch session ───
  const launchSession = async () => {
    await save(true);
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_id: id }),
    });
    const data = await res.json();
    if (data?.id) {
      router.push(`/host/${data.id}`);
    }
  };

  // ──────────────────────────────────────────────────────
  if (loading) return <LoadingScreen />;

  const totalTime = questions.reduce((s, q) => s + q.time_limit, 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ─── Top bar ─── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(11,11,30,.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Link
          href="/dashboard"
          style={{
            color: 'var(--muted)',
            textDecoration: 'none',
            fontSize: 20,
            lineHeight: 1,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-2)',
            display: 'grid',
            placeItems: 'center',
          }}
          title="العودة"
        >
          ←
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان النشاط..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 18,
              fontFamily: 'var(--font-cairo)',
              fontWeight: 900,
              color: 'var(--text)',
              direction: 'rtl',
            }}
          />
        </div>

        {/* meta badges */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <StatBadge label={`${questions.length} سؤال`} color="var(--blue)" />
          <StatBadge label={`${totalTime}ث`} color="var(--yellow)" />
          {saveMsg && (
            <span style={{ fontSize: 13, color: saveMsg.startsWith('❌') ? 'var(--danger)' : 'var(--green)' }}>
              {saveMsg}
            </span>
          )}
          <button
            className="btn-ghost"
            style={{ padding: '9px 16px', fontSize: 13 }}
            onClick={() => save(false)}
            disabled={saving}
          >
            {saving ? '...' : '💾 حفظ'}
          </button>
          <button
            className="btn-primary"
            style={{ padding: '9px 16px', fontSize: 13 }}
            onClick={launchSession}
            disabled={saving}
          >
            🚀 إطلاق
          </button>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', padding: '0 24px' }}>
        {(['questions', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--pink)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--text)' : 'var(--muted)',
              fontFamily: 'var(--font-cairo)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {tab === 'questions' ? `📝 الأسئلة (${questions.length})` : '⚙️ الإعدادات'}
          </button>
        ))}
      </div>

      {/* ─── Content ─── */}
      <div style={{ flex: 1, padding: '28px 24px', maxWidth: 860, width: '100%', margin: '0 auto' }}>

        {activeTab === 'questions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {questions.map((q, i) => (
              <QuestionBuilder
                key={i}
                question={q}
                index={i}
                totalQuestions={questions.length}
                onChange={(updated) => updateQuestion(i, updated)}
                onDelete={() => deleteQuestion(i)}
                onDuplicate={() => duplicateQuestion(i)}
              />
            ))}

            {/* Add question row */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                className="btn-ghost"
                style={{ flex: 1, padding: 18, fontSize: 15, borderStyle: 'dashed' }}
                onClick={addQuestion}
              >
                ＋ إضافة سؤال
              </button>
              <Link
                href={`/generator?activity=${id}`}
                style={{
                  padding: '18px 22px',
                  borderRadius: 12,
                  border: '1px dashed var(--purple)',
                  background: 'rgba(124,77,255,.08)',
                  color: 'var(--purple)',
                  fontFamily: 'var(--font-cairo)',
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                ✨ توليد بالذكاء الاصطناعي
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <ActivitySettings
            description={description} setDescription={setDescription}
            subject={subject} setSubject={setSubject}
            grade={grade} setGrade={setGrade}
          />
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────
function StatBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        background: `${color}20`,
        color,
        fontFamily: 'var(--font-space-grotesk)',
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {label}
    </span>
  );
}

function ActivitySettings({
  description, setDescription,
  subject, setSubject,
  grade, setGrade,
}: {
  description: string; setDescription: (v: string) => void;
  subject: string; setSubject: (v: string) => void;
  grade: string; setGrade: (v: string) => void;
}) {
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 700,
    color: 'var(--muted)', marginBottom: 10, fontFamily: 'var(--font-cairo)',
  };
  return (
    <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <h3 style={{ fontFamily: 'var(--font-cairo)', color: 'var(--text)', margin: 0 }}>إعدادات النشاط</h3>
      <div>
        <label style={labelStyle}>📝 الوصف</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف مختصر للنشاط..." className="input-field" rows={3}
          style={{ resize: 'vertical', fontFamily: 'var(--font-tajawal)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <label style={labelStyle}>📚 المادة</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)}
            placeholder="مثال: العلوم، الرياضيات..." className="input-field" />
        </div>
        <div>
          <label style={labelStyle}>🎓 الصف الدراسي</label>
          <input value={grade} onChange={(e) => setGrade(e.target.value)}
            placeholder="مثال: ثاني إعدادي" className="input-field" />
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16, animation: 'spin 1s linear infinite' }}>⚙️</div>
        <p style={{ fontFamily: 'var(--font-cairo)' }}>جاري التحميل...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
