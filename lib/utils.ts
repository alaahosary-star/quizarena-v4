/**
 * توليد كود جلسة 6 أرقام
 */
export function generateSessionCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * إعادة كود جلسة منسّق (847 193)
 */
export function formatSessionCode(code: string): string {
  return code.replace(/(\d{3})(\d{3})/, '$1 $2');
}

/**
 * اختيار لون عشوائي للـ avatar
 */
const AVATAR_COLORS = [
  '#FF3366', '#00E676', '#FFD700', '#3D5AFE', '#7C4DFF',
  '#FF1744', '#00C853', '#FF8F00', '#2962FF', '#651FFF',
];

export function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/**
 * تعداد الحروف العربية للخيارات
 */
export const ARABIC_LETTERS = ['أ', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح'];

/**
 * تأثير confetti
 */
export function launchConfetti(count = 80) {
  if (typeof window === 'undefined') return;
  const colors = ['#FF3366', '#00E676', '#FFD700', '#3D5AFE', '#7C4DFF'];
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration = 2 + Math.random() * 2 + 's';
    c.style.animationDelay = Math.random() * 0.5 + 's';
    const size = 6 + Math.random() * 8;
    c.style.width = size + 'px';
    c.style.height = size + 'px';
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4500);
  }
}

/**
 * تنسيق الوقت
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}د ${s}ث`;
  return `${s}ث`;
}

/**
 * تنسيق الزمن بالأحرف (12.4s)
 */
export function formatMs(ms: number): string {
  return (ms / 1000).toFixed(1) + 's';
}
