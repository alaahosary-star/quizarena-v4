'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { createClient } from '@/lib/supabase/client';
import { sfx } from '@/lib/sound/engine';
import { formatTime } from '@/lib/utils';
import type { Activity, User } from '@/lib/supabase/types';

type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

interface Stats {
  total: number;
  published: number;
  totalQuestions: number;
  totalSessions: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    published: 0,
    totalQuestions: 0,
    totalSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);

  // ─── جلب البيانات ───
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // المستخدم الحالي
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/login');
          return;
        }

        // بيانات البروفايل
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (!cancelled && profile) setUser(profile as User);

        // الأنشطة
        const { data: acts, error: actsErr } = await supabase
          .from('activities')
          .select('*')
          .eq('teacher_id', authUser.id)
          .order('updated_at', { ascending: false });

        if (actsErr) throw actsErr;
        if (cancelled) return;

        const list = (acts ?? []) as Activity[];
        setActivities(list);

        // عدد الجلسات الإجمالي
        const { count: sessionsCount } = await supabase
          .from('live_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', authUser.id);

        setStats({
          total: list.length,
          published: list.filter((a) => a.status === 'published').length,
          totalQuestions: list.reduce((s, a) => s + (a.total_questions || 0), 0),
          totalSessions: sessionsCount ?? 0,
        });
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── فلترة + بحث ───
  const filtered = activities.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (
      search &&
      !a.title.toLowerCase().includes(search.toLowerCase()) &&
      !a.description?.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  // ─── إنشاء نشاط جديد ───
  const createActivity = async () => {
    if (!user) return;
    setCreatingNew(true);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'نشاط جديد',
          subject: user.school_name ? 'العلوم' : null,
          grade: user.grade_level ?? null,
          status: 'draft',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Create failed');

      sfx.correct();
      router.push(`/builder/${data.id}`);
    } catch (err) {
      console.error('Create error:', err);
      sfx.wrong();
      alert('فشل إنشاء النشاط. حاول مرة أخرى.');
    } finally {
      setCreatingNew(false);
    }
  };

  // ─── تسجيل الخروج ───
  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ─── حذف نشاط ───
  const deleteActivity = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف "${title}"؟ لا يمكن التراجع.`)) return;
    try {
      const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Delete failed');
      setActivities(activities.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      alert('فشل الحذف');
    }
  };

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Welcome header */}
        <section
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--muted)',
                fontFamily: 'var(--font-cairo)',
                marginBottom: 6,
              }}
            >
              لوحة التحكم
            </div>
            <h1 style={{ fontSize: 36, marginBottom: 6 }}>
              {user ? (
                <>
                  أهلاً{' '}
                  <span
                    style={{
                      background:
                        'linear-gradient(135deg, var(--pink), var(--yellow))',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    {user.full_name}
                  </span>{' '}
                  👋
                </>
              ) : (
                'لوحة المعلم'
              )}
            </h1>
            {user?.school_name && (
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                {user.school_name}
                {user.grade_level ? ` • ${user.grade_level}` : ''}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={logout}
              className="btn-ghost"
              style={{ padding: '12px 18px', fontSize: 13 }}
              title="تسجيل الخروج"
            >
              خروج
            </button>
            <button
              onClick={createActivity}
              disabled={creatingNew}
              className="btn-primary"
            >
              {creatingNew ? 'جارٍ الإنشاء…' : '+ نشاط جديد'}
            </button>
          </div>
        </section>

        {/* Stats cards */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
            marginBottom: 32,
          }}
        >
          <StatCard
            icon="📚"
            label="إجمالي الأنشطة"
            value={stats.total}
            accent="var(--pink)"
          />
          <StatCard
            icon="✅"
            label="منشورة"
            value={stats.published}
            accent="var(--green)"
          />
          <StatCard
            icon="❓"
            label="إجمالي الأسئلة"
            value={stats.totalQuestions}
            accent="var(--yellow)"
          />
          <StatCard
            icon="🎮"
            label="جلسات أُقيمت"
            value={stats.totalSessions}
            accent="var(--blue)"
          />
        </section>

        {/* Quick actions row */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 14,
            marginBottom: 32,
          }}
        >
          <QuickAction
            href="/generator"
            icon="🤖"
            title="مولّد الأسئلة الذكي"
            desc="اكتب الموضوع واحصل على أسئلة جاهزة"
            color="var(--purple)"
          />
          <QuickAction
            href="#"
            onClick={createActivity}
            icon="✏️"
            title="أنشئ نشاطًا يدويًا"
            desc="ابدأ من صفحة فارغة"
            color="var(--pink)"
          />
          <QuickAction
            href="/dashboard"
            icon="📊"
            title="التقارير والتحليلات"
            desc="قريبًا — نتائج الطلاب وأصعب الأسئلة"
            color="var(--blue)"
            disabled
          />
        </section>

        {/* List header: filter + search */}
        <section
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 22 }}>📋 أنشطتي</h2>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Filter tabs */}
            <div
              style={{
                display: 'flex',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 4,
              }}
            >
              {(
                [
                  { k: 'all', label: 'الكل', n: activities.length },
                  {
                    k: 'draft',
                    label: 'مسودات',
                    n: activities.filter((a) => a.status === 'draft').length,
                  },
                  {
                    k: 'published',
                    label: 'منشورة',
                    n: activities.filter((a) => a.status === 'published').length,
                  },
                  {
                    k: 'archived',
                    label: 'أرشيف',
                    n: activities.filter((a) => a.status === 'archived').length,
                  },
                ] as { k: StatusFilter; label: string; n: number }[]
              ).map(({ k, label, n }) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 0,
                    background: filter === k ? 'var(--bg-2)' : 'transparent',
                    color: filter === k ? 'var(--text)' : 'var(--muted)',
                    fontFamily: 'var(--font-cairo)',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all .15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {label}
                  {n > 0 && (
                    <span
                      style={{
                        padding: '1px 7px',
                        background:
                          filter === k ? 'var(--pink)' : 'var(--border)',
                        color: filter === k ? '#fff' : 'var(--muted)',
                        borderRadius: 999,
                        fontSize: 11,
                        fontFamily: 'var(--font-space-grotesk)',
                      }}
                    >
                      {n}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 ابحث…"
              className="input-field"
              style={{ maxWidth: 240, padding: '10px 14px' }}
            />
          </div>
        </section>

        {/* Activities grid */}
        {loading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            hasAny={activities.length > 0}
            onCreate={createActivity}
          />
        ) : (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}
          >
            {filtered.map((a) => (
              <ActivityCard
                key={a.id}
                activity={a}
                onDelete={() => deleteActivity(a.id, a.title)}
              />
            ))}
          </section>
        )}
      </main>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      className="card-panel"
      style={{ padding: 18, position: 'relative', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          top: -20,
          left: -20,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: accent,
          opacity: 0.12,
          filter: 'blur(20px)',
        }}
      />
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          fontFamily: 'var(--font-cairo)',
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontFamily: 'var(--font-space-grotesk)',
          fontWeight: 900,
          color: 'var(--text)',
          lineHeight: 1,
        }}
      >
        {value.toLocaleString('ar-EG')}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  desc,
  color,
  onClick,
  disabled,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const content = (
    <>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: color,
          color: '#0B0B1E',
          display: 'grid',
          placeItems: 'center',
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontFamily: 'var(--font-cairo)',
            fontWeight: 900,
            fontSize: 15,
            marginBottom: 3,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
          {desc}
        </div>
      </div>
    </>
  );

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    background:
      'linear-gradient(180deg, var(--card), var(--card-2))',
    border: '1px solid var(--border)',
    borderRadius: 16,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all .2s',
    textDecoration: 'none',
    color: 'inherit',
    opacity: disabled ? 0.55 : 1,
    textAlign: 'right',
    width: '100%',
    fontFamily: 'inherit',
  };

  if (onClick) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={style}
        onMouseEnter={(e) =>
          !disabled && (e.currentTarget.style.borderColor = color)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = 'var(--border)')
        }
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={disabled ? '#' : href}
      style={style}
      onMouseEnter={(e) =>
        !disabled && (e.currentTarget.style.borderColor = color)
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = 'var(--border)')
      }
    >
      {content}
    </Link>
  );
}

function ActivityCard({
  activity,
  onDelete,
}: {
  activity: Activity;
  onDelete: () => void;
}) {
  const statusMeta: Record<
    Activity['status'],
    { label: string; color: string; bg: string }
  > = {
    draft: {
      label: 'مسودة',
      color: 'var(--yellow)',
      bg: 'rgba(255,215,0,.12)',
    },
    published: {
      label: 'منشورة',
      color: 'var(--green)',
      bg: 'rgba(0,230,118,.12)',
    },
    archived: {
      label: 'أرشيف',
      color: 'var(--muted)',
      bg: 'rgba(139,139,181,.12)',
    },
  };
  const s = statusMeta[activity.status];

  return (
    <article
      className="card-panel"
      style={{
        padding: 0,
        overflow: 'hidden',
        transition: 'all .2s',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Cover / gradient header */}
      <div
        style={{
          height: 96,
          background: `linear-gradient(135deg, rgba(255,51,102,.4), rgba(124,77,255,.35), rgba(61,90,254,.3))`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: 42, opacity: 0.6 }}>🎯</div>
        <span
          style={{
            position: 'absolute',
            top: 10,
            insetInlineEnd: 10,
            padding: '3px 10px',
            background: s.bg,
            color: s.color,
            borderRadius: 999,
            fontSize: 11,
            fontFamily: 'var(--font-cairo)',
            fontWeight: 700,
            border: `1px solid ${s.color}`,
          }}
        >
          {s.label}
        </span>
      </div>

      <div
        style={{
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flex: 1,
        }}
      >
        <h3
          style={{
            fontSize: 17,
            lineHeight: 1.4,
            minHeight: 46,
            fontFamily: 'var(--font-cairo)',
          }}
        >
          {activity.title}
        </h3>

        {activity.description && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--muted)',
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {activity.description}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 'auto',
            paddingTop: 8,
            fontSize: 12,
            color: 'var(--muted)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            title="عدد الأسئلة"
          >
            ❓{' '}
            <strong
              style={{
                color: 'var(--text)',
                fontFamily: 'var(--font-space-grotesk)',
              }}
            >
              {activity.total_questions}
            </strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            ⏱{' '}
            <strong
              style={{
                color: 'var(--text)',
                fontFamily: 'var(--font-space-grotesk)',
              }}
            >
              {activity.estimated_time
                ? formatTime(activity.estimated_time)
                : '—'}
            </strong>
          </span>
          {activity.subject && <span>• {activity.subject}</span>}
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            gap: 6,
            marginTop: 6,
          }}
        >
          <Link
            href={`/builder/${activity.id}`}
            className="btn-primary"
            style={{
              textDecoration: 'none',
              padding: '10px 14px',
              fontSize: 13,
            }}
          >
            ✏️ تحرير
          </Link>
          {activity.status === 'published' && activity.total_questions > 0 && (
            <Link
              href={`/host/new?activity=${activity.id}`}
              className="btn-success"
              style={{
                textDecoration: 'none',
                padding: '10px 14px',
                fontSize: 13,
              }}
              title="بدء جلسة مباشرة"
            >
              ▶
            </Link>
          )}
          {activity.status === 'published' && activity.total_questions > 0 && (
            <Link
              href={`/homework/new?activity=${activity.id}`}
              style={{
                textDecoration: 'none',
                padding: '10px 14px',
                fontSize: 13,
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'rgba(124,77,255,.12)',
                color: 'var(--purple)',
                fontWeight: 700,
                fontFamily: 'var(--font-cairo)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              title="واجب منزلي"
            >
              📚
            </Link>
          )}
          <button
            onClick={onDelete}
            className="btn-ghost"
            style={{ padding: '10px 12px', fontSize: 13 }}
            title="حذف"
          >
            🗑
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  hasAny,
  onCreate,
}: {
  hasAny: boolean;
  onCreate: () => void;
}) {
  return (
    <div
      className="card-panel"
      style={{
        padding: 48,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 14 }}>
        {hasAny ? '🔍' : '🎯'}
      </div>
      <h3 style={{ fontSize: 22, marginBottom: 8 }}>
        {hasAny ? 'لا توجد نتائج مطابقة' : 'أنشئ أول مسابقاتك!'}
      </h3>
      <p
        style={{
          color: 'var(--muted)',
          fontSize: 14,
          marginBottom: 20,
          maxWidth: 420,
          marginInline: 'auto',
          lineHeight: 1.7,
        }}
      >
        {hasAny
          ? 'جرّب تغيير الفلتر أو مسح البحث لرؤية كل أنشطتك.'
          : 'ابدأ من صفحة فارغة أو استخدم مولّد الأسئلة الذكي لإنشاء أسئلة تلقائيًا.'}
      </p>
      {!hasAny && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onCreate} className="btn-primary">
            + ابدأ نشاطًا جديدًا
          </button>
          <Link
            href="/generator"
            className="btn-ghost"
            style={{ textDecoration: 'none' }}
          >
            🤖 جرّب المولّد الذكي
          </Link>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16,
      }}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="card-panel"
          style={{
            padding: 0,
            overflow: 'hidden',
            opacity: 0.6,
          }}
        >
          <div
            style={{
              height: 96,
              background:
                'linear-gradient(90deg, var(--bg-2), var(--card), var(--bg-2))',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }}
          />
          <div style={{ padding: 16 }}>
            <div
              style={{
                height: 20,
                width: '70%',
                background: 'var(--bg-2)',
                borderRadius: 6,
                marginBottom: 10,
              }}
            />
            <div
              style={{
                height: 14,
                width: '90%',
                background: 'var(--bg-2)',
                borderRadius: 6,
                marginBottom: 6,
              }}
            />
            <div
              style={{
                height: 14,
                width: '60%',
                background: 'var(--bg-2)',
                borderRadius: 6,
              }}
            />
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
