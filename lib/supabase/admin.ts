import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client يستخدم SERVICE_ROLE key.
 * يتجاوز RLS تلقائيًا — استخدمه فقط في API routes من جهة السيرفر.
 * لا تستورده أبدًا في كود client-side.
 */
export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
