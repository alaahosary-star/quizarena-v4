/**
 * محرك احتساب النقاط
 * يأخذ بعين الاعتبار الإجابة الصحيحة + سرعة الإجابة
 */

export interface ScoringInput {
  isCorrect: boolean;
  basePoints: number;
  timeTakenMs: number;
  timeLimitSec: number;
  speedBonus: boolean;
}

export interface ScoringOutput {
  total: number;
  base: number;
  bonus: number;
}

export function calculateScore(input: ScoringInput): ScoringOutput {
  if (!input.isCorrect) return { total: 0, base: 0, bonus: 0 };

  const timeLimitMs = input.timeLimitSec * 1000;
  const timeUsedRatio = Math.min(input.timeTakenMs / timeLimitMs, 1);

  // Base points: يخسر حتى 50% حسب الوقت المستخدم
  const speedMultiplier = 1 - timeUsedRatio * 0.5;
  const base = Math.round(input.basePoints * speedMultiplier);

  // Speed bonus: مكافأة إضافية للإجابة السريعة
  const bonus = input.speedBonus
    ? Math.round(input.basePoints * 0.5 * (1 - timeUsedRatio))
    : 0;

  return { total: base + bonus, base, bonus };
}

/**
 * كسر التعادل: الأسرع يفوز
 * مقارنة بين مشاركين
 */
export function compareParticipants(
  a: { score: number; avgTimeMs: number },
  b: { score: number; avgTimeMs: number }
): number {
  if (a.score !== b.score) return b.score - a.score;
  return a.avgTimeMs - b.avgTimeMs;
}
