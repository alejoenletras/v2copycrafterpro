-- Create DNAs table for reusable campaign profiles
CREATE TABLE public.dnas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'default-user',
  type TEXT NOT NULL CHECK (type IN ('expert', 'audience', 'product')),
  name TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dnas ENABLE ROW LEVEL SECURITY;

-- Permissive policy for development
CREATE POLICY "Allow all access to dnas" ON public.dnas
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_dnas_user_type ON public.dnas(user_id, type);
CREATE INDEX idx_dnas_updated_at ON public.dnas(updated_at DESC);
