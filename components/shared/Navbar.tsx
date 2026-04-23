'use client';

import Link from 'next/link';
import { SoundToggle } from './SoundToggle';

export function Navbar() {
  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '18px 28px',
        background: 'rgba(11,11,30,.7)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Link
        href="/"
        style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'conic-gradient(from 45deg, var(--pink), var(--yellow), var(--green), var(--blue), var(--pink))',
            display: 'grid',
            placeItems: 'center',
            color: '#0B0B1E',
            fontWeight: 900,
            fontFamily: 'var(--font-cairo)',
            boxShadow: '0 6px 20px rgba(255,51,102,.35)',
          }}
        >
          Q
        </div>
        <span style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 22 }}>
          QuizArena
        </span>
      </Link>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link
          href="/dashboard"
          style={{ color: 'var(--muted)', textDecoration: 'none', fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 14 }}
        >
          المعلم
        </Link>
        <Link
          href="/join"
          style={{ color: 'var(--muted)', textDecoration: 'none', fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 14 }}
        >
          الطالب
        </Link>
        <SoundToggle />
      </div>
    </nav>
  );
}
