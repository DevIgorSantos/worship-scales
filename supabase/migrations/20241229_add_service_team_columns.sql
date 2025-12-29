-- Add status and role_type columns to service_team table
ALTER TABLE public.service_team 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'unavailable', 'substituted')),
ADD COLUMN IF NOT EXISTS role_type text DEFAULT 'primary' CHECK (role_type IN ('primary', 'backup'));

-- Comment on columns
COMMENT ON COLUMN public.service_team.status IS 'Status of the member in the service: confirmed, unavailable, substituted';
COMMENT ON COLUMN public.service_team.role_type IS 'Type of role: primary (titular) or backup (reserva)';
