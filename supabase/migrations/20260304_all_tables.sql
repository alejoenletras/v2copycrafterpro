-- =============================================================
-- Migración completa: TODAS las tablas de Hooq
-- Ejecutar en Supabase SQL Editor del proyecto ainspdnploxzrujbgcqo
-- =============================================================

-- 1. dnas
CREATE TABLE IF NOT EXISTS dnas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id TEXT DEFAULT 'default-user',
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  data JSONB,
  is_default BOOLEAN DEFAULT false
);

-- 2. projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id TEXT DEFAULT 'default-user',
  funnel_type TEXT NOT NULL DEFAULT 'vsl',
  country TEXT DEFAULT 'CO',
  expert_profile JSONB,
  avatar_profile JSONB,
  persuasion_strategy JSONB,
  product_info JSONB,
  high_ticket_info JSONB,
  saleads_config JSONB,
  vsl_type TEXT
);

-- 3. generated_copies
CREATE TABLE IF NOT EXISTS generated_copies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  validation JSONB,
  estimated_conversion JSONB
);

-- 4. reference_scripts
CREATE TABLE IF NOT EXISTS reference_scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id TEXT DEFAULT 'default-user',
  name TEXT NOT NULL,
  category TEXT,
  content TEXT,
  source_url TEXT,
  source_author TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false
);

-- 5. referent_profiles
CREATE TABLE IF NOT EXISTS referent_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id TEXT DEFAULT 'default-user',
  name TEXT NOT NULL,
  platform TEXT,
  profile_url TEXT,
  fan_page_name TEXT,
  niche TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 6. video_inspirations
CREATE TABLE IF NOT EXISTS video_inspirations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id TEXT DEFAULT 'default-user',
  source_type TEXT DEFAULT 'url',
  source_url TEXT,
  storage_path TEXT,
  platform TEXT
);

-- 7. script_corrections
CREATE TABLE IF NOT EXISTS script_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id TEXT DEFAULT 'default-user',
  generated_script JSONB,
  corrected_script JSONB,
  original_ad_text TEXT,
  correction_type TEXT,
  correction_notes TEXT,
  dna_expert_id UUID REFERENCES dnas(id),
  dna_audience_id UUID REFERENCES dnas(id),
  dna_product_id UUID REFERENCES dnas(id),
  quality_score_before NUMERIC
);

-- 8. content_structures
CREATE TABLE IF NOT EXISTS content_structures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  target_audiences JSONB DEFAULT '[]'::jsonb,
  blocks JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true
);

-- 9. generation_sessions
CREATE TABLE IF NOT EXISTS generation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  structure_id UUID REFERENCES content_structures(id),
  collected_info JSONB,
  generated_blocks JSONB,
  status TEXT DEFAULT 'generating'
);

-- 10. schedules
CREATE TABLE IF NOT EXISTS schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id TEXT DEFAULT 'default-user',
  keyword TEXT,
  countries TEXT,
  max_ads INTEGER DEFAULT 20,
  dna_expert UUID REFERENCES dnas(id),
  dna_audience UUID REFERENCES dnas(id),
  dna_product UUID REFERENCES dnas(id),
  telegram_chat_id TEXT,
  email TEXT,
  frequency TEXT DEFAULT 'daily',
  run_hour INTEGER DEFAULT 9,
  run_minute INTEGER DEFAULT 0,
  timezone TEXT DEFAULT 'America/Bogota',
  run_days TEXT,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT
);

-- =============================================================
-- RLS Policies (acceso público para todas las tablas)
-- =============================================================

ALTER TABLE dnas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON dnas;
CREATE POLICY "Allow all access" ON dnas FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON projects;
CREATE POLICY "Allow all access" ON projects FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE generated_copies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON generated_copies;
CREATE POLICY "Allow all access" ON generated_copies FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE reference_scripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON reference_scripts;
CREATE POLICY "Allow all access" ON reference_scripts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE referent_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON referent_profiles;
CREATE POLICY "Allow all access" ON referent_profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE video_inspirations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON video_inspirations;
CREATE POLICY "Allow all access" ON video_inspirations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE script_corrections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON script_corrections;
CREATE POLICY "Allow all access" ON script_corrections FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE content_structures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON content_structures;
CREATE POLICY "Allow all access" ON content_structures FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON generation_sessions;
CREATE POLICY "Allow all access" ON generation_sessions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON schedules;
CREATE POLICY "Allow all access" ON schedules FOR ALL USING (true) WITH CHECK (true);

-- Las 3 tablas HOOQ v2 ya tienen RLS (de la migración anterior)
-- competitor_profiles, organic_posts, scrape_runs
