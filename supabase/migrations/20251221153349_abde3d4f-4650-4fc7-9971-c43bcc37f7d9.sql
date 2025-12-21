-- Create user_balances table to track claimed coins
CREATE TABLE public.user_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  total_claimed integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- Create policies for user_balances
CREATE POLICY "Anyone can read balances"
ON public.user_balances
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert balances"
ON public.user_balances
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update balances"
ON public.user_balances
FOR UPDATE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_balances_updated_at
BEFORE UPDATE ON public.user_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key to users table
ALTER TABLE public.user_balances
ADD CONSTRAINT user_balances_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;