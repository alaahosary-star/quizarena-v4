import type { Metadata } from 'next';
import { Cairo, Tajawal, Space_Grotesk } from 'next/font/google';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700', '900'],
  variable: '--font-cairo',
});

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
});

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'QuizArena — منصة المسابقات التفاعلية',
  description: 'منصة تعليمية تفاعلية للمعلمين والطلاب — مسابقات مباشرة بنظام نقاط وترتيب لحظي',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${tajawal.variable} ${grotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
