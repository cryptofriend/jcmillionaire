-- Create table for tracking failed referral attempts
CREATE TABLE public.referral_failures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempted_code TEXT NOT NULL,
  failure_reason TEXT NOT NULL,
  user_id UUID,
  ip_hint TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_failures ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (for tracking before login)
CREATE POLICY "Anyone can insert referral failures"
ON public.referral_failures
FOR INSERT
WITH CHECK (true);

-- Only admins can read failures
CREATE POLICY "Admins can read referral failures"
ON public.referral_failures
FOR SELECT
USING (public.is_admin(( SELECT users.id FROM users WHERE users.nullifier_hash = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text) LIMIT 1)));

-- Add index for analytics queries
CREATE INDEX idx_referral_failures_reason ON public.referral_failures(failure_reason);
CREATE INDEX idx_referral_failures_created_at ON public.referral_failures(created_at);