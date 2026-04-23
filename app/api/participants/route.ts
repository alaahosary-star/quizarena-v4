import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/participants
 * ينشئ مشاركًا جديدًا في جلسة (live أو homework).
 * إذا كان هناك مشارك بنفس display_name في نفس الجلسة → يرجع المشارك الحالي (rejoin).
 *
 * Body:
 *   { session_id, display_name, avatar_color, avatar_emoji }
 *
 * Returns:
 *   { id, session_id, display_name, avatar_color, avatar_emoji, total_score, ..., rejoined: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await req.json();
    const { session_id, display_name, avatar_color, avatar_emoji } = body ?? {};

    // 1. تحقق من الحقول المطلوبة
    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }
    if (!display_name || typeof display_name !== 'string' || !display_name.trim()) {
      return NextResponse.json({ error: 'display_name required' }, { status: 400 });
    }

    const cleanName = display_name.trim().slice(0, 100);

    // 2. تحقق أن الجلسة موجودة ومتاحة للانضمام
    const { data: session } = await admin
      .from('live_sessions')
      .select('id, status, mode, ends_at')
      .eq('id', session_id)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // live: waiting/active فقط | homework: active فقط
    if (session.mode === 'live') {
      if (!['waiting', 'active'].includes(session.status)) {
        return NextResponse.json({ error: 'Session is not joinable' }, { status: 400 });
      }
    } else if (session.mode === 'homework') {
      if (session.status !== 'active') {
        return NextResponse.json({ error: 'Homework is not active' }, { status: 400 });
      }
      if (session.ends_at && new Date(session.ends_at) <= new Date()) {
        return NextResponse.json({ error: 'Homework has expired' }, { status: 400 });
      }
    }

    // 3. Rejoin: لو اسم المشارك موجود في نفس الجلسة → ارجع الصف نفسه
    const { data: existing } = await admin
      .from('participants')
      .select('*')
      .eq('session_id', session_id)
      .eq('display_name', cleanName)
      .maybeSingle();

    if (existing) {
      // تحديث is_online + left_at فقط (rejoin)
      await admin
        .from('participants')
        .update({ is_online: true, left_at: null })
        .eq('id', existing.id);

      return NextResponse.json({ ...existing, is_online: true, rejoined: true }, { status: 200 });
    }

    // 4. إنشاء مشارك جديد
    const { data: participant, error } = await admin
      .from('participants')
      .insert({
        session_id,
        display_name: cleanName,
        avatar_color: avatar_color || '#FF3366',
        avatar_emoji: avatar_emoji || null,
        total_score: 0,
        correct_count: 0,
        wrong_count: 0,
        avg_time_ms: 0,
        is_online: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ...participant, rejoined: false }, { status: 201 });
  } catch (err: unknown) {
    console.error('create participant error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
