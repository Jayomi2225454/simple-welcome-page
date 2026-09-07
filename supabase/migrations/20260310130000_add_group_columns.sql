-- Ensure group columns exist on tournament_points
ALTER TABLE public.tournament_points 
ADD COLUMN IF NOT EXISTS group_name text,
ADD COLUMN IF NOT EXISTS position_in_group integer;

-- Add group_name to tournament_teams for persistent grouping
ALTER TABLE public.tournament_teams 
ADD COLUMN IF NOT EXISTS group_name text;

-- Create index for fast group-based queries
CREATE INDEX IF NOT EXISTS idx_tournament_points_group 
ON public.tournament_points (tournament_id, match_number, group_name);
