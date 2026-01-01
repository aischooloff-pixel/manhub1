-- Add blocked_until column for temporary blocking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS blocked_until timestamp with time zone DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.blocked_until IS 'When the temporary block expires. NULL means permanent block or no block.';