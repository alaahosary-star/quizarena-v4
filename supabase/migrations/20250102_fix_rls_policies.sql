-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 02: سياسات RLS كاملة
--
-- يغطّي:
-- - المعلمون (مسجّلون): إنشاء/تعديل/حذف أنشطتهم وجلساتهم
-- - الطلاب (ضيوف بدون تسجيل): قراءة الجلسات، الانضمام، الإجابة
-- - قراءة عامة للأنشطة المنشورة للعب
--
-- شغّل هذا في SQL Editor على Supabase بعد initial_schema
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. تفعيل RLS على كل الجداول الحساسة ───────────────────────────
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE choices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers       ENABLE ROW LEVEL SECURITY;

-- ─── 2. USERS ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS users_read_all ON users;
CREATE POLICY users_read_all ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS users_insert_self ON users;
CREATE POLICY users_insert_self ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ─── 3. ACTIVITIES ──────────────────────────────────────────────────
DROP POLICY IF EXISTS activities_select ON activities;
CREATE POLICY activities_select ON activities
  FOR SELECT USING (
    status = 'published' OR teacher_id = auth.uid()
  );

DROP POLICY IF EXISTS activities_insert_teacher ON activities;
CREATE POLICY activities_insert_teacher ON activities
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS activities_update_teacher ON activities;
CREATE POLICY activities_update_teacher ON activities
  FOR UPDATE USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS activities_delete_teacher ON activities;
CREATE POLICY activities_delete_teacher ON activities
  FOR DELETE USING (auth.uid() = teacher_id);

-- ─── 4. QUESTIONS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS questions_select ON questions;
CREATE POLICY questions_select ON questions
  FOR SELECT USING (
    activity_id IN (
      SELECT id FROM activities
      WHERE status = 'published' OR teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS questions_write_teacher ON questions;
CREATE POLICY questions_write_teacher ON questions
  FOR ALL USING (
    activity_id IN (SELECT id FROM activities WHERE teacher_id = auth.uid())
  ) WITH CHECK (
    activity_id IN (SELECT id FROM activities WHERE teacher_id = auth.uid())
  );

-- ─── 5. CHOICES ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS choices_select ON choices;
CREATE POLICY choices_select ON choices
  FOR SELECT USING (
    question_id IN (
      SELECT id FROM questions WHERE activity_id IN (
        SELECT id FROM activities
        WHERE status = 'published' OR teacher_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS choices_write_teacher ON choices;
CREATE POLICY choices_write_teacher ON choices
  FOR ALL USING (
    question_id IN (
      SELECT q.id FROM questions q
      JOIN activities a ON a.id = q.activity_id
      WHERE a.teacher_id = auth.uid()
    )
  ) WITH CHECK (
    question_id IN (
      SELECT q.id FROM questions q
      JOIN activities a ON a.id = q.activity_id
      WHERE a.teacher_id = auth.uid()
    )
  );

-- ─── 6. LIVE_SESSIONS ───────────────────────────────────────────────
DROP POLICY IF EXISTS sessions_select_all ON live_sessions;
CREATE POLICY sessions_select_all ON live_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS sessions_insert_host ON live_sessions;
CREATE POLICY sessions_insert_host ON live_sessions
  FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS sessions_update_host ON live_sessions;
CREATE POLICY sessions_update_host ON live_sessions
  FOR UPDATE USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS sessions_delete_host ON live_sessions;
CREATE POLICY sessions_delete_host ON live_sessions
  FOR DELETE USING (auth.uid() = host_id);

-- ─── 7. PARTICIPANTS ────────────────────────────────────────────────
DROP POLICY IF EXISTS participants_select_all ON participants;
CREATE POLICY participants_select_all ON participants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS participants_insert_guest ON participants;
CREATE POLICY participants_insert_guest ON participants
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM live_sessions
      WHERE status IN ('waiting', 'active', 'paused')
    )
  );

DROP POLICY IF EXISTS participants_update_any ON participants;
CREATE POLICY participants_update_any ON participants
  FOR UPDATE USING (true) WITH CHECK (true);

-- ─── 8. ANSWERS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS answers_select_all ON answers;
CREATE POLICY answers_select_all ON answers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS answers_insert_participant ON answers;
CREATE POLICY answers_insert_participant ON answers
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM live_sessions
      WHERE status IN ('active', 'paused')
    )
  );

-- ─── 9. GRANTS للـ anon و authenticated ─────────────────────────────
GRANT SELECT ON users TO anon, authenticated;
GRANT SELECT ON activities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON activities TO authenticated;
GRANT SELECT ON questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON questions TO authenticated;
GRANT SELECT ON choices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON choices TO authenticated;
GRANT SELECT ON live_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON live_sessions TO authenticated;
GRANT SELECT, INSERT ON participants TO anon;
GRANT SELECT, INSERT, UPDATE ON participants TO authenticated;
GRANT SELECT, INSERT ON answers TO anon, authenticated;
