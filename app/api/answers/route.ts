import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateScore } from '@/lib/scoring';

/**
 * POST /api/answers
 * يستقبل إجابة طالب (أو skipped) ويسجلها.
 * الـ trigger في قاعدة البيانات يتولى تحديث participants تلقائيًا
 * (total_score + correct_count + wrong_count + avg_time_ms + current_rank)،
 * لذا لا يوجد تحديث يدوي هنا لتجنب الاحتساب المزدوج.
 */
export async function POST(req: NextRequest) {
  try {
    // نستخدم admin client لتجاوز RLS بأمان
    // (التحقق من صلاحية المشارك/السؤال يتم يدويًا داخل هذا الـ route)
    const admin = createAdminClient();

    const body = await req.json();
    const {
      session_id,
      participant_id,
      question_id,
      choice_id,
      answer_text,
      time_taken_ms,
      skipped = false,
    } = body;

    if (!session_id || !participant_id || !question_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. تحقّق أن المشارك ينتمي فعلاً للجلسة
    const { data: participant } = await admin
      .from('participants')
      .select('session_id')
      .eq('id', participant_id)
      .single();

    if (!participant || participant.session_id !== session_id) {
      return NextResponse.json({ error: 'Invalid participant' }, { status: 403 });
    }

    // 2. تحقّق أن الجلسة نشطة (active أو paused)
    const { data: session } = await admin
      .from('live_sessions')
      .select('status, mode')
      .eq('id', session_id)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (!['active', 'paused'].includes(session.status)) {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
    }

    // 3. منع إدراج إجابة مكررة لنفس (participant, question)
    const { data: existing } = await admin
      .from('answers')
      .select('id')
      .eq('participant_id', participant_id)
      .eq('question_id', question_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Already answered' }, { status: 409 });
    }

    // 4. اقرأ السؤال وخياراته
    const { data: question } = await admin
      .from('questions')
      .select('*, choices(*)')
      .eq('id', question_id)
      .single();

    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    // 5. احكم على الإجابة
    const is_correct = skipped ? false : checkAnswer(question, choice_id, answer_text);

    // 6. احسب النقاط (0 لو skipped أو خطأ)
    const { total, base, bonus } = skipped
      ? { total: 0, base: 0, bonus: 0 }
      : calculateScore({
          isCorrect: is_correct,
          basePoints: question.points,
          timeTakenMs: time_taken_ms ?? 0,
          timeLimitSec: question.time_limit,
          speedBonus: question.speed_bonus,
        });

    // 7. احفظ الإجابة
    //    IMPORTANT: points_earned = base فقط (المكافأة منفصلة في speed_bonus)
    //    الـ trigger يضيف الاثنين إلى total_score (base + speed_bonus)
    const { data: answer, error: ansErr } = await admin
      .from('answers')
      .insert({
        session_id,
        participant_id,
        question_id,
        choice_id: choice_id ?? null,
        answer_text: answer_text ?? null,
        is_correct,
        time_taken_ms: Math.max(0, time_taken_ms ?? 0),
        points_earned: base,
        speed_bonus: bonus,
      })
      .select()
      .single();

    if (ansErr) throw ansErr;

    // 8. اقرأ المجموع المحدّث بعد الـ trigger
    const { data: updatedParticipant } = await admin
      .from('participants')
      .select('total_score, current_rank')
      .eq('id', participant_id)
      .single();

    return NextResponse.json({
      answer,
      is_correct,
      points_earned: total,  // للواجهة (base + bonus)
      base,
      bonus,
      total_score: updatedParticipant?.total_score ?? 0,
      rank: updatedParticipant?.current_rank ?? null,
    });
  } catch (err: unknown) {
    console.error('answers route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkAnswer(question: any, choiceId: string | null, text: string | null): boolean {
  if (question.question_type === 'fill_blank') {
    if (!text) return false;
    const correct = question.choices?.find((c: { is_correct: boolean }) => c.is_correct);
    if (!correct) return false;
    return correct.choice_text.trim().toLowerCase() === text.trim().toLowerCase();
  }
  if (!choiceId) return false;
  const selected = question.choices?.find((c: { id: string }) => c.id === choiceId);
  return selected?.is_correct ?? false;
}
