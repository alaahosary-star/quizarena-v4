-- ═══════════════════════════════════════════════════════════════════
-- QuizArena Database Schema (PostgreSQL / Supabase)
-- Version: 1.0 MVP
-- ═══════════════════════════════════════════════════════════════════

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════
-- 1. USERS (معلمون وطلاب)
-- ═══════════════════════════════════════════════════════════════════
CREATE TYPE user_role AS ENUM ('teacher', 'student', 'admin');

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) UNIQUE,
  username        VARCHAR(100),
  full_name       VARCHAR(200) NOT NULL,
  avatar_url      TEXT,
  avatar_color    VARCHAR(20) DEFAULT '#FF3366',
  role            user_role NOT NULL DEFAULT 'student',
  school_name     VARCHAR(200),
  grade_level     VARCHAR(50),
  language        VARCHAR(5) DEFAULT 'ar',
  sound_enabled   BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ═══════════════════════════════════════════════════════════════════
-- 2. ACTIVITIES (الأنشطة / المسابقات)
-- ═══════════════════════════════════════════════════════════════════
CREATE TYPE activity_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE activities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  subject         VARCHAR(100),            -- e.g. "العلوم"
  grade           VARCHAR(50),             -- e.g. "ثاني إعدادي"
  cover_image_url TEXT,
  status          activity_status DEFAULT 'draft',
  total_questions INT DEFAULT 0,
  estimated_time  INT DEFAULT 0,           -- seconds, sum of question times
  play_count      INT DEFAULT 0,
  is_public       BOOLEAN DEFAULT FALSE,
  tags            TEXT[],                  -- ["ذرات","كيمياء"]
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_teacher ON activities(teacher_id);
CREATE INDEX idx_activities_status  ON activities(status);

-- ═══════════════════════════════════════════════════════════════════
-- 3. QUESTIONS (الأسئلة)
-- ═══════════════════════════════════════════════════════════════════
CREATE TYPE question_type AS ENUM (
  'mcq',          -- اختيار من متعدد
  'true_false',   -- صح/خطأ
  'fill_blank',   -- أكمل الفراغ
  'matching',     -- مطابقة
  'ordering',     -- ترتيب
  'drag_drop',    -- سحب وإفلات
  'image_mcq',    -- سؤال بصورة
  'connect'       -- توصيل
);

CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id     UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  question_type   question_type NOT NULL DEFAULT 'mcq',
  image_url       TEXT,
  audio_url       TEXT,
  time_limit      INT NOT NULL DEFAULT 20,     -- ⏱️ ثواني لكل سؤال
  points          INT NOT NULL DEFAULT 1000,
  speed_bonus     BOOLEAN DEFAULT TRUE,        -- تفعيل نقاط السرعة
  order_index     INT NOT NULL DEFAULT 0,
  explanation     TEXT,                        -- شرح بعد الإجابة
  metadata        JSONB DEFAULT '{}',          -- لأنواع الأسئلة الخاصة
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_activity ON questions(activity_id, order_index);

-- ═══════════════════════════════════════════════════════════════════
-- 4. CHOICES (الخيارات)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE choices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  choice_text     TEXT NOT NULL,
  image_url       TEXT,
  is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
  order_index     INT NOT NULL DEFAULT 0,
  match_pair      VARCHAR(100),                -- لأسئلة المطابقة
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_choices_question ON choices(question_id, order_index);

-- ═══════════════════════════════════════════════════════════════════
-- 5. LIVE SESSIONS (جلسات المسابقة المباشرة)
-- ═══════════════════════════════════════════════════════════════════
CREATE TYPE session_mode   AS ENUM ('live', 'homework');
CREATE TYPE session_status AS ENUM ('waiting', 'active', 'paused', 'finished');

