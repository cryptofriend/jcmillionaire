
-- Add image_url column to questions table
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to question images
CREATE POLICY "Question images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

-- Allow service role to upload question images (edge functions use service role)
CREATE POLICY "Service role can upload question images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'question-images');

CREATE POLICY "Service role can update question images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'question-images');
