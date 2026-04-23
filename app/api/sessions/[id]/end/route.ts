import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/sessions/[id]/end
 * ينهي الجلسة ويولّد صفًا في جدول results لكل مشارك (لقطة نهائية ثابتة).
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
      .from('live_sessions').select('host_id, status').eq('id', id).single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.host_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = createAdminClient();

    // 1. حدّث حالة الجلسة
    const { data: updated, error } = await admin
      .from('live_sessions')
      .update({ status: 'finished', ended_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 2. أنشئ لقطة نتائج ثابتة في جدول results
    const { data: parts } = await admin
      .from('participants')
      .select('id, total_score, correct_count, wrong_count, avg_time_ms, current_rank')
      .eq('session_id', id)
      .order('total_score', { ascending: false });

    if (parts && parts.length > 0) {
      const rows = parts.map((p, i) => {
        const totalAnswers = (p.correct_count ?? 0) + (p.wrong_count ?? 0);
        return {
          session_id: id,
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
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error('end session error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
