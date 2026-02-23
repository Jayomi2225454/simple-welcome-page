
-- Create player-level points table
CREATE TABLE public.tournament_player_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  player_name TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, team_id, user_id)
);

ALTER TABLE public.tournament_player_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage player points"
ON public.tournament_player_points FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view player points"
ON public.tournament_player_points FOR SELECT
USING (true);

CREATE TRIGGER update_tournament_player_points_updated_at
BEFORE UPDATE ON public.tournament_player_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
