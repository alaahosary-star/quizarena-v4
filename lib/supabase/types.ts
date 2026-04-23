// Database types (mirror the PostgreSQL schema)

export type UserRole = 'teacher' | 'student' | 'admin';
export type ActivityStatus = 'draft' | 'published' | 'archived';
export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'matching' | 'ordering' | 'drag_drop' | 'image_mcq' | 'connect';
export type SessionMode = 'live' | 'homework';
export type SessionStatus = 'waiting' | 'active' | 'paused' | 'finished';

export interface User {
  id: string;
  email?: string;
  full_name: string;
  avatar_color: string;
  role: UserRole;
  school_name?: string;
  grade_level?: string;
  created_at: string;
}

export interface Activity {
  id: string;
  teacher_id: string;
  title: string;
  description?: string;
  subject?: string;
  grade?: string;
  status: ActivityStatus;
  total_questions: number;
  estimated_time: number;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  activity_id: string;
  question_text: string;
  question_type: QuestionType;
  image_url?: string;
  time_limit: number;
  points: number;
  speed_bonus: boolean;
  order_index: number;
  explanation?: string;
  metadata?: Record<string, unknown>;
  choices?: Choice[];
}

export interface Choice {
  id: string;
  question_id: string;
  choice_text: string;
  image_url?: string;
  is_correct: boolean;
  order_index: number;
  match_pair?: string;
}

export interface LiveSession {
  id: string;
  activity_id: string;
  host_id: string;
  session_code: string;
  mode: SessionMode;
  status: SessionStatus;
  current_question: number;
  starts_at?: string;
  ends_at?: string;
  music_enabled: boolean;
  sfx_enabled: boolean;
  show_leaderboard: boolean;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  user_id?: string;
  display_name: string;
  avatar_color: string;
  avatar_emoji?: string;
  total_score: number;
  correct_count: number;
  wrong_count: number;
  avg_time_ms: number;
  current_rank?: number;
  is_online: boolean;
  joined_at: string;
}

export interface Answer {
  id: string;
  session_id: string;
  participant_id: string;
  question_id: string;
  choice_id?: string;
  answer_text?: string;
  answer_data?: Record<string, unknown>;
  is_correct: boolean;
  time_taken_ms: number;
  points_earned: number;
  speed_bonus: number;
  answered_at: string;
}
