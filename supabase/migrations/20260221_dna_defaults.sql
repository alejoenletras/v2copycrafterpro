-- Add is_default column to dnas table
ALTER TABLE public.dnas
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Ensure only one default per user per type
CREATE UNIQUE INDEX IF NOT EXISTS idx_dnas_one_default_per_type
  ON public.dnas (user_id, type)
  WHERE is_default = true;
