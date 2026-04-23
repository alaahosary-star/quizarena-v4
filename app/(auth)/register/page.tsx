'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sfx } from '@/lib/sound/engine';
import { randomAvatarColor } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [school, setSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('كلمة المرور يجب ألا تقل عن 6 أحرف');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            school_name: school,
            role: 'teacher',
            avatar_color: randomAvatarColor(),
          },
        },
      });
      if (err) throw err;

      // Upsert a profile row into users table (via API — no direct upsert)
      if (data.user) {
        await fetch('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName,
            school_name: school,
            role: 'teacher',
            avatar_color: randomAvatarColor(),
          }),
        });
      }

      sfx.correct();
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل إنشاء الحساب';
      setError(msg);
      sfx.wrong();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-panel">
      <h1 style={{ fontSize: 26, marginBottom: 8, textAlign: 'center' }}>ابدأ كمعلم</h1>
      <p
        style={{
          color: 'var(--muted)',
          textAlign: 'center',
          marginBottom: 28,
          fontSize: 14,
        }}
      >
        أنشئ حسابك المجاني وابدأ أول مسابقة
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 8,
              fontFamily: 'var(--font-cairo)',
            }}
          >
            الاسم الكامل
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="أ. علاء محمد"
            className="input-field"
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 8,
              fontFamily: 'var(--font-cairo)',
            }}
          >
            المدرسة (اختياري)
          </label>
          <input
            type="text"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="مدرسة سمو الشيخ محمد بن خليفة"
            className="input-field"
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 8,
              fontFamily: 'var(--font-cairo)',
            }}
          >
            البريد الإلكتروني
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.edu"
            className="input-field"
            dir="ltr"
            style={{ textAlign: 'left' }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 8,
              fontFamily: 'var(--font-cairo)',
            }}
          >
            كلمة المرور
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6 أحرف على الأقل"
            className="input-field"
          />
        </div>

        {error && (
          <div
            style={{
              padding: 12,
              background: 'rgba(255,23,68,.12)',
              border: '1px solid var(--danger)',
              borderRadius: 10,
              color: 'var(--danger)',
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ marginTop: 8 }}
        >
          {loading ? 'جارٍ الإنشاء...' : 'أنشئ الحساب'}
        </button>
      </form>

      <div
        style={{
          textAlign: 'center',
          marginTop: 24,
          color: 'var(--muted)',
          fontSize: 14,
        }}
      >
        لديك حساب؟{' '}
        <Link href="/login" style={{ color: 'var(--pink)', fontWeight: 700 }}>
          سجّل دخول
        </Link>
      </div>
    </div>
  );
}
