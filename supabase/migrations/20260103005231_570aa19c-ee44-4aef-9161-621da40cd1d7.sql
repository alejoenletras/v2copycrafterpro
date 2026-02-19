-- Add saleads_config column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS saleads_config jsonb DEFAULT '{}'::jsonb;