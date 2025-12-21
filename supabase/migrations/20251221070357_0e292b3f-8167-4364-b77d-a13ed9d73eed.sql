-- Create enums
CREATE TYPE public.verification_level AS ENUM ('device', 'orb');
CREATE TYPE public.run_status AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE public.referral_status AS ENUM ('clicked', 'verified', 'first_run_completed');
CREATE TYPE public.claim_status AS ENUM ('authorized', 'submitted', 'confirmed', 'expired');
CREATE TYPE public.lifeline_type AS ENUM ('fifty_fifty', 'hint', 'chain_scan');

-- Users table (World ID verified users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nullifier_hash TEXT UNIQUE NOT NULL,
  verification_level verification_level NOT NULL DEFAULT 'device',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Day state for pool management
CREATE TABLE public.day_state (
  day_id DATE PRIMARY KEY,
  pool_total INTEGER NOT NULL DEFAULT 1000000,
  pool_locked INTEGER NOT NULL DEFAULT 0,
  pool_remaining INTEGER NOT NULL DEFAULT 1000000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referrals
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  invited_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE NOT NULL,
  status referral_status NOT NULL DEFAULT 'clicked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attempts tracking
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  day_id DATE NOT NULL,
  free_granted BOOLEAN NOT NULL DEFAULT true,
  earned_from_referrals INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0,
  cap INTEGER NOT NULL DEFAULT 10,
  UNIQUE(user_id, day_id)
);

-- Questions
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  choice_a TEXT NOT NULL,
  choice_b TEXT NOT NULL,
  choice_c TEXT NOT NULL,
  choice_d TEXT NOT NULL,
  correct_choice TEXT NOT NULL CHECK (correct_choice IN ('A', 'B', 'C', 'D')),
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
  hint TEXT NOT NULL,
  category TEXT NOT NULL,
  active_from DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  text_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Game runs
CREATE TABLE public.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  day_id DATE NOT NULL,
  status run_status NOT NULL DEFAULT 'active',
  reached_q INTEGER NOT NULL DEFAULT 0,
  earned_tier INTEGER NOT NULL DEFAULT 0,
  earned_amount INTEGER NOT NULL DEFAULT 0,
  current_question_id UUID REFERENCES public.questions(id),
  question_started_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  lifelines_used lifeline_type[] NOT NULL DEFAULT '{}'
);

-- Answers for each run
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.runs(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  question_number INTEGER NOT NULL,
  selected TEXT NOT NULL CHECK (selected IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN NOT NULL,
  time_taken_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Claims
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.runs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  day_id DATE NOT NULL,
  amount INTEGER NOT NULL,
  nonce TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status claim_status NOT NULL DEFAULT 'authorized',
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Answer stats for Chain Scan lifeline
CREATE TABLE public.answer_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  choice_a_count INTEGER NOT NULL DEFAULT 0,
  choice_b_count INTEGER NOT NULL DEFAULT 0,
  choice_c_count INTEGER NOT NULL DEFAULT 0,
  choice_d_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(question_id)
);

-- Prize ladder configuration
CREATE TABLE public.prize_ladder (
  question_number INTEGER PRIMARY KEY,
  prize_amount INTEGER NOT NULL,
  is_safe_haven BOOLEAN NOT NULL DEFAULT false
);

-- Insert default prize ladder
INSERT INTO public.prize_ladder (question_number, prize_amount, is_safe_haven) VALUES
  (1, 25, false),
  (2, 50, false),
  (3, 100, false),
  (4, 175, false),
  (5, 250, true),
  (6, 400, false),
  (7, 650, false),
  (8, 1000, false),
  (9, 1500, false),
  (10, 2250, true),
  (11, 3250, false),
  (12, 5000, false),
  (13, 7500, false),
  (14, 12000, false),
  (15, 20000, false);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_ladder ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public read for game mechanics, writes via edge functions)
CREATE POLICY "Prize ladder readable by all" ON public.prize_ladder FOR SELECT USING (true);
CREATE POLICY "Questions readable when active" ON public.questions FOR SELECT USING (is_active = true);
CREATE POLICY "Day state readable by all" ON public.day_state FOR SELECT USING (true);
CREATE POLICY "Answer stats readable by all" ON public.answer_stats FOR SELECT USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get or create today's day state
CREATE OR REPLACE FUNCTION public.get_or_create_day_state(p_day_id DATE)
RETURNS public.day_state AS $$
DECLARE
  v_day_state public.day_state;
BEGIN
  SELECT * INTO v_day_state FROM public.day_state WHERE day_id = p_day_id;
  IF NOT FOUND THEN
    INSERT INTO public.day_state (day_id, pool_total, pool_locked, pool_remaining)
    VALUES (p_day_id, 1000000, 0, 1000000)
    RETURNING * INTO v_day_state;
  END IF;
  RETURN v_day_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;