CREATE TABLE live_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id       UUID NOT NULL REFERENCES activities(id),
  host_id           UUID NOT NULL REFERENCES users(id),
  session_code      VARCHAR(10) UNIQUE NOT NULL,      -- 6-digit code
  qr_url            TEXT,
  mode              session_mode NOT NULL DEFAULT 'live',
  status            session_status NOT NULL DEFAULT 'waiting',
  current_question  INT DEFAULT 0,
  -- Homework window
  starts_at         TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  -- Settings
  music_enabled     BOOLEAN DEFAULT TRUE,
  sfx_enabled       BOOLEAN DEFAULT TRUE,
  show_leaderboard  BOOLEAN DEFAULT TRUE,
  shuffle_questions BOOLEAN DEFAULT FALSE,
  shuffle_choices   BOOLEAN DEFAULT FALSE,
  -- Lifecycle
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_code   ON live_sessions(session_code);
CREATE INDEX idx_sessions_host   ON live_sessions(host_id);
CREATE INDEX idx_sessions_status ON live_sessions(status);

-- Function to generate unique 6-digit codes
CREATE OR REPLACE FUNCTION generate_session_code() RETURNS VARCHAR AS $$
DECLARE
  new_code VARCHAR(6);
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM live_sessions WHERE session_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════
-- 6. PARTICIPANTS (الطلاب في الجلسة)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),           -- nullable for guests
  display_name    VARCHAR(100) NOT NULL,
  avatar_color    VARCHAR(20) DEFAULT '#FF3366',
  avatar_emoji    VARCHAR(10),
  total_score     INT DEFAULT 0,
  correct_count   INT DEFAULT 0,
  wrong_count     INT DEFAULT 0,
  avg_time_ms     INT DEFAULT 0,
  current_rank    INT,
  is_online       BOOLEAN DEFAULT TRUE,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  left_at         TIMESTAMPTZ,
  UNIQUE(session_id, display_name)
);

CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_participants_rank    ON participants(session_id, total_score DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 7. ANSWERS (إجابات الطلاب)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE answers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  participant_id    UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id       UUID NOT NULL REFERENCES questions(id),
  choice_id         UUID REFERENCES choices(id),       -- nullable for typed/drag answers
  answer_text       TEXT,                              -- for fill_blank or typed answers
  answer_data       JSONB,                             -- for matching/ordering/drag-drop
  is_correct        BOOLEAN NOT NULL DEFAULT FALSE,
  time_taken_ms     INT NOT NULL,                      -- ms to answer
  points_earned     INT NOT NULL DEFAULT 0,
  speed_bonus       INT DEFAULT 0,
  answered_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, question_id)
);

CREATE INDEX idx_answers_session     ON answers(session_id);
CREATE INDEX idx_answers_participant ON answers(participant_id);
CREATE INDEX idx_answers_question    ON answers(question_id);

-- ═══════════════════════════════════════════════════════════════════
-- 8. RESULTS (نتائج الجلسة النهائية — مجمّعة للتقارير)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE results (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id            UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  participant_id        UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  final_rank            INT NOT NULL,
  final_score           INT NOT NULL,
  total_correct         INT DEFAULT 0,
  total_wrong           INT DEFAULT 0,
  total_skipped         INT DEFAULT 0,
  accuracy_percentage   NUMERIC(5,2),
  total_time_ms         INT DEFAULT 0,
  avg_response_time_ms  INT DEFAULT 0,
  fastest_answer_ms     INT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, participant_id)
);

CREATE INDEX idx_results_session ON results(session_id, final_rank);

-- ═══════════════════════════════════════════════════════════════════
-- 9. LEADERBOARD CACHE (للترتيب اللحظي السريع)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE leaderboard_cache (
  session_id      UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  participant_id  UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  rank_position   INT NOT NULL,
  score           INT NOT NULL,
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(session_id, participant_id)
);

CREATE INDEX idx_lb_cache_rank ON leaderboard_cache(session_id, rank_position);

-- ═══════════════════════════════════════════════════════════════════
-- 10. TRIGGERS: Auto-update rankings & activity stats
-- ═══════════════════════════════════════════════════════════════════

-- Update participant score & leaderboard on new answer
CREATE OR REPLACE FUNCTION update_leaderboard_on_answer() RETURNS TRIGGER AS $$
BEGIN
  -- Update participant aggregates
  UPDATE participants SET
    total_score   = total_score + NEW.points_earned,
    correct_count = correct_count + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
    wrong_count   = wrong_count   + CASE WHEN NEW.is_correct THEN 0 ELSE 1 END
  WHERE id = NEW.participant_id;

  -- Recalculate ranks for this session
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY total_score DESC, avg_time_ms ASC) AS new_rank
    FROM participants
    WHERE session_id = NEW.session_id
  )
  UPDATE participants p
  SET current_rank = r.new_rank
  FROM ranked r
  WHERE p.id = r.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leaderboard_on_answer
  AFTER INSERT ON answers
  FOR EACH ROW EXECUTE FUNCTION update_leaderboard_on_answer();

