-- Update the grant_referral_attempt trigger to also grant bonus to the invited user
CREATE OR REPLACE FUNCTION public.grant_referral_attempt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inviter_user_id UUID;
  v_invited_user_id UUID;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- When status changes to 'verified', grant bonus to the invited user (receiver)
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    v_invited_user_id := NEW.invited_user_id;
    
    IF v_invited_user_id IS NOT NULL THEN
      -- Upsert the invited user's attempts for today, incrementing earned_from_referrals
      INSERT INTO public.attempts (user_id, day_id, free_granted, earned_from_referrals, used, cap)
      VALUES (v_invited_user_id, v_today, true, 1, 0, 2)
      ON CONFLICT (user_id, day_id) 
      DO UPDATE SET 
        earned_from_referrals = attempts.earned_from_referrals + 1,
        cap = GREATEST(attempts.cap, attempts.used + attempts.earned_from_referrals + 2);
    END IF;
  END IF;

  -- When status changes to 'first_run_completed', grant bonus to the inviter (sender)
  IF NEW.status = 'first_run_completed' AND (OLD.status IS NULL OR OLD.status != 'first_run_completed') THEN
    v_inviter_user_id := NEW.inviter_user_id;
    
    -- Upsert the inviter's attempts for today, incrementing earned_from_referrals
    INSERT INTO public.attempts (user_id, day_id, free_granted, earned_from_referrals, used, cap)
    VALUES (v_inviter_user_id, v_today, true, 1, 0, 2)
    ON CONFLICT (user_id, day_id) 
    DO UPDATE SET 
      earned_from_referrals = attempts.earned_from_referrals + 1,
      cap = GREATEST(attempts.cap, attempts.used + attempts.earned_from_referrals + 2);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Make sure the trigger exists on referrals table
DROP TRIGGER IF EXISTS on_referral_status_change ON public.referrals;
CREATE TRIGGER on_referral_status_change
  AFTER UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_referral_attempt();