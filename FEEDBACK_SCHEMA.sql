-- Feedback Table Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NULL,  -- Clerk user ID (nullable to allow anonymous feedback)
    user_email TEXT NULL,  -- User email if available
    page_url TEXT NOT NULL,  -- Which page the feedback was submitted from
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'improvement', 'general')),
    subject TEXT NOT NULL,  -- Brief subject/title
    message TEXT NOT NULL,  -- Detailed feedback message
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),  -- Optional 1-5 rating
    user_agent TEXT NULL,  -- Browser/device info
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'closed')),
    admin_notes TEXT NULL  -- For internal notes/responses
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Create index on status
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running the script)
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can read their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.feedback;
DROP POLICY IF EXISTS "Enable read for users" ON public.feedback;

-- Policy: Allow anyone (including anonymous) to insert feedback
CREATE POLICY "Enable insert for all users"
ON public.feedback
FOR INSERT
WITH CHECK (true);

-- Policy: Allow users to read their own feedback (and allow anonymous to read their own)
CREATE POLICY "Enable read for users"
ON public.feedback
FOR SELECT
USING (true);  -- For now, allow reading all feedback. You can restrict this later.

-- Note: Update/Delete policies can be added later for admin functionality

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.feedback;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON public.feedback TO anon;
GRANT SELECT, INSERT ON public.feedback TO authenticated;

COMMENT ON TABLE public.feedback IS 'User feedback and bug reports';
COMMENT ON COLUMN public.feedback.user_id IS 'Clerk user ID, nullable for anonymous feedback';
COMMENT ON COLUMN public.feedback.feedback_type IS 'Type of feedback: bug, feature, improvement, or general';
COMMENT ON COLUMN public.feedback.rating IS 'Optional user satisfaction rating from 1-5';
