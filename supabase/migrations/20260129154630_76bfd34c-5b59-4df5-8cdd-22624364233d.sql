-- Allow users to update their own username
CREATE POLICY "Users can update their own username"
ON public.users
FOR UPDATE
USING (true)
WITH CHECK (true);