-- Auto-count questions & estimated time on activity
CREATE OR REPLACE FUNCTION update_activity_stats() RETURNS TRIGGER AS $$
BEGIN
  UPDATE activities SET
    total_questions = (SELECT COUNT(*) FROM questions WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)),
    estimated_time  = (SELECT COALESCE(SUM(time_limit),0) FROM questions WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)),
    updated_at      = NOW()
  WHERE id = COALESCE(NEW.activity_id, OLD.activity_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_activity_stats
  AFTER INSERT OR UPDATE OR DELETE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_activity_stats();

-- ═══════════════════════════════════════════════════════════════════
-- 11. ROW LEVEL SECURITY (Supabase)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers       ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own activities
CREATE POLICY teacher_own_activities ON activities
  FOR ALL USING (auth.uid() = teacher_id);

-- Published/public activities visible to all
CREATE POLICY public_activities_read ON activities
  FOR SELECT USING (is_public = true OR status = 'published');

-- Participants can read their own session data
CREATE POLICY participant_read_own ON participants
  FOR SELECT USING (user_id = auth.uid() OR session_id IN (
    SELECT id FROM live_sessions WHERE host_id = auth.uid()
  ));

-- Anyone in session can read session's leaderboard
CREATE POLICY session_answers_read ON answers
  FOR SELECT USING (session_id IN (
    SELECT session_id FROM participants WHERE user_id = auth.uid()
    UNION
    SELECT id FROM live_sessions WHERE host_id = auth.uid()
  ));

-- ═══════════════════════════════════════════════════════════════════
-- 12. REALTIME SETUP (Supabase channels)
-- ═══════════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE answers;
ALTER PUBLICATION supabase_realtime ADD TABLE live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard_cache;

-- ═══════════════════════════════════════════════════════════════════
-- 13. USEFUL VIEWS (لوحة تقارير المعلم)
-- ═══════════════════════════════════════════════════════════════════

-- Top performers per session
CREATE VIEW v_session_leaderboard AS
SELECT
  p.session_id,
  p.id AS participant_id,
  p.display_name,
  p.avatar_color,
  p.total_score,
  p.correct_count,
  p.wrong_count,
  p.avg_time_ms,
  p.current_rank,
  ROUND(100.0 * p.correct_count / NULLIF(p.correct_count + p.wrong_count, 0), 1) AS accuracy
FROM participants p
ORDER BY p.session_id, p.current_rank;

-- Hardest questions (لأصعب الأسئلة)
CREATE VIEW v_hardest_questions AS
SELECT
  q.id,
  q.activity_id,
  q.question_text,
  COUNT(a.id) AS total_attempts,
  SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) AS correct_count,
  ROUND(100.0 * SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id),0), 1) AS success_rate,
  AVG(a.time_taken_ms)::INT AS avg_time_ms
FROM questions q
LEFT JOIN answers a ON a.question_id = q.id
GROUP BY q.id
ORDER BY success_rate ASC NULLS LAST;

-- Student performance across sessions
CREATE VIEW v_student_performance AS
SELECT
  p.user_id,
  u.full_name,
  COUNT(DISTINCT p.session_id)     AS sessions_played,
  SUM(p.total_score)               AS total_points,
  AVG(p.total_score)::INT          AS avg_points,
  SUM(p.correct_count)             AS total_correct,
  SUM(p.wrong_count)               AS total_wrong,
  MAX(p.total_score)               AS best_score
FROM participants p
LEFT JOIN users u ON u.id = p.user_id
WHERE p.user_id IS NOT NULL
GROUP BY p.user_id, u.full_name;

-- ═══════════════════════════════════════════════════════════════════
-- End of Schema
-- ═══════════════════════════════════════════════════════════════════
