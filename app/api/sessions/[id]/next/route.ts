import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/sessions/[id]/next
 * ينقل الجلسة للسؤال التالي، أو يُنهيها إذا كان الأخير.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: session } = await supabase
      .from('live_sessions')
      .select('host_id, current_question, activity_id')
      .eq('id', id)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.host_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = createAdminClient();

    // احسب عدد الأسئلة
    const { count } = await admin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('activity_id', session.activity_id);

    const nextQ = (session.current_question ?? 0) + 1;
    const isLast = nextQ >= (count ?? 0);

    if (isLast) {
      // استدعاء /end داخليًا لضمان إنشاء results
      const { data, error } = await admin
        .from('live_sessions')
        .update({ status: 'finished', ended_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // أنشئ نتائج نهائية
      await createResultsForSession(admin, id);

      return NextResponse.json({ session: data, finished: true });
    }

    const { data, error } = await admin
      .from('live_sessions')
      .update({ current_question: nextQ })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ session: data, finished: false });
  } catch (err: unknown) {
    console.error('next question error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createResultsForSession(admin: any, sessionId: string) {
  try {
    const { data: parts } = await admin
      .from('participants')
      .select('id, total_score, correct_count, wrong_count, avg_time_ms, current_rank')
      .eq('session_id', sessionId)
      .order('total_score', { ascending: false });

    if (!parts || parts.length === 0) return;

    const rows = parts.map((p: {
      id: string; total_score: number; correct_count: number; wrong_count: number;
      avg_time_ms: number; current_rank: number | null;
    }, i: number) => {
      const totalAnswers = p.correct_count + p.wrong_count;
      return {
        session_id: sessionId,
        participant_id: p.id,
        final_rank: p.current_rank ?? (i + 1),
        final_score: p.total_score,
        total_correct: p.correct_count,
        total_wrong: p.wrong_count,
        accuracy_percentage: totalAnswers > 0
          ? Number((100 * p.correct_count / totalAnswers).toFixed(2))
          : 0,
        avg_response_time_ms: p.avg_time_ms,
      };
    });

    await admin.from('results').upsert(rows, { onConflict: 'session_id,participant_id' });
  } catch (e) {
    console.error('createResults error:', e);
  }
}
