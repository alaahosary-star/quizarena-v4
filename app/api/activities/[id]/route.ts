import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * PATCH /api/activities/[id]
 * يعدّل معلومات النشاط (لا الأسئلة).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // تحقق من الملكية
    const { data: act } = await supabase
      .from('activities').select('teacher_id').eq('id', id).single();
    if (!act) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (act.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const allowed = ['title', 'description', 'subject', 'grade', 'status', 'total_questions', 'estimated_time'];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in body) patch[k] = body[k];
    }
    patch.updated_at = new Date().toISOString();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('activities')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('update activity error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activities/[id]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: act } = await supabase
      .from('activities').select('teacher_id').eq('id', id).single();
    if (!act) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (act.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = createAdminClient();
    const { error } = await admin.from('activities').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('delete activity error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
