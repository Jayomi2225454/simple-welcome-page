-- 1. Add enforce_cap and registration_status columns to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS enforce_cap boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_status text DEFAULT 'open';

-- 2. Index for fast querying of tournaments by cap enforcement and status
CREATE INDEX IF NOT EXISTS idx_tournaments_cap_status 
ON public.tournaments (enforce_cap, status);
