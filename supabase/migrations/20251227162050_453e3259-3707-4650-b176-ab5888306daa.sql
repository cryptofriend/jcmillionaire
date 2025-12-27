-- Allow admins to update questions (toggle active status)
CREATE POLICY "Admins can update questions" 
ON public.questions 
FOR UPDATE 
USING (public.is_admin((SELECT id FROM public.users WHERE nullifier_hash = current_setting('request.jwt.claims', true)::json->>'sub' LIMIT 1)));

-- Allow admins to insert new questions
CREATE POLICY "Admins can insert questions" 
ON public.questions 
FOR INSERT 
WITH CHECK (public.is_admin((SELECT id FROM public.users WHERE nullifier_hash = current_setting('request.jwt.claims', true)::json->>'sub' LIMIT 1)));