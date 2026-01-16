-- Add video_url column to podcasts for self-hosted videos
ALTER TABLE public.podcasts 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create storage bucket for podcast videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'podcast-videos', 
  'podcast-videos', 
  true,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow public read access
CREATE POLICY "Public can view podcast videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'podcast-videos');

-- Storage policy: service role can upload (admin bot)
CREATE POLICY "Service role can upload podcast videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'podcast-videos');

CREATE POLICY "Service role can update podcast videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'podcast-videos');

CREATE POLICY "Service role can delete podcast videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'podcast-videos');