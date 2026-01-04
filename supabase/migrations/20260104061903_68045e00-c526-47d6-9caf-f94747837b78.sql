-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create unique constraint on text_hash for upsert to work
ALTER TABLE public.questions 
ADD CONSTRAINT questions_text_hash_unique UNIQUE (text_hash);