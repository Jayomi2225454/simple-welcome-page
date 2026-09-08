-- Add payment_mode column to tournament_teams table to allow teams to choose between
-- 'leader_pays' (leader pays upfront for whole squad) and 'each_pays' (members pay per slot)
ALTER TABLE public.tournament_teams 
ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'each_pays';

-- Create index for filtering teams by payment mode if needed
CREATE INDEX IF NOT EXISTS idx_tournament_teams_payment_mode 
ON public.tournament_teams (tournament_id, payment_mode);
