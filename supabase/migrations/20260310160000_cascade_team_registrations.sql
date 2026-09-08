-- ==============================================================================
-- Migration: Cascade Delete & Sync Team Registrations
-- Description: Automatically removes or cancels registrations when a team is
--              deleted or disabled by an admin.
-- ==============================================================================

-- 1. Trigger Function: Cascade Delete linked registrations when a team is permanently deleted
CREATE OR REPLACE FUNCTION public.cascade_delete_team_registrations()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete registrations for captain and all members belonging to this deleted team
  DELETE FROM public.tournament_registrations
  WHERE tournament_id = OLD.tournament_id
    AND (
      user_id = OLD.captain_user_id
      OR user_id IN (
        SELECT user_id 
        FROM public.tournament_team_members 
        WHERE team_id = OLD.id
      )
    );

  -- Delete player points for this team if any
  DELETE FROM public.tournament_player_points
  WHERE team_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger BEFORE DELETE on tournament_teams
DROP TRIGGER IF EXISTS trg_cascade_delete_team_registrations ON public.tournament_teams;
CREATE TRIGGER trg_cascade_delete_team_registrations
BEFORE DELETE ON public.tournament_teams
FOR EACH ROW
EXECUTE FUNCTION public.cascade_delete_team_registrations();


-- 2. Trigger Function: Sync team disabled status to tournament_registrations (soft delete)
CREATE OR REPLACE FUNCTION public.sync_team_status_to_registrations()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'disabled' OR NEW.status = 'inactive' THEN
    UPDATE public.tournament_registrations
    SET status = 'cancelled', updated_at = now()
    WHERE tournament_id = NEW.tournament_id
      AND (
        user_id = NEW.captain_user_id
        OR user_id IN (
          SELECT user_id 
          FROM public.tournament_team_members 
          WHERE team_id = NEW.id
        )
      );
  ELSIF (OLD.status = 'disabled' OR OLD.status = 'inactive') AND NEW.status = 'active' THEN
    UPDATE public.tournament_registrations
    SET status = 'confirmed', updated_at = now()
    WHERE tournament_id = NEW.tournament_id
      AND (
        user_id = NEW.captain_user_id
        OR user_id IN (
          SELECT user_id 
          FROM public.tournament_team_members 
          WHERE team_id = NEW.id
        )
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger AFTER UPDATE OF status on tournament_teams
DROP TRIGGER IF EXISTS trg_sync_team_status_to_registrations ON public.tournament_teams;
CREATE TRIGGER trg_sync_team_status_to_registrations
AFTER UPDATE OF status ON public.tournament_teams
FOR EACH ROW
EXECUTE FUNCTION public.sync_team_status_to_registrations();


-- 3. One-time cleanup query: Remove orphaned registrations from team tournaments where the team was already deleted
DELETE FROM public.tournament_registrations r
WHERE EXISTS (
  SELECT 1 FROM public.tournaments t 
  WHERE t.id = r.tournament_id 
    AND (
      CASE 
        WHEN t.team_size::text ~ '^[0-9]+$' THEN (t.team_size::text)::int > 1
        ELSE FALSE
      END
      OR t.team_mode IN ('duo', 'squad', '5-man')
    )
)
AND NOT EXISTS (
  SELECT 1 FROM public.tournament_team_members tm
  JOIN public.tournament_teams tt ON tt.id = tm.team_id
  WHERE tm.user_id = r.user_id AND tt.tournament_id = r.tournament_id
)
AND NOT EXISTS (
  SELECT 1 FROM public.tournament_teams tt
  WHERE tt.captain_user_id = r.user_id AND tt.tournament_id = r.tournament_id
);
