'use client';

import { useEffect, useState } from 'react';
import { TimePicker } from './TimePicker';
import { ChoiceEditor, type ChoiceDraft } from './ChoiceEditor';
import type { Question, QuestionType } from '@/lib/supabase/types';

export type QuestionDraft = Partial<Question> & {
  question_text: string;
  question_type: QuestionType;
  time_limit: number;
  points: number;
  speed_bonus: boolean;
  order_index: number;
  choices: ChoiceDraft[];
};

interface QuestionBuilderProps {
  question: QuestionDraft;
  onChange: (q: QuestionDraft) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  index: number;
  totalQuestions: number;
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string; desc: string }[] = [
  { value: 'mcq', label: 'اختيار من متعدد', icon: '🎯', desc: 'إجابة واحدة صحيحة من عدة خيارات' },
  { value: 'true_false', label: 'صح / خطأ', icon: '⚖️', desc: 'سؤال بإجابة واحدة من اثنين' },
  { value: 'fill_blank', label: 'أكمل الفراغ', icon: '✏️', desc: 'الطالب يكتب الإجابة' },
  { value: 'image_mcq', label: 'سؤال بصورة', icon: '🖼️', desc: 'صورة مع خيارات متعددة' },
];

const POINTS_PRESETS = [500, 1000, 1500, 2000];

/**
 * بناء خيارات افتراضية حسب نوع السؤال
 */
export function defaultChoicesFor(type: QuestionType): ChoiceDraft[] {
  if (type === 'true_false') {
    return [
      { choice_text: 'صح', is_correct: false, order_index: 0 },
      { choice_text: 'خطأ', is_correct: false, order_index: 1 },
    ];
  }
  if (type === 'fill_blank') {
    return [{ choice_text: '', is_correct: true, order_index: 0 }];
  }
  // mcq / image_mcq
  return [
    { choice_text: '', is_correct: false, order_index: 0 },
    { choice_text: '', is_correct: false, order_index: 1 },
    { choice_text: '', is_correct: false, order_index: 2 },
    { choice_text: '', is_correct: false, order_index: 3 },
  ];
}

