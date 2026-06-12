-- Past paper question bank
-- This replaces PDF uploads with subject/year question-answer entries.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.past_paper_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type text NOT NULL CHECK (exam_type IN ('CSS', 'PMS')),
  name text NOT NULL,
  slug text NOT NULL,
  subject_group text NOT NULL DEFAULT 'optional' CHECK (subject_group IN ('compulsory', 'optional')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_type, slug)
);

DROP TABLE IF EXISTS public.past_papers CASCADE;

CREATE TABLE IF NOT EXISTS public.past_paper_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.past_paper_subjects(id) ON DELETE CASCADE,
  exam_type text NOT NULL CHECK (exam_type IN ('CSS', 'PMS')),
  year integer NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  question_number text NOT NULL,
  question_text text NOT NULL,
  answer_text text NOT NULL,
  marks integer CHECK (marks IS NULL OR marks > 0),
  display_order integer NOT NULL DEFAULT 0,
  uploaded_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, year, question_number)
);

CREATE INDEX IF NOT EXISTS idx_past_paper_subjects_exam_name
  ON public.past_paper_subjects (exam_type, name);

CREATE INDEX IF NOT EXISTS idx_past_paper_questions_subject_year
  ON public.past_paper_questions (subject_id, year DESC, display_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_past_paper_questions_exam_year
  ON public.past_paper_questions (exam_type, year DESC, display_order ASC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_past_paper_subjects_updated_at ON public.past_paper_subjects;
CREATE TRIGGER trg_past_paper_subjects_updated_at
  BEFORE UPDATE ON public.past_paper_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_past_paper_questions_updated_at ON public.past_paper_questions;
CREATE TRIGGER trg_past_paper_questions_updated_at
  BEFORE UPDATE ON public.past_paper_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.past_paper_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_paper_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Past paper subjects are publicly readable" ON public.past_paper_subjects;
CREATE POLICY "Past paper subjects are publicly readable"
  ON public.past_paper_subjects
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Past paper questions are publicly readable" ON public.past_paper_questions;
CREATE POLICY "Past paper questions are publicly readable"
  ON public.past_paper_questions
  FOR SELECT
  USING (true);

GRANT SELECT ON public.past_paper_subjects TO anon, authenticated;
GRANT SELECT ON public.past_paper_questions TO anon, authenticated;
GRANT ALL ON public.past_paper_subjects TO service_role;
GRANT ALL ON public.past_paper_questions TO service_role;
