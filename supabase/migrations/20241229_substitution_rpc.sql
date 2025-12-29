-- Function to handle substitution securely
CREATE OR REPLACE FUNCTION perform_substitution(unavailable_team_id UUID, backup_team_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Run as 'postgres' (admin) to bypass RLS for this specific operation
AS $$
BEGIN
  -- 1. Mark the unavailable member
  UPDATE public.service_team
  SET status = 'unavailable'
  WHERE id = unavailable_team_id;

  -- 2. Promote the backup member
  UPDATE public.service_team
  SET role_type = 'primary'
  WHERE id = backup_team_id;
END;
$$;
