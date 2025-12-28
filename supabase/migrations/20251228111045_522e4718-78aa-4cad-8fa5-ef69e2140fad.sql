-- Fix double-granting in referral rewards:
-- 1) Remove duplicate trigger (grant_referral_attempt was firing twice)
-- 2) Grant +1 play to BOTH inviter and invited user ONLY when status becomes 'first_run_completed'

BEGIN;

DROP TRIGGER IF EXISTS on_referral_status_change ON public.referrals;

CREATE OR REPLACE FUNCTION public.grant_referral_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Only grant when a referral transitions to first_run_completed
  IF NEW.status = 'first_run_completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'first_run_completed') THEN

    -- Grant to inviter
    IF NEW.inviter_user_id IS NOT NULL THEN
      INSERT INTO public.attempts (user_id, day_id, free_granted, earned_from_referrals, used, cap)
      VALUES (NEW.inviter_user_id, v_today, true, 1, 0, 2)
      ON CONFLICT (user_id, day_id)
      DO UPDATE SET
        earned_from_referrals = attempts.earned_from_referrals + 1,
        cap = attempts.cap + 1;
    END IF;

    -- Grant to invited user (if present)
    IF NEW.invited_user_id IS NOT NULL THEN
      INSERT INTO public.attempts (user_id, day_id, free_granted, earned_from_referrals, used, cap)
      VALUES (NEW.invited_user_id, v_today, true, 1, 0, 2)
      ON CONFLICT (user_id, day_id)
      DO UPDATE SET
        earned_from_referrals = attempts.earned_from_referrals + 1,
        cap = attempts.cap + 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure we have exactly one trigger calling the function
DROP TRIGGER IF EXISTS on_referral_completed ON public.referrals;
CREATE TRIGGER on_referral_completed
AFTER INSERT OR UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.grant_referral_attempt();

COMMIT;
