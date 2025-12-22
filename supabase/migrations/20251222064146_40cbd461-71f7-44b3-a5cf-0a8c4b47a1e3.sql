-- Create user_streaks table to track daily activity and streaks
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_play_date DATE,
  total_days_played INTEGER NOT NULL DEFAULT 0,
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_streaks_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can read streaks" 
ON public.user_streaks 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert streaks" 
ON public.user_streaks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update streaks" 
ON public.user_streaks 
FOR UPDATE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_user_streaks_updated_at
BEFORE UPDATE ON public.user_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();