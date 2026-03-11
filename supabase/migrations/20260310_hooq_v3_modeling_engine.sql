-- =============================================================
-- HOOQ v3: Motor de Modelado con DNAs
-- Tablas: referentes, dna_referente_rules, referente_content,
--         modeled_scripts, generation_runs
-- =============================================================

-- =============================================================
-- TABLA: referentes
-- Perfiles de creadores de contenido que se modelan
-- =============================================================
CREATE TABLE IF NOT EXISTS referentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  fb_page_name TEXT,
  fb_page_url TEXT,
  ig_handle TEXT,
  ig_profile_url TEXT,
  tiktok_handle TEXT,
  tiktok_profile_url TEXT,
  ig_status TEXT DEFAULT 'pending' CHECK (ig_status IN ('found', 'not_found', 'pending', 'manual')),
  tiktok_status TEXT DEFAULT 'pending' CHECK (tiktok_status IN ('found', 'not_found', 'pending', 'manual')),
  UNIQUE(name)
);

-- =============================================================
-- TABLA: dna_referente_rules
-- Reglas de modelado por combinación DNA + Referente
-- =============================================================
CREATE TABLE IF NOT EXISTS dna_referente_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  personality_dna_id UUID,
  audience_dna_id UUID,
  product_dna_id UUID,
  referente_id UUID NOT NULL REFERENCES referentes(id) ON DELETE CASCADE,
  what_to_model TEXT NOT NULL,
  what_to_filter TEXT NOT NULL,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(personality_dna_id, referente_id)
);

CREATE INDEX IF NOT EXISTS idx_dna_ref_rules_personality ON dna_referente_rules(personality_dna_id);
CREATE INDEX IF NOT EXISTS idx_dna_ref_rules_referente ON dna_referente_rules(referente_id);

-- =============================================================
-- TABLA: referente_content
-- Banco de contenido scrapeado de referentes
-- =============================================================
CREATE TABLE IF NOT EXISTS referente_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  referente_id UUID NOT NULL REFERENCES referentes(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook_ads', 'instagram', 'tiktok')),
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'image', 'carousel', 'text')),
  source_type TEXT NOT NULL CHECK (source_type IN ('paid', 'organic')),
  post_url TEXT,
  post_id TEXT,
  posted_at TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  days_active INTEGER,
  original_caption TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  transcript TEXT,
  media_analysis TEXT,
  strategic_analysis TEXT,
  content_structure TEXT,
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 10),
  analyzed_at TIMESTAMPTZ,
  is_used BOOLEAN DEFAULT false,
  UNIQUE(platform, post_id)
);

CREATE INDEX IF NOT EXISTS idx_ref_content_referente ON referente_content(referente_id);
CREATE INDEX IF NOT EXISTS idx_ref_content_quality ON referente_content(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_ref_content_unused ON referente_content(is_used) WHERE is_used = false;

-- =============================================================
-- TABLA: modeled_scripts
-- Guiones generados por el motor de modelado
-- =============================================================
CREATE TABLE IF NOT EXISTS modeled_scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  personality_dna_id UUID,
  audience_dna_id UUID,
  product_dna_id UUID,
  source_content_id UUID REFERENCES referente_content(id),
  referente_id UUID REFERENCES referentes(id),
  referente_name TEXT,
  hook_1 TEXT NOT NULL,
  hook_2 TEXT,
  body TEXT NOT NULL,
  cta TEXT NOT NULL,
  production_notes TEXT,
  script_format TEXT CHECK (script_format IN ('video_script', 'written_ad', 'carousel_script')),
  target_platform TEXT CHECK (target_platform IN ('facebook', 'instagram', 'tiktok', 'multi')),
  what_was_modeled TEXT,
  why_it_works TEXT,
  how_adapted TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'used')),
  google_doc_url TEXT,
  model_used TEXT
);

CREATE INDEX IF NOT EXISTS idx_scripts_personality ON modeled_scripts(personality_dna_id);
CREATE INDEX IF NOT EXISTS idx_scripts_status ON modeled_scripts(status);
CREATE INDEX IF NOT EXISTS idx_scripts_created ON modeled_scripts(created_at DESC);

-- =============================================================
-- TABLA: generation_runs
-- Log de generación de guiones
-- =============================================================
CREATE TABLE IF NOT EXISTS generation_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  personality_dna_id UUID,
  audience_dna_id UUID,
  product_dna_id UUID,
  requested_count INTEGER NOT NULL,
  generated_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  google_doc_url TEXT
);

-- RLS: permitir todo (single-user app)
ALTER TABLE referentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all referentes" ON referentes;
CREATE POLICY "Allow all referentes" ON referentes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE dna_referente_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all dna_referente_rules" ON dna_referente_rules;
CREATE POLICY "Allow all dna_referente_rules" ON dna_referente_rules FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE referente_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all referente_content" ON referente_content;
CREATE POLICY "Allow all referente_content" ON referente_content FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE modeled_scripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all modeled_scripts" ON modeled_scripts;
CREATE POLICY "Allow all modeled_scripts" ON modeled_scripts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE generation_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all generation_runs" ON generation_runs;
CREATE POLICY "Allow all generation_runs" ON generation_runs FOR ALL USING (true) WITH CHECK (true);
