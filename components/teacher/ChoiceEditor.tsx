'use client';

import { ARABIC_LETTERS } from '@/lib/utils';
import type { Choice, QuestionType } from '@/lib/supabase/types';

// نوع الخيار المحلي قبل الحفظ في DB (قد لا يحمل id)
export type ChoiceDraft = Partial<Choice> & {
  choice_text: string;
  is_correct: boolean;
  order_index: number;
};

interface ChoiceEditorProps {
  choices: ChoiceDraft[];
  onChange: (choices: ChoiceDraft[]) => void;
  questionType: QuestionType;
  minChoices?: number;
  maxChoices?: number;
  /** true = MCQ (إجابة واحدة) | false = يمكن عدة صحيحة */
  singleCorrect?: boolean;
}

const TYPE_COLORS = ['var(--pink)', 'var(--blue)', 'var(--yellow)', 'var(--green)', 'var(--purple)', '#FF8F00', '#00B8D4', '#FF1744'];

export function ChoiceEditor({
  choices,
  onChange,
  questionType,
  minChoices = 2,
  maxChoices = 6,
  singleCorrect = true,
}: ChoiceEditorProps) {
  const isTrueFalse = questionType === 'true_false';
  const locked = isTrueFalse; // لا إضافة/حذف في صح/خطأ

  const updateChoice = (idx: number, patch: Partial<ChoiceDraft>) => {
    const next = choices.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange(next);
  };

  const toggleCorrect = (idx: number) => {
    if (singleCorrect) {
      // قبول صحيحة واحدة فقط
      const next = choices.map((c, i) => ({
        ...c,
        is_correct: i === idx,
      }));
      onChange(next);
    } else {
      updateChoice(idx, { is_correct: !choices[idx].is_correct });
    }
  };

  const addChoice = () => {
    if (choices.length >= maxChoices) return;
    const next: ChoiceDraft[] = [
      ...choices,
      {
        choice_text: '',
        is_correct: false,
        order_index: choices.length,
      },
    ];
    onChange(next);
  };

  const removeChoice = (idx: number) => {
    if (choices.length <= minChoices) return;
    const next = choices
      .filter((_, i) => i !== idx)
      .map((c, i) => ({ ...c, order_index: i }));
    onChange(next);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <label
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--muted)',
            fontFamily: 'var(--font-cairo)',
          }}
        >
          🎯 الخيارات — اضغط ✓ لتحديد الإجابة الصحيحة
        </label>
        {!locked && (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {choices.length} / {maxChoices}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {choices.map((c, idx) => {
          const color = TYPE_COLORS[idx % TYPE_COLORS.length];
          const letter = ARABIC_LETTERS[idx] ?? String(idx + 1);
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: 10,
                padding: 8,
                background: c.is_correct
                  ? 'linear-gradient(135deg, rgba(0,230,118,.12), rgba(0,200,83,.06))'
                  : 'var(--bg-2)',
                border: c.is_correct
                  ? '1.5px solid var(--green)'
                  : '1px solid var(--border)',
                borderRadius: 14,
                transition: 'all .2s',
              }}
            >
              {/* حرف الخيار */}
              <div
                style={{
                  width: 44,
                  borderRadius: 10,
                  background: color,
                  color: '#0B0B1E',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--font-cairo)',
                  fontWeight: 900,
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {letter}
              </div>

              {/* حقل النص */}
              <input
                type="text"
                value={c.choice_text}
                onChange={(e) =>
                  updateChoice(idx, { choice_text: e.target.value })
                }
                placeholder={
                  isTrueFalse
                    ? idx === 0
                      ? 'صح'
                      : 'خطأ'
                    : `اكتب الخيار ${letter}...`
                }
                disabled={isTrueFalse}
                maxLength={200}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 0,
                  padding: '10px 4px',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-tajawal)',
                  fontSize: 15,
                  outline: 'none',
                }}
              />

              {/* زر تعيين صحيح */}
              <button
                type="button"
                onClick={() => toggleCorrect(idx)}
                title={c.is_correct ? 'إجابة صحيحة' : 'اضغط لجعلها صحيحة'}
                style={{
                  width: 44,
                  borderRadius: 10,
                  border: 0,
                  background: c.is_correct
                    ? 'linear-gradient(135deg, var(--green), #00C853)'
                    : 'var(--card)',
                  color: c.is_correct ? '#0B0B1E' : 'var(--muted)',
                  fontSize: 20,
                  fontWeight: 900,
                  cursor: 'pointer',
                  transition: 'all .2s',
                  boxShadow: c.is_correct
                    ? '0 4px 14px rgba(0,230,118,.35)'
                    : 'none',
                  flexShrink: 0,
                }}
              >
                ✓
              </button>

              {/* زر حذف */}
              {!locked && choices.length > minChoices && (
                <button
                  type="button"
                  onClick={() => removeChoice(idx)}
                  title="حذف الخيار"
                  style={{
                    width: 36,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--muted)',
                    fontSize: 16,
                    cursor: 'pointer',
                    transition: 'all .2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--danger)';
                    e.currentTarget.style.color = 'var(--danger)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--muted)';
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* زر إضافة */}
      {!locked && choices.length < maxChoices && (
        <button
          type="button"
          onClick={addChoice}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '12px',
            background: 'transparent',
            border: '1.5px dashed var(--border)',
            borderRadius: 12,
            color: 'var(--muted)',
            fontFamily: 'var(--font-cairo)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all .2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--pink)';
            e.currentTarget.style.color = 'var(--pink)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--muted)';
          }}
        >
          + أضف خيارًا جديدًا
        </button>
      )}

      {/* تنبيه إذا لا توجد إجابة صحيحة */}
      {!choices.some((c) => c.is_correct) && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            background: 'rgba(255,215,0,.08)',
            border: '1px solid rgba(255,215,0,.3)',
            borderRadius: 10,
            color: 'var(--yellow)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ⚠️ لم تحدّد إجابة صحيحة بعد
        </div>
      )}
    </div>
  );
}
