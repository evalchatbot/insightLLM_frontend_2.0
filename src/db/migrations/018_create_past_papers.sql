-- Past papers catalog
-- Run this in Supabase SQL editor, then create/use the matching public storage bucket.

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

CREATE TABLE IF NOT EXISTS public.past_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.past_paper_subjects(id) ON DELETE CASCADE,
  exam_type text NOT NULL CHECK (exam_type IN ('CSS', 'PMS')),
  year integer NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  title text NOT NULL,
  file_path text NOT NULL,
  public_url text NOT NULL,
  file_size bigint,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  uploaded_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_past_paper_subjects_exam_name
  ON public.past_paper_subjects (exam_type, name);

CREATE INDEX IF NOT EXISTS idx_past_papers_subject_year_desc
  ON public.past_papers (subject_id, year DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_past_papers_exam_year_desc
  ON public.past_papers (exam_type, year DESC, created_at DESC);

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

DROP TRIGGER IF EXISTS trg_past_papers_updated_at ON public.past_papers;
CREATE TRIGGER trg_past_papers_updated_at
  BEFORE UPDATE ON public.past_papers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.past_paper_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Past paper subjects are publicly readable" ON public.past_paper_subjects;
CREATE POLICY "Past paper subjects are publicly readable"
  ON public.past_paper_subjects
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Past papers are publicly readable" ON public.past_papers;
CREATE POLICY "Past papers are publicly readable"
  ON public.past_papers
  FOR SELECT
  USING (true);

GRANT SELECT ON public.past_paper_subjects TO anon, authenticated;
GRANT SELECT ON public.past_papers TO anon, authenticated;
GRANT ALL ON public.past_paper_subjects TO service_role;
GRANT ALL ON public.past_papers TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('past-papers', 'past-papers', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Past paper files are publicly readable" ON storage.objects;
CREATE POLICY "Past paper files are publicly readable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'past-papers');
