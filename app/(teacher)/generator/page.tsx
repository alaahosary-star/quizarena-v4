'use client';

import { useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import { createClient } from '@/lib/supabase/client';
import { sfx } from '@/lib/sound/engine';
import type { QuestionType } from '@/lib/supabase/types';

// ──────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────
interface GeneratedQuestion {
  question_text: string;
  question_type: QuestionType;
  time_limit: number;
  points: number;
  speed_bonus: boolean;
  explanation?: string;
  choices: { choice_text: string; is_correct: boolean }[];
}

const SUBJECTS = ['العلوم', 'الرياضيات', 'اللغة العربية', 'الإنجليزية', 'التاريخ', 'الجغرافيا', 'التربية الإسلامية', 'أخرى'];
const GRADES = ['الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي',
  'الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'];
const DIFFICULTIES = [{ value: 'easy', label: 'سهل 🟢' }, { value: 'medium', label: 'متوسط 🟡' }, { value: 'hard', label: 'صعب 🔴' }];

// ──────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────
export default function GeneratorPage() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity');
  const router = useRouter();

  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('العلوم');
  const [grade, setGrade] = useState('الثاني الإعدادي');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['mcq']);
  const [extraInstructions, setExtraInstructions] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<GeneratedQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  const toggleType = (t: QuestionType) => {
    setQuestionTypes((prev) =>
      prev.includes(t) ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t]
    );
  };

  const toggleSelect = (i: number) =>
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });

  const selectAll = () => setSelected(new Set(generated.map((_, i) => i)));

  // ─── Generate ───
  const generate = async () => {
    if (!topic.trim()) { setError('من فضلك أدخل موضوع الأسئلة'); return; }
    setError('');
    setLoading(true);
    setGenerated([]);
    setSelected(new Set());

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subject, grade, difficulty, count, questionTypes, extraInstructions }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'خطأ غير معروف');

      const qs: GeneratedQuestion[] = data.questions ?? [];
      setGenerated(qs);
      setSelected(new Set(qs.map((_, i) => i)));
      sfx.correct?.();

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || 'فشل التوليد — تأكد من إعداد ANTHROPIC_API_KEY');
    } finally {
      setLoading(false);
    }
  };

  // ─── Import to activity ───
  const importQuestions = async () => {
    if (!activityId) {
      alert('لا يوجد نشاط محدد — ستُحفظ الأسئلة في نشاط جديد');
      return;
    }
    if (selected.size === 0) { alert('اختر على الأقل سؤالاً واحداً'); return; }

    setImporting(true);
    try {
      const toImport = [...selected].map((i) => generated[i]);

      // 1. Append questions via API (server handles order_index + choices)
      const qRes = await fetch(`/api/activities/${activityId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: toImport.map((q) => ({
            question_text: q.question_text,
            question_type: q.question_type,
            time_limit: q.time_limit,
            points: q.points,
            speed_bonus: q.speed_bonus,
            explanation: q.explanation ?? null,
            choices: (q.choices ?? []).map((c) => ({
              choice_text: c.choice_text,
              is_correct: c.is_correct,
            })),
          })),
        }),
      });
      const qData = await qRes.json();
      if (!qRes.ok) throw new Error(qData.error ?? 'Failed to import questions');

      // 2. Refresh total_questions count on activity
      //    (read total via Supabase is fine — RLS allows teacher to read own activity)
      const supabase = createClient();
      const { count: total } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', activityId);

      await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_questions: total ?? 0 }),
      });

      sfx.correct?.();
      router.push(`/builder/${activityId}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'فشل الاستيراد';
      alert(`❌ ${msg}`);
      setImporting(false);
    }
  };

  // ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            {activityId && (
              <Link href={`/builder/${activityId}`}
                style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 20, padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-2)' }}>
                ←
              </Link>
            )}
            <h1 style={{ margin: 0, fontFamily: 'var(--font-cairo)', fontSize: 28 }}>
              ✨ مولّد الأسئلة الذكي
            </h1>
          </div>
          <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-tajawal)', fontSize: 15, margin: 0 }}>
            أدخل الموضوع وسيقوم الذكاء الاصطناعي بتوليد أسئلة تفاعلية على الفور
          </p>
        </div>

        {/* ─── Form ─── */}
        <div className="card-panel" style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Topic */}
          <div>
            <label style={labelStyle}>🎯 موضوع الأسئلة *</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="مثال: المفاعل النووي وتطبيقاته، التمثيل الضوئي في النباتات، معادلات الدرجة الثانية..."
              className="input-field"
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'var(--font-tajawal)', fontSize: 15 }}
            />
          </div>

          {/* Subject + Grade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>📚 المادة</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field">
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>🎓 الصف</label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className="input-field">
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Difficulty + Count */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>⚡ مستوى الصعوبة</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDifficulty(d.value)}
                    style={{
                      flex: 1, padding: '10px 4px', borderRadius: 10,
                      border: difficulty === d.value ? '2px solid var(--pink)' : '1px solid var(--border)',
                      background: difficulty === d.value ? 'rgba(255,51,102,.15)' : 'var(--bg-2)',
                      color: 'var(--text)', fontFamily: 'var(--font-cairo)', fontWeight: 700,
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>🔢 عدد الأسئلة: <strong style={{ color: 'var(--yellow)' }}>{count}</strong></label>
              <input
                type="range" min={1} max={15} value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--pink)', marginTop: 8 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-space-grotesk)' }}>
                <span>1</span><span>5</span><span>10</span><span>15</span>
              </div>
            </div>
          </div>

          {/* Question types */}
          <div>
            <label style={labelStyle}>📋 أنواع الأسئلة</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {([
                { value: 'mcq', label: '🎯 اختيار من متعدد' },
                { value: 'true_false', label: '⚖️ صح / خطأ' },
                { value: 'fill_blank', label: '✏️ أكمل الفراغ' },
              ] as { value: QuestionType; label: string }[]).map((t) => {
                const active = questionTypes.includes(t.value);
                return (
                  <button key={t.value} type="button" onClick={() => toggleType(t.value)}
                    style={{
                      padding: '8px 16px', borderRadius: 999,
                      border: active ? '1.5px solid var(--purple)' : '1px solid var(--border)',
                      background: active ? 'rgba(124,77,255,.2)' : 'var(--bg-2)',
                      color: active ? 'var(--text)' : 'var(--muted)',
                      fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {active && '✓ '}{t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Extra instructions */}
          <div>
            <label style={labelStyle}>💬 تعليمات إضافية <span style={{ fontWeight: 400 }}>(اختياري)</span></label>
            <input
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
              placeholder="مثال: اجعل الأسئلة مرتبطة بالحياة اليومية، ابتعد عن الحفظ..."
              className="input-field"
            />
          </div>

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,23,68,.12)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 14, fontFamily: 'var(--font-tajawal)' }}>
              ❌ {error}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={generate}
            disabled={loading}
            style={{ padding: '16px 24px', fontSize: 16 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span>
                جاري التوليد...
              </span>
            ) : '✨ توليد الأسئلة'}
          </button>
        </div>

        {/* ─── Results ─── */}
        {generated.length > 0 && (
          <div ref={resultsRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-cairo)', margin: 0, fontSize: 20 }}>
                🎉 تم توليد {generated.length} سؤال
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }} onClick={selectAll}>
                  تحديد الكل
                </button>
                {activityId && (
                  <button
                    className="btn-primary"
                    style={{ padding: '8px 14px', fontSize: 13 }}
                    onClick={importQuestions}
                    disabled={importing || selected.size === 0}
                  >
                    {importing ? '...' : `📥 استيراد (${selected.size})`}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {generated.map((q, i) => (
                <GeneratedCard
                  key={i}
                  question={q}
                  index={i}
                  selected={selected.has(i)}
                  onToggle={() => toggleSelect(i)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select.input-field { appearance: none; cursor: pointer; }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────
function GeneratedCard({
  question, index, selected, onToggle,
}: {
  question: GeneratedQuestion;
  index: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div
      style={{
        borderRadius: 16,
        border: selected ? '1.5px solid var(--green)' : '1px solid var(--border)',
        background: 'linear-gradient(180deg, var(--card), var(--card-2))',
        overflow: 'hidden',
        transition: 'border-color .2s',
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 18, height: 18, accentColor: 'var(--green)', cursor: 'pointer' }}
        />
        <span style={{
          width: 30, height: 30, borderRadius: 8, background: 'var(--bg-2)',
          display: 'grid', placeItems: 'center', fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 14, flexShrink: 0,
        }}>{index + 1}</span>
        <div style={{ flex: 1, fontSize: 14, fontFamily: 'var(--font-tajawal)', color: 'var(--text)' }}>
          {question.question_text}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <Badge label={question.question_type === 'mcq' ? '🎯' : question.question_type === 'true_false' ? '⚖️' : '✏️'} />
          <Badge label={`⏱ ${question.time_limit}s`} color="var(--muted)" />
          <Badge label={`${question.points} نقطة`} color="var(--yellow)" />
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 16 }}>{expanded ? '▴' : '▾'}</span>
      </div>

      {/* choices */}
      {expanded && (
        <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {question.choices.map((c, ci) => (
            <div key={ci} style={{
              padding: '8px 14px', borderRadius: 8,
              background: c.is_correct ? 'rgba(0,230,118,.12)' : 'var(--bg-2)',
              border: c.is_correct ? '1px solid var(--green)' : '1px solid var(--border)',
              fontSize: 13, fontFamily: 'var(--font-tajawal)', color: 'var(--text)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {c.is_correct ? '✅' : '○'} {c.choice_text}
            </div>
          ))}
          {question.explanation && (
            <div style={{ marginTop: 4, padding: '8px 14px', borderRadius: 8, background: 'rgba(255,215,0,.08)', border: '1px solid rgba(255,215,0,.2)', fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-tajawal)' }}>
              💡 {question.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ label, color = 'var(--blue)' }: { label: string; color?: string }) {
  return (
    <span style={{ padding: '3px 8px', borderRadius: 999, background: `${color}20`, color, fontFamily: 'var(--font-space-grotesk)', fontSize: 11, fontWeight: 700 }}>
      {label}
    </span>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 700,
  color: 'var(--muted)', marginBottom: 10, fontFamily: 'var(--font-cairo)',
};
