-- Create table to store daily leaderboard snapshots
CREATE TABLE public.leaderboard_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_id date NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  total_claimed integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(day_id, user_id)
);

-- Enable RLS
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policy for reading snapshots
CREATE POLICY "Leaderboard snapshots readable by all"
ON public.leaderboard_snapshots
FOR SELECT
USING (true);

-- Create index for efficient querying
CREATE INDEX idx_leaderboard_snapshots_day_user ON public.leaderboard_snapshots(day_id, user_id);
CREATE INDEX idx_leaderboard_snapshots_day_rank ON public.leaderboard_snapshots(day_id, rank);