
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read access on books"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'books');
