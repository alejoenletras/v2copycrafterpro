-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'anonymous',
  funnel_type TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'mexico',
  expert_profile JSONB DEFAULT '{}',
  avatar_profile JSONB DEFAULT '{}',
  persuasion_strategy JSONB DEFAULT '{}',
  product_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create generated_copies table
CREATE TABLE public.generated_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  validation JSONB DEFAULT '{}',
  estimated_conversion JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_copies ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development (allow all operations)
CREATE POLICY "Allow all access to projects" ON public.projects
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to generated_copies" ON public.generated_copies
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_projects_updated_at ON public.projects(updated_at DESC);
CREATE INDEX idx_generated_copies_project_id ON public.generated_copies(project_id);