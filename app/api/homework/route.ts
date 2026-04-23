import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSessionCode } from '@/lib/utils';

/**
 * POST /api/homework
 * ينشئ جلسة واجب (mode='homework') مع نافذة زمنية.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      activity_id,
      title_override,
      starts_at,
      ends_at,
      shuffle_questions = false,
      shuffle_choices = false,
      show_leaderboard = false,
      max_attempts = 1,
    } = await req.json();

    if (!activity_id || !ends_at) {
      return NextResponse.json({ error: 'activity_id and ends_at are required' }, { status: 400 });
    }

    // تحقق من ملكية النشاط
    const { data: act } = await supabase
      .from('activities').select('teacher_id').eq('id', activity_id).single();
    if (!act) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    if (act.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = createAdminClient();

    // توليد كود فريد
    let session_code = generateSessionCode();
    for (let i = 0; i < 5; i++) {
      const { data: ex } = await admin
        .from('live_sessions').select('id').eq('session_code', session_code).maybeSingle();
      if (!ex) break;
      session_code = generateSessionCode();
    }

    const { data: session, error } = await admin
      .from('live_sessions')
      .insert({
        activity_id,
        host_id: user.id,
        session_code,
        mode: 'homework',
        status: 'active',
        current_question: 0,
        starts_at: starts_at ?? new Date().toISOString(),
        ends_at,
        shuffle_questions,
        shuffle_choices,
        show_leaderboard,
        music_enabled: false,
        sfx_enabled: true,
        started_at: new Date().toISOString(),
        qr_url: JSON.stringify({ max_attempts, title_override }),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(session, { status: 201 });
  } catch (err: unknown) {
    console.error('create homework error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const activity_id = searchParams.get('activity_id');

    let query = supabase
      .from('live_sessions')
      .select('*, activities(title)')
      .eq('host_id', user.id)
      .eq('mode', 'homework')
      .order('created_at', { ascending: false });

    if (activity_id) query = query.eq('activity_id', activity_id);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
