-- Add username and profile picture columns to users table
ALTER TABLE public.users 
ADD COLUMN username TEXT,
ADD COLUMN profile_picture_url TEXT;

-- Create index for faster username lookups
CREATE INDEX idx_users_username ON public.users(username) WHERE username IS NOT NULL;