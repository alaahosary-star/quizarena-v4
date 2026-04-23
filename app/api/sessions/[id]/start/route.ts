import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/sessions/[id]/start
 * يبدأ الجلسة — ينقل حالتها من 'waiting' إلى 'active'.
 * فقط مضيف الجلسة يسمح له.
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

    // تحقّق من الملكية قبل الكتابة
    const { data: session } = await supabase
      .from('live_sessions')
      .select('host_id')
      .eq('id', id)
      .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.host_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // نستخدم admin client لتجاوز RLS بأمان
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('live_sessions')
      .update({
        status: 'active',
        current_question: 0,
        started_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('start session error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
