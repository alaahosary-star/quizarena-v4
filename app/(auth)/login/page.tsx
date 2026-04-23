'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sfx } from '@/lib/sound/engine';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      sfx.correct();
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تسجيل الدخول';
      setError(msg);
      sfx.wrong();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-panel">
      <h1 style={{ fontSize: 26, marginBottom: 8, textAlign: 'center' }}>مرحبًا من جديد</h1>
      <p
        style={{
          color: 'var(--muted)',
          textAlign: 'center',
          marginBottom: 28,
          fontSize: 14,
        }}
      >
        سجّل دخولك لإدارة مسابقاتك
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
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
          {loading ? 'جارٍ التسجيل...' : 'دخول'}
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
        ليس لديك حساب؟{' '}
        <Link href="/register" style={{ color: 'var(--pink)', fontWeight: 700 }}>
          أنشئ حساب
        </Link>
      </div>

      <div
        style={{
          textAlign: 'center',
          marginTop: 16,
          padding: 12,
          background: 'var(--bg-2)',
          borderRadius: 10,
          fontSize: 13,
          color: 'var(--muted)',
        }}
      >
        هل أنت طالب؟{' '}
        <Link href="/join" style={{ color: 'var(--yellow)', fontWeight: 700 }}>
          ادخل بالرمز →
        </Link>
      </div>
    </div>
  );
}
