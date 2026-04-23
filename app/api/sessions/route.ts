import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSessionCode } from '@/lib/utils';

/**
 * POST /api/sessions
 * يُنشئ جلسة مباشرة جديدة لنشاط.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { activity_id, mode = 'live' } = await req.json();
    if (!activity_id) {
      return NextResponse.json({ error: 'activity_id required' }, { status: 400 });
    }

    // تأكد أن المستخدم يملك النشاط
    const { data: act } = await supabase
      .from('activities')
      .select('teacher_id, status')
      .eq('id', activity_id)
      .single();

    if (!act) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    if (act.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();

    // توليد كود فريد
    let session_code = generateSessionCode();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await admin
        .from('live_sessions')
        .select('id')
        .eq('session_code', session_code)
        .in('status', ['waiting', 'active', 'paused'])
        .maybeSingle();
      if (!existing) break;
      session_code = generateSessionCode();
    }

    const { data: session, error } = await admin
      .from('live_sessions')
      .insert({
        activity_id,
        host_id: user.id,
        session_code,
        mode,
        status: 'waiting',
        current_question: 0,
        music_enabled: true,
        sfx_enabled: true,
        show_leaderboard: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(session, { status: 201 });
  } catch (err: unknown) {
    console.error('create session error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
