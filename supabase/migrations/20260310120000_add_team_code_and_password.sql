-- 1. Add team_code and password columns to tournament_teams
ALTER TABLE public.tournament_teams 
ADD COLUMN IF NOT EXISTS team_code text,
ADD COLUMN IF NOT EXISTS password text;

-- 2. Populate team_code for any existing teams that don't have one
UPDATE public.tournament_teams
SET team_code = 'TM-' || UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 6))
WHERE team_code IS NULL;

-- 3. Index for fast team_code lookup per tournament
CREATE INDEX IF NOT EXISTS idx_tournament_teams_code 
ON public.tournament_teams (tournament_id, team_code);

