-- Add is_pinned column to articles table for pinning feature
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Create index for faster queries on pinned articles
CREATE INDEX IF NOT EXISTS idx_articles_is_pinned ON public.articles (is_pinned) WHERE is_pinned = true;