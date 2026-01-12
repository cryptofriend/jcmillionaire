
-- Create a trigger to enforce day_id = CURRENT_DATE on run insert
-- This prevents clients from manipulating the day_id to bypass attempt limits

CREATE OR REPLACE FUNCTION public.enforce_run_day_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Always set day_id to current date, ignoring any client-provided value
  NEW.day_id := CURRENT_DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_run_day_id_trigger ON public.runs;
CREATE TRIGGER enforce_run_day_id_trigger
  BEFORE INSERT ON public.runs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_run_day_id();

-- Also add an RLS policy to prevent runs if user has exceeded attempts for TODAY
-- First, create a helper function to check attempts
CREATE OR REPLACE FUNCTION public.can_create_run(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_attempts_used integer;
  v_attempts_cap integer;
BEGIN
  -- Get today's attempts for the user
  SELECT COALESCE(used, 0), COALESCE(cap, 1)
  INTO v_attempts_used, v_attempts_cap
  FROM public.attempts
  WHERE user_id = p_user_id AND day_id = CURRENT_DATE;
  
  -- If no record exists, user hasn't played today, allow
  IF v_attempts_used IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if user has remaining attempts
  RETURN v_attempts_used < v_attempts_cap;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.enforce_run_day_id() IS 'Prevents day_id manipulation exploit by forcing day_id to CURRENT_DATE';
COMMENT ON FUNCTION public.can_create_run(uuid) IS 'Checks if user has remaining attempts for today';
