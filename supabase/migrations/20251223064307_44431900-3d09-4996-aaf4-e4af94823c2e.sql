-- Update default cap to 1 play per day (users earn more via referrals)
ALTER TABLE public.attempts ALTER COLUMN cap SET DEFAULT 1;

-- Update existing attempts records that haven't been used yet to have cap = 1
-- Only update future behavior, don't affect users who already have attempts today
-- This will apply the new default to new records

-- Create a function to grant an extra attempt when a referral completes their first run
CREATE OR REPLACE FUNCTION public.grant_referral_attempt()
RETURNS TRIGGER AS $$
DECLARE
  v_inviter_user_id UUID;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Only trigger when status changes to 'first_run_completed'
  IF NEW.status = 'first_run_completed' AND (OLD.status IS NULL OR OLD.status != 'first_run_completed') THEN
    v_inviter_user_id := NEW.inviter_user_id;
    
    -- Upsert the inviter's attempts for today, incrementing earned_from_referrals
    INSERT INTO public.attempts (user_id, day_id, free_granted, earned_from_referrals, used, cap)
    VALUES (v_inviter_user_id, v_today, true, 1, 0, 1)
    ON CONFLICT (user_id, day_id) 
    DO UPDATE SET 
      earned_from_referrals = attempts.earned_from_referrals + 1,
      cap = GREATEST(attempts.cap, attempts.used + attempts.earned_from_referrals + 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on referrals table
DROP TRIGGER IF EXISTS on_referral_completed ON public.referrals;
CREATE TRIGGER on_referral_completed
  AFTER INSERT OR UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_referral_attempt();

-- Add unique constraint on attempts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attempts_user_day_unique'
  ) THEN
    ALTER TABLE public.attempts ADD CONSTRAINT attempts_user_day_unique UNIQUE (user_id, day_id);
  END IF;
END $$;