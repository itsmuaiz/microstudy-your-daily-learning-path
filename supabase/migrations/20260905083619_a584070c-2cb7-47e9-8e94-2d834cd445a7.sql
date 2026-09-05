ALTER TABLE public.study_paths
  ADD COLUMN IF NOT EXISTS question_mode text NOT NULL DEFAULT 'multiple_choice';

ALTER TABLE public.study_paths
  DROP CONSTRAINT IF EXISTS study_paths_question_mode_check;
ALTER TABLE public.study_paths
  ADD CONSTRAINT study_paths_question_mode_check
  CHECK (question_mode IN ('multiple_choice','open','both'));

ALTER TABLE public.step_questions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'multiple_choice',
  ADD COLUMN IF NOT EXISTS model_answer text,
  ADD COLUMN IF NOT EXISTS user_answer text,
  ADD COLUMN IF NOT EXISTS feedback text;

ALTER TABLE public.step_questions
  DROP CONSTRAINT IF EXISTS step_questions_kind_check;
ALTER TABLE public.step_questions
  ADD CONSTRAINT step_questions_kind_check CHECK (kind IN ('multiple_choice','open'));

ALTER TABLE public.step_questions ALTER COLUMN options DROP NOT NULL;
ALTER TABLE public.step_questions ALTER COLUMN correct_index DROP NOT NULL;