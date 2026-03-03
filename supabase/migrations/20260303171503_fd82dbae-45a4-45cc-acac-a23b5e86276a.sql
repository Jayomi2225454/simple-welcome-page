ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS kill_points_value integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS win_points_value integer NOT NULL DEFAULT 1;