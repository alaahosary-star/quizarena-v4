import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface ChoiceDraft {
  choice_text: string;
  is_correct: boolean;
  image_url?: string | null;
}

interface QuestionDraft {
  question_text: string;
  question_type: string;
  image_url?: string | null;
  time_limit: number;
  points: number;
  speed_bonus: boolean;
  explanation?: string | null;
  choices: ChoiceDraft[];
}

/**
 * PUT /api/activities/[id]/questions
 * يحذف كل أسئلة النشاط ويُدرج الأسئلة الجديدة (bulk replace).
 * يُستخدم من صفحة الـ builder للحفظ.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // تحقّق من الملكية
    const { data: act } = await supabase
      .from('activities').select('teacher_id').eq('id', id).single();
    if (!act) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    if (act.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { questions } = (await req.json()) as { questions: QuestionDraft[] };
    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: 'questions must be array' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. حذف الأسئلة القديمة (cascade يحذف choices تلقائيًا)
    const { error: delErr } = await admin.from('questions').delete().eq('activity_id', id);
    if (delErr) throw delErr;

    if (questions.length === 0) {
      return NextResponse.json({ inserted: 0 });
    }

    // 2. إدراج الأسئلة الجديدة
    const { data: insertedQs, error: qErr } = await admin
      .from('questions')
      .insert(
        questions.map((q, i) => ({
          activity_id: id,
          question_text: q.question_text,
          question_type: q.question_type,
          image_url: q.image_url ?? null,
          time_limit: q.time_limit,
          points: q.points,
          speed_bonus: q.speed_bonus,
          order_index: i,
          explanation: q.explanation ?? null,
        }))
      )
      .select('id');

    if (qErr || !insertedQs) throw qErr ?? new Error('Failed to insert questions');

    // 3. إدراج كل الخيارات
    const choicesPayload = insertedQs.flatMap((dbQ, i) =>
      (questions[i].choices ?? []).map((c, ci) => ({
        question_id: dbQ.id,
        choice_text: c.choice_text,
        is_correct: c.is_correct,
        order_index: ci,
        image_url: c.image_url ?? null,
      }))
    );

    if (choicesPayload.length > 0) {
      const { error: cErr } = await admin.from('choices').insert(choicesPayload);
      if (cErr) throw cErr;
    }

    return NextResponse.json({ inserted: insertedQs.length });
  } catch (err: unknown) {
    console.error('save questions error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities/[id]/questions
 * يُدرج أسئلة جديدة بدون حذف (للمولّد الذكي).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: act } = await supabase
      .from('activities').select('teacher_id').eq('id', id).single();
    if (!act) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    if (act.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { questions } = (await req.json()) as { questions: QuestionDraft[] };
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'questions required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // احسب رقم البداية
    const { data: maxRow } = await admin
      .from('questions')
      .select('order_index')
      .eq('activity_id', id)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    const startIndex = maxRow?.order_index != null ? maxRow.order_index + 1 : 0;

    const { data: insertedQs, error: qErr } = await admin
      .from('questions')
      .insert(
        questions.map((q, i) => ({
          activity_id: id,
          question_text: q.question_text,
          question_type: q.question_type,
          image_url: q.image_url ?? null,
          time_limit: q.time_limit,
          points: q.points,
          speed_bonus: q.speed_bonus,
          order_index: startIndex + i,
          explanation: q.explanation ?? null,
        }))
      )
      .select('id');

    if (qErr || !insertedQs) throw qErr ?? new Error('Insert failed');

    const choicesPayload = insertedQs.flatMap((dbQ, i) =>
      (questions[i].choices ?? []).map((c, ci) => ({
        question_id: dbQ.id,
        choice_text: c.choice_text,
        is_correct: c.is_correct,
        order_index: ci,
      }))
    );

    if (choicesPayload.length > 0) {
      const { error: cErr } = await admin.from('choices').insert(choicesPayload);
      if (cErr) throw cErr;
    }

    return NextResponse.json({ inserted: insertedQs.length }, { status: 201 });
  } catch (err: unknown) {
    console.error('append questions error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
