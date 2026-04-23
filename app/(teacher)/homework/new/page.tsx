'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import { QRCode } from '@/components/shared/QRCode';
import { createClient } from '@/lib/supabase/client';
import { formatSessionCode } from '@/lib/utils';
import type { Activity } from '@/lib/supabase/types';

interface CreatedHomework {
  id: string;
  session_code: string;
  ends_at: string;
}

export default function NewHomeworkPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const preselectedId = searchParams.get('activity') ?? '';

  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState(preselectedId);
  const [title, setTitle] = useState('');

  // Dates
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 0, 0);

  const [startsNow, setStartsNow] = useState(true);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(now));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(tomorrow));

  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleChoices, setShuffleChoices] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedHomework | null>(null);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('activities')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('status', 'published')
        .order('updated_at', { ascending: false });

      const list = (data ?? []) as Activity[];
      setActivities(list);
      if (!selectedActivity && list.length > 0) setSelectedActivity(list[0].id);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (created && typeof window !== 'undefined') {
      setJoinUrl(`${window.location.origin}/homework/${created.id}`);
    }
  }, [created]);

  const handleCreate = async () => {
    if (!selectedActivity) { setError('اختر نشاطًا أولًا'); return; }
    const endsDate = new Date(endsAt);
    if (endsDate <= new Date()) { setError('تاريخ الانتهاء يجب أن يكون في المستقبل'); return; }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: selectedActivity,
          title_override: title.trim() || null,
          starts_at: startsNow ? new Date().toISOString() : new Date(startsAt).toISOString(),
          ends_at: endsDate.toISOString(),
          shuffle_questions: shuffleQuestions,
          shuffle_choices: shuffleChoices,
          show_leaderboard: showLeaderboard,
          max_attempts: maxAttempts,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCreated({ id: data.id, session_code: data.session_code, ends_at: data.ends_at });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل الإنشاء');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────
  if (created) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ maxWidth: 620, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Success banner */}
          <div style={{
            padding: '24px', borderRadius: 20, textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(0,230,118,.15), rgba(0,200,83,.08))',
            border: '2px solid var(--green)',
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontFamily: 'var(--font-cairo)', fontSize: 24, margin: '0 0 8px', color: 'var(--green)' }}>
              تم إنشاء الواجب!
            </h2>
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-tajawal)', margin: 0 }}>
              مفتوح حتى {new Date(created.ends_at).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Code */}
          <div className="card-panel" style={{ textAlign: 'center', padding: '28px 24px' }}>
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-cairo)', fontSize: 14, marginBottom: 12 }}>كود الانضمام</p>
            <div style={{
              fontSize: 56, fontFamily: 'var(--font-space-grotesk)', fontWeight: 900,
              color: 'var(--pink)', letterSpacing: 16, marginBottom: 16,
              textShadow: '0 0 40px rgba(255,51,102,.4)',
            }}>
              {formatSessionCode(created.session_code)}
            </div>
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-tajawal)', fontSize: 13, marginBottom: 20 }}>
              شارك هذا الكود مع طلابك أو امسح QR Code
            </p>
            {joinUrl && <QRCode value={joinUrl} size={200} />}
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', wordBreak: 'break-all' }}>{joinUrl}</div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn-ghost"
              style={{ flex: 1 }}
              onClick={() => navigator.clipboard.writeText(joinUrl)}
            >
              📋 نسخ الرابط
            </button>
            <Link
              href={`/homework/monitor/${created.id}`}
              className="btn-primary"
              style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              📊 متابعة التسليمات
            </Link>
          </div>

          <Link href="/dashboard" style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-cairo)', fontSize: 14, textDecoration: 'none' }}>
            ← العودة للوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  // ── Create form ─────────────────────────────────────
  const selectedAct = activities.find(a => a.id === selectedActivity);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <Link href="/dashboard" style={backBtn}>←</Link>
          <div>
            <h1 style={{ fontFamily: 'var(--font-cairo)', fontSize: 26, margin: 0 }}>📚 واجب منزلي جديد</h1>
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-tajawal)', fontSize: 14, margin: 0 }}>
              يحل الطالب الأسئلة في أي وقت خلال الفترة المحددة
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Activity picker */}
          <div className="card-panel">
            <label style={labelStyle}>🎯 اختر النشاط</label>
            {activities.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-tajawal)' }}>
                لا توجد أنشطة منشورة — <Link href="/dashboard" style={{ color: 'var(--pink)' }}>انشر نشاطًا أولًا</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activities.map(act => (
                  <button
                    key={act.id}
                    onClick={() => setSelectedActivity(act.id)}
                    style={{
                      padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'right',
                      border: selectedActivity === act.id ? '2px solid var(--pink)' : '1px solid var(--border)',
                      background: selectedActivity === act.id ? 'rgba(255,51,102,.1)' : 'var(--bg-2)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                        {act.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {act.total_questions} سؤال · {act.subject ?? 'عام'}
                      </div>
                    </div>
                    {selectedActivity === act.id && <span style={{ color: 'var(--pink)', fontSize: 20 }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom title (optional) */}
          <div className="card-panel">
            <label style={labelStyle}>✏️ عنوان الواجب <span style={{ fontWeight: 400 }}>(اختياري — سيُستخدم عنوان النشاط إن تُرك فارغًا)</span></label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={selectedAct?.title ?? 'اكتب عنوانًا مخصصًا...'}
              className="input-field"
            />
          </div>

          {/* Time window */}
          <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>⏰ نافذة الحل</label>

            {/* Start */}
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-cairo)', marginBottom: 10 }}>بداية الواجب</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setStartsNow(true)}
                  style={{ ...toggleBtn, border: startsNow ? '2px solid var(--green)' : '1px solid var(--border)', background: startsNow ? 'rgba(0,230,118,.1)' : 'var(--bg-2)' }}
                >
                  🟢 الآن فورًا
                </button>
                <button
                  onClick={() => setStartsNow(false)}
                  style={{ ...toggleBtn, border: !startsNow ? '2px solid var(--blue)' : '1px solid var(--border)', background: !startsNow ? 'rgba(61,90,254,.1)' : 'var(--bg-2)' }}
                >
                  📅 وقت محدد
                </button>
              </div>
              {!startsNow && (
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={e => setStartsAt(e.target.value)}
                  className="input-field"
                  style={{ marginTop: 10, direction: 'ltr', textAlign: 'left' }}
                />
              )}
            </div>

            {/* End */}
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-cairo)', marginBottom: 8 }}>نهاية الواجب *</div>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={e => setEndsAt(e.target.value)}
                className="input-field"
                style={{ direction: 'ltr', textAlign: 'left' }}
              />
              {/* Quick presets */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'خلال ساعة', hours: 1 },
                  { label: 'غدًا', hours: 24 },
                  { label: '3 أيام', hours: 72 },
                  { label: 'أسبوع', hours: 168 },
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      const d = new Date();
                      d.setHours(d.getHours() + preset.hours);
                      if (preset.hours >= 24) d.setHours(23, 59, 0, 0);
                      setEndsAt(toDatetimeLocal(d));
                    }}
                    style={{
                      padding: '6px 14px', borderRadius: 999,
                      border: '1px solid var(--border)', background: 'var(--bg-2)',
                      color: 'var(--muted)', fontFamily: 'var(--font-cairo)', fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>⚙️ خيارات متقدمة</label>

            <ToggleSetting
              label="🔀 خلط ترتيب الأسئلة"
              desc="كل طالب يحصل على ترتيب مختلف"
              value={shuffleQuestions}
              onChange={setShuffleQuestions}
            />
            <ToggleSetting
              label="🔀 خلط الخيارات"
              desc="خلط الإجابات داخل كل سؤال"
              value={shuffleChoices}
              onChange={setShuffleChoices}
            />
            <ToggleSetting
              label="🏆 عرض المتصدرين"
              desc="يرى الطلاب ترتيبهم بعد الانتهاء"
              value={showLeaderboard}
              onChange={setShowLeaderboard}
            />

            {/* Max attempts */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>🔁 عدد المحاولات المسموحة</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>كم مرة يمكن للطالب إعادة الحل</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setMaxAttempts(Math.max(1, maxAttempts - 1))} style={counterBtn}>−</button>
                <span style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 20, color: 'var(--yellow)', minWidth: 24, textAlign: 'center' }}>
                  {maxAttempts}
                </span>
                <button onClick={() => setMaxAttempts(Math.min(10, maxAttempts + 1))} style={counterBtn}>+</button>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,23,68,.12)', border: '1px solid var(--danger)', color: 'var(--danger)', fontFamily: 'var(--font-tajawal)', fontSize: 14 }}>
              ❌ {error}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={loading || !selectedActivity}
            style={{ padding: '18px 24px', fontSize: 16 }}
          >
            {loading ? '⏳ جاري الإنشاء...' : '📚 إنشاء الواجب'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
function ToggleSetting({ label, desc, value, onChange }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: 'var(--bg-2)', border: `1px solid ${value ? 'var(--purple)' : 'var(--border)'}`, cursor: 'pointer', transition: 'border-color .2s' }}
    >
      <div>
        <div style={{ fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? 'var(--purple)' : 'var(--border)',
        position: 'relative', transition: 'background .2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left .2s',
        }} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 700,
  color: 'var(--muted)', marginBottom: 14, fontFamily: 'var(--font-cairo)',
};
const backBtn: React.CSSProperties = {
  color: 'var(--muted)', textDecoration: 'none', fontSize: 20,
  padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 10,
  background: 'var(--bg-2)', display: 'grid', placeItems: 'center', flexShrink: 0,
};
const toggleBtn: React.CSSProperties = {
  flex: 1, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
  fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 13, color: 'var(--text)',
};
const counterBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 18, cursor: 'pointer',
  display: 'grid', placeItems: 'center',
};
