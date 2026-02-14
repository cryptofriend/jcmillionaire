
-- Remove permissive write policies on tables that should only be written by service_role (edge functions)

-- CLAIMS: only service_role (claim-rewards edge function) should insert/update
DROP POLICY IF EXISTS "Anyone can create claims" ON public.claims;
DROP POLICY IF EXISTS "Anyone can update claims" ON public.claims;

-- USER_BALANCES: only service_role (claim-rewards edge function) should insert/update
DROP POLICY IF EXISTS "Anyone can insert balances" ON public.user_balances;
DROP POLICY IF EXISTS "Anyone can update balances" ON public.user_balances;

-- USER_STREAKS: only service_role (claim-rewards edge function) should insert/update
DROP POLICY IF EXISTS "Anyone can insert streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Anyone can update streaks" ON public.user_streaks;
