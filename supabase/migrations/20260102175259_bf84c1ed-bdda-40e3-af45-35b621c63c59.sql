-- Add vsl_type column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS vsl_type text DEFAULT NULL;

-- Add high_ticket_info column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS high_ticket_info jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.vsl_type IS 'Type of VSL: direct-sale or high-ticket. Only used when funnel_type is vsl';
COMMENT ON COLUMN public.projects.high_ticket_info IS 'High ticket specific configuration: investment range, qualification criteria, program duration, strategic call info';