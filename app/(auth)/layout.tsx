import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            color: 'inherit',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background:
                'conic-gradient(from 45deg, var(--pink), var(--yellow), var(--green), var(--blue), var(--pink))',
              display: 'grid',
              placeItems: 'center',
              color: '#0B0B1E',
              fontWeight: 900,
              fontFamily: 'var(--font-cairo)',
              fontSize: 20,
              boxShadow: '0 6px 20px rgba(255,51,102,.35)',
            }}
          >
            Q
          </div>
          <span style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 26 }}>
            QuizArena
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
