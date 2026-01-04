-- Rename active_from to active_dates
ALTER TABLE public.questions 
RENAME COLUMN active_from TO active_dates;