import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/users/profile
 * Upsert لصف المستخدم في جدول users بعد التسجيل.
 * يتطلب جلسة مسجلة دخول (auth.getUser) — المستخدم يقدر يعدل بياناته هو فقط.
 *
 * Body:
 *   { full_name, school_name?, avatar_color?, role? }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { full_name, school_name, avatar_color, role } = body ?? {};

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json({ error: 'full_name required' }, { status: 400 });
    }

    // Whitelist للأدوار — منعًا لترقية دور نفسه لأدمن
    const safeRole = role === 'teacher' || role === 'student' ? role : 'teacher';

    const admin = createAdminClient();

    const { data, error } = await admin
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: full_name.trim().slice(0, 200),
        school_name: school_name?.trim()?.slice(0, 200) || null,
        avatar_color: avatar_color || '#FF3366',
        role: safeRole,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    console.error('upsert user profile error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
