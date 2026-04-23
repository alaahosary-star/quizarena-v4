import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 28px' }}>
        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '64px 0 48px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 999,
              color: 'var(--muted)',
              fontFamily: 'var(--font-cairo)',
              fontSize: 13,
              marginBottom: 24,
            }}
          >
            🎯 منصة تعليمية للمعلمين والطلاب العرب
          </div>
          <h1
            style={{
              fontSize: 'clamp(40px, 8vw, 72px)',
              lineHeight: 1.1,
              marginBottom: 20,
              background:
                'linear-gradient(135deg, var(--pink), var(--yellow), var(--green))',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              animation: 'gradientShift 6s ease infinite',
            }}
          >
            مسابقات تفاعلية
            <br />
            تُحيي الفصل الدراسي
          </h1>
          <p
            style={{
              fontSize: 18,
              color: 'var(--muted)',
              maxWidth: 600,
              margin: '0 auto 36px',
              lineHeight: 1.8,
            }}
          >
            أنشئ مسابقات حية، أطلق أسئلة ذكية، وشاهد طلابك يتفاعلون في الوقت الفعلي
            — نقاط، ترتيب لحظي، ومرح حقيقي.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link href="/register" className="btn-primary" style={{ textDecoration: 'none' }}>
              ابدأ كمعلم ←
            </Link>
            <Link href="/join" className="btn-ghost" style={{ textDecoration: 'none' }}>
              دخول كطالب
            </Link>
          </div>
        </section>

        {/* Features */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
            marginTop: 48,
          }}
        >
          {[
            {
              icon: '⚡',
              title: 'مسابقات مباشرة',
              body: 'رمز 6 أرقام + QR — الطلاب يدخلون خلال ثوانٍ من أي جهاز.',
            },
            {
              icon: '🤖',
              title: 'مولّد أسئلة ذكي',
              body: 'اكتب الموضوع، واحصل على أسئلة جاهزة بالدرجة الصعوبة المطلوبة.',
            },
            {
              icon: '🏆',
              title: 'ترتيب لحظي',
              body: 'منصّة Top 3، نقاط سرعة، ومنافسة حقيقية تحفّز الطلاب.',
            },
            {
              icon: '📊',
              title: 'تقارير للمعلم',
              body: 'أصعب الأسئلة، أضعف الطلاب، وتحليل لكل جلسة.',
            },
            {
              icon: '🎨',
              title: '٨ أنواع أسئلة',
              body: 'اختيار، صح/خطأ، ملء فراغ، مطابقة، ترتيب، وأكثر.',
            },
            {
              icon: '🔊',
              title: 'أصوات وحركة',
              body: 'عدّاد ينبض، أصوات نجاح وفشل، وتأثيرات confetti.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="card-panel"
              style={{ animation: 'fadeIn .6s ease' }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: 'var(--muted)', lineHeight: 1.7, fontSize: 14 }}>
                {f.body}
              </p>
            </div>
          ))}
        </section>

        {/* CTA strip */}
        <section
          className="card-panel"
          style={{
            marginTop: 64,
            textAlign: 'center',
            padding: 48,
            background:
              'linear-gradient(135deg, rgba(124,77,255,.15), rgba(255,51,102,.12))',
          }}
        >
          <h2 style={{ fontSize: 32, marginBottom: 12 }}>
            جاهز تحوّل الفصل لساحة منافسة؟
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
            مجاني تمامًا — ابنِ أول مسابقة خلال دقائق.
          </p>
          <Link href="/register" className="btn-primary" style={{ textDecoration: 'none' }}>
            أنشئ حساب معلم →
          </Link>
        </section>

        {/* Footer */}
        <footer
          style={{
            textAlign: 'center',
            color: 'var(--muted)',
            padding: '48px 0 24px',
            fontSize: 13,
          }}
        >
          © {new Date().getFullYear()} QuizArena — صُنع للمعلمين العرب 💚
        </footer>
      </main>
    </>
  );
}
