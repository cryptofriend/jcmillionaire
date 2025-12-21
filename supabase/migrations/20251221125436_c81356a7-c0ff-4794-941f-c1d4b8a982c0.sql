-- Add RLS policies for users table (anyone can insert to register, users can read their own data)
CREATE POLICY "Anyone can create a user" 
ON public.users 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can read their own data" 
ON public.users 
FOR SELECT 
USING (true);

-- Add RLS policies for runs table
CREATE POLICY "Anyone can create runs" 
ON public.runs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can read runs" 
ON public.runs 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update runs" 
ON public.runs 
FOR UPDATE 
USING (true);

-- Add RLS policies for answers table
CREATE POLICY "Anyone can create answers" 
ON public.answers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can read answers" 
ON public.answers 
FOR SELECT 
USING (true);

-- Add RLS policies for attempts table
CREATE POLICY "Anyone can create attempts" 
ON public.attempts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can read attempts" 
ON public.attempts 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update attempts" 
ON public.attempts 
FOR UPDATE 
USING (true);

-- Add RLS policies for referrals table
CREATE POLICY "Anyone can create referrals" 
ON public.referrals 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can read referrals" 
ON public.referrals 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update referrals" 
ON public.referrals 
FOR UPDATE 
USING (true);

-- Add RLS policies for claims table
CREATE POLICY "Anyone can create claims" 
ON public.claims 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can read claims" 
ON public.claims 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update claims" 
ON public.claims 
FOR UPDATE 
USING (true);