export function QuestionBuilder({
  question,
  onChange,
  onDelete,
  onDuplicate,
  index,
  totalQuestions,
}: QuestionBuilderProps) {
  const [expanded, setExpanded] = useState(true);

  const update = (patch: Partial<QuestionDraft>) => {
    onChange({ ...question, ...patch });
  };

  // عند تغيير النوع → إعادة بناء الخيارات الافتراضية
  const changeType = (newType: QuestionType) => {
    if (newType === question.question_type) return;
    onChange({
      ...question,
      question_type: newType,
      choices: defaultChoicesFor(newType),
    });
  };

  // تأكد أن الخيارات متوافقة مع النوع
  useEffect(() => {
    if (!question.choices || question.choices.length === 0) {
      update({ choices: defaultChoicesFor(question.question_type) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeInfo = QUESTION_TYPES.find((t) => t.value === question.question_type) ?? QUESTION_TYPES[0];
  const needsChoices =
    question.question_type !== 'fill_blank' &&
    question.question_type !== 'matching' &&
    question.question_type !== 'ordering';

  return (
    <div
      className="card-panel"
      style={{
        padding: 0,
        overflow: 'hidden',
        border: expanded ? '1px solid var(--pink)' : '1px solid var(--border)',
        transition: 'border-color .2s',
      }}
    >
      {/* Header — رقم السؤال + نوعه + أزرار */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          background: expanded
            ? 'linear-gradient(180deg, rgba(255,51,102,.12), transparent)'
            : 'transparent',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* شارة الرقم */}
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background:
              'conic-gradient(from 45deg, var(--pink), var(--yellow), var(--green), var(--blue), var(--pink))',
            display: 'grid',
            placeItems: 'center',
            color: '#0B0B1E',
            fontFamily: 'var(--font-space-grotesk)',
            fontWeight: 900,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 16 }}>{typeInfo.icon}</span>
            <span
              style={{
                fontFamily: 'var(--font-cairo)',
                fontWeight: 700,
                fontSize: 13,
                color: 'var(--muted)',
              }}
            >
              {typeInfo.label}
            </span>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                background: 'var(--bg-2)',
                borderRadius: 999,
                color: 'var(--muted)',
                fontFamily: 'var(--font-space-grotesk)',
              }}
            >
              ⏱ {question.time_limit}s
            </span>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                background: 'rgba(255,215,0,.12)',
                borderRadius: 999,
                color: 'var(--yellow)',
                fontFamily: 'var(--font-space-grotesk)',
                fontWeight: 700,
              }}
            >
              {question.points} نقطة
            </span>
          </div>
          <div
            style={{
              fontSize: 14,
              fontFamily: 'var(--font-tajawal)',
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {question.question_text.trim() || (
              <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                سؤال فارغ — اضغط للتحرير
              </span>
            )}
          </div>
        </div>

        <div
          style={{ display: 'flex', gap: 6 }}
          onClick={(e) => e.stopPropagation()}
        >
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              title="نسخ السؤال"
              style={iconBtnStyle}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--blue)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              ⎘
            </button>
          )}
          {onDelete && totalQuestions > 1 && (
            <button
              type="button"
              onClick={onDelete}
              title="حذف السؤال"
              style={iconBtnStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--danger)';
                e.currentTarget.style.color = 'var(--danger)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--muted)';
              }}
            >
              🗑
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              ...iconBtnStyle,
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▾
          </button>
        </div>
      </div>

      {/* Body — expanded content */}
      {expanded && (
        <div
          style={{
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            animation: 'slideDown .25s ease',
          }}
        >
          {/* نوع السؤال — تبويبات */}
          <div>
            <label style={labelStyle}>نوع السؤال</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 8,
              }}
            >
              {QUESTION_TYPES.map((t) => {
                const active = t.value === question.question_type;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => changeType(t.value)}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: active
                        ? '1.5px solid var(--pink)'
                        : '1px solid var(--border)',
                      background: active
                        ? 'linear-gradient(135deg, rgba(255,51,102,.15), rgba(124,77,255,.1))'
                        : 'var(--bg-2)',
                      color: active ? 'var(--text)' : 'var(--muted)',
                      fontFamily: 'var(--font-cairo)',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      textAlign: 'right',
                      transition: 'all .2s',
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
                    <div style={{ fontSize: 13, marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* نص السؤال */}
          <div>
            <label style={labelStyle}>
              نص السؤال{' '}
              <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
                ({question.question_text.length} حرف)
              </span>
            </label>
            <textarea
              value={question.question_text}
              onChange={(e) => update({ question_text: e.target.value })}
              placeholder="اكتب سؤالك هنا... مثال: ما وحدة قياس التيار الكهربائي؟"
              className="input-field"
              maxLength={500}
              rows={3}
              style={{
                resize: 'vertical',
                minHeight: 80,
                fontFamily: 'var(--font-tajawal)',
                fontSize: 16,
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* URL صورة (لو image_mcq) */}
          {question.question_type === 'image_mcq' && (
            <div>
              <label style={labelStyle}>🖼️ رابط الصورة</label>
              <input
                type="url"
                value={question.image_url ?? ''}
                onChange={(e) => update({ image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="input-field"
                dir="ltr"
                style={{ textAlign: 'left' }}
              />
              {question.image_url && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    background: 'var(--bg-2)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={question.image_url}
                    alt="معاينة"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 220,
                      borderRadius: 8,
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* إجابة نصية (لو fill_blank) */}
          {question.question_type === 'fill_blank' && (
            <div>
              <label style={labelStyle}>✏️ الإجابة الصحيحة</label>
              <input
                type="text"
                value={question.choices[0]?.choice_text ?? ''}
                onChange={(e) =>
                  update({
                    choices: [
                      {
                        choice_text: e.target.value,
                        is_correct: true,
                        order_index: 0,
                      },
                    ],
                  })
                }
                placeholder="اكتب الإجابة المقبولة..."
                className="input-field"
              />
              <p
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: 'var(--muted)',
                }}
              >
                سيتم قبول الإجابة بصرف النظر عن الفرق في حالة الأحرف والمسافات
              </p>
            </div>
          )}

          {/* الخيارات */}
          {needsChoices && (
            <ChoiceEditor
              choices={question.choices}
              onChange={(choices) => update({ choices })}
              questionType={question.question_type}
              singleCorrect
            />
          )}

          {/* صف: الوقت + النقاط */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
            }}
          >
            <TimePicker
              value={question.time_limit}
              onChange={(time_limit) => update({ time_limit })}
            />

            <div>
              <label style={labelStyle}>🏆 النقاط الأساسية</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 6,
                }}
              >
                {POINTS_PRESETS.map((p) => {
                  const active = question.points === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => update({ points: p })}
                      style={{
                        padding: '10px 4px',
                        borderRadius: 10,
                        border: active
                          ? '2px solid var(--yellow)'
                          : '1px solid var(--border)',
                        background: active
                          ? 'linear-gradient(135deg, rgba(255,215,0,.2), rgba(255,143,0,.12))'
                          : 'var(--bg-2)',
                        color: active ? 'var(--text)' : 'var(--muted)',
                        fontFamily: 'var(--font-space-grotesk)',
                        fontWeight: 900,
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'all .2s',
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* توجل مكافأة السرعة */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 14,
                  padding: '10px 12px',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'var(--font-cairo)',
                  fontWeight: 700,
                }}
              >
                <input
                  type="checkbox"
                  checked={question.speed_bonus}
                  onChange={(e) => update({ speed_bonus: e.target.checked })}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: 'var(--green)',
                    cursor: 'pointer',
                  }}
                />
                <span>⚡ تفعيل مكافأة السرعة</span>
              </label>
            </div>
          </div>

          {/* الشرح (اختياري) */}
          <div>
            <label style={labelStyle}>
              💡 شرح الإجابة{' '}
              <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
                (يظهر بعد الإجابة — اختياري)
              </span>
            </label>
            <textarea
              value={question.explanation ?? ''}
              onChange={(e) => update({ explanation: e.target.value })}
              placeholder="وضّح للطلاب لماذا هذه الإجابة هي الصحيحة..."
              className="input-field"
              rows={2}
              maxLength={400}
              style={{
                resize: 'vertical',
                minHeight: 60,
                fontFamily: 'var(--font-tajawal)',
              }}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════ Styles ═══════════════════════
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--muted)',
  marginBottom: 10,
  fontFamily: 'var(--font-cairo)',
};

const iconBtnStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--muted)',
  fontSize: 14,
  cursor: 'pointer',
  transition: 'all .2s',
  display: 'grid',
  placeItems: 'center',
};
