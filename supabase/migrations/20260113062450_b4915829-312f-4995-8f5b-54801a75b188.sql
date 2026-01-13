
-- Remove the difficulty check constraint that limits to 1-5
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_difficulty_check;

-- Add new constraint allowing difficulties 1-15
ALTER TABLE public.questions ADD CONSTRAINT questions_difficulty_check CHECK (difficulty >= 1 AND difficulty <= 15);
