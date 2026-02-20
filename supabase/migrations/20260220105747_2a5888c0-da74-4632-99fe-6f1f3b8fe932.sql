-- Create auth_nonces table for preventing replay attacks
CREATE TABLE public.auth_nonces (
  nonce TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  user_id UUID
);

-- Index for cleanup of old nonces
CREATE INDEX idx_auth_nonces_created ON public.auth_nonces(created_at);

-- Enable RLS
ALTER TABLE public.auth_nonces ENABLE ROW LEVEL SECURITY;

-- No client-side access - only service_role (edge functions) can read/write
-- No policies = no client access