-- Add wallet_type column to distinguish between World ID and Solana users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS wallet_type TEXT NOT NULL DEFAULT 'world_id' 
CHECK (wallet_type IN ('world_id', 'solana'));

-- Add solana_address column for Solana wallet users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS solana_address TEXT;

-- Create index for faster lookups by wallet type
CREATE INDEX IF NOT EXISTS idx_users_wallet_type ON public.users(wallet_type);

-- Create index for solana address lookups
CREATE INDEX IF NOT EXISTS idx_users_solana_address ON public.users(solana_address);

-- Add unique constraint on solana_address (only one account per Solana wallet)
ALTER TABLE public.users 
ADD CONSTRAINT users_solana_address_unique UNIQUE (solana_address);