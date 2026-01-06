-- Add Spanish translation columns to questions table
ALTER TABLE public.questions
ADD COLUMN question_es TEXT,
ADD COLUMN choice_a_es TEXT,
ADD COLUMN choice_b_es TEXT,
ADD COLUMN choice_c_es TEXT,
ADD COLUMN choice_d_es TEXT,
ADD COLUMN hint_es TEXT;