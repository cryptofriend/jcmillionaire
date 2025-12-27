-- Add a stable referral_code to users so we can look up inviters reliably
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS referral_code text;

-- Backfill existing users
UPDATE public.users
SET referral_code = left(id::text, 8)
WHERE referral_code IS NULL;

-- Ensure uniqueness (1st 8 chars of UUID is plenty for this scale; if collision ever occurs we can expand)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'users_referral_code_uidx'
  ) THEN
    CREATE UNIQUE INDEX users_referral_code_uidx ON public.users(referral_code);
  END IF;
END $$;

-- Keep referral_code populated for future rows
CREATE OR REPLACE FUNCTION public.set_users_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := left(NEW.id::text, 8);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_users_referral_code ON public.users;
CREATE TRIGGER trg_set_users_referral_code
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_users_referral_code();
