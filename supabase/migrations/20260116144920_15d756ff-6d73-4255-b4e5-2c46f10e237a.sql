-- Remove the is_pinned column and index from articles table
DROP INDEX IF EXISTS idx_articles_is_pinned;
ALTER TABLE public.articles DROP COLUMN IF EXISTS is_pinned;