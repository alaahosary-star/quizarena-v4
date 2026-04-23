-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 03: إصلاحات في trigger احتساب النقاط
--
-- المشاكل التي يحلّها:
-- 1. الـ trigger كان يستخدم points_earned فقط ويتجاهل speed_bonus
-- 2. الـ trigger لم يكن يحدّث avg_time_ms (يكسر كسر التعادل في الترتيب)
--
-- شغّل هذا الملف في SQL Editor بعد migration 02
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_leaderboard_on_answer() RETURNS TRIGGER AS $$
DECLARE
  new_total_answers INT;
BEGIN
  -- 1. تحديث مجاميع المشارك: النقاط + المكافأة + العدّاد + متوسط الوقت
  SELECT correct_count + wrong_count + 1 INTO new_total_answers
  FROM participants WHERE id = NEW.participant_id;

  UPDATE participants SET
    total_score    = total_score + NEW.points_earned + COALESCE(NEW.speed_bonus, 0),
    correct_count  = correct_count + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
    wrong_count    = wrong_count   + CASE WHEN NEW.is_correct THEN 0 ELSE 1 END,
    avg_time_ms    = CASE
      WHEN new_total_answers > 0
      THEN ROUND((avg_time_ms::BIGINT * (new_total_answers - 1) + NEW.time_taken_ms) / new_total_answers)
      ELSE NEW.time_taken_ms
    END
  WHERE id = NEW.participant_id;

  -- 2. إعادة احتساب ترتيب كل مشاركي هذه الجلسة
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تأكد من أن الـ trigger يعمل بصلاحيات DEFINER حتى يتجاوز RLS
COMMENT ON FUNCTION update_leaderboard_on_answer() IS
  'يحدّث مجاميع المشارك وترتيب الجلسة بعد كل إجابة. يتضمن speed_bonus و avg_time_ms.';
