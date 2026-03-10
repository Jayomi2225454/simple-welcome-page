
-- Fix RLS policies on tournament_player_points: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Admins can manage player points" ON public.tournament_player_points;
DROP POLICY IF EXISTS "Anyone can view player points" ON public.tournament_player_points;

CREATE POLICY "Admins can manage player points"
ON public.tournament_player_points
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view player points"
ON public.tournament_player_points
FOR SELECT
TO public
USING (true);
