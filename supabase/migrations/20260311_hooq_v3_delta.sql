-- =============================================================
-- HOOQ v3 Delta: missing fields + scheduled_generations table
-- =============================================================

-- referentes: add source field
ALTER TABLE referentes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ai_suggested'));

-- dna_referente_rules: add AI-generated fields + make what_to_model/what_to_filter nullable
ALTER TABLE dna_referente_rules ALTER COLUMN what_to_model DROP NOT NULL;
ALTER TABLE dna_referente_rules ALTER COLUMN what_to_filter DROP NOT NULL;
ALTER TABLE dna_referente_rules ADD COLUMN IF NOT EXISTS alignment_analysis TEXT;
ALTER TABLE dna_referente_rules ADD COLUMN IF NOT EXISTS alignment_score INTEGER CHECK (alignment_score BETWEEN 1 AND 10);
ALTER TABLE dna_referente_rules ADD COLUMN IF NOT EXISTS rules_generated_at TIMESTAMPTZ;

-- modeled_scripts: add missing fields
ALTER TABLE modeled_scripts ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE modeled_scripts ADD COLUMN IF NOT EXISTS generation_run_id UUID;

-- generation_runs: add scheduling fields
ALTER TABLE generation_runs ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;
ALTER TABLE generation_runs ADD COLUMN IF NOT EXISTS schedule_frequency TEXT CHECK (schedule_frequency IN ('daily', 'weekly', 'biweekly'));

-- =============================================================
-- TABLA: scheduled_generations
-- Configuración de generación automática programada
-- =============================================================
CREATE TABLE IF NOT EXISTS scheduled_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  personality_dna_id UUID NOT NULL,
  audience_dna_id UUID NOT NULL,
  product_dna_id UUID NOT NULL,
  scripts_per_run INTEGER DEFAULT 10,
  script_format TEXT DEFAULT 'video_script' CHECK (script_format IN ('video_script', 'written_ad')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly')),
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  delivery_email TEXT,
  delivery_telegram BOOLEAN DEFAULT true,
  delivery_google_doc BOOLEAN DEFAULT true
);

ALTER TABLE scheduled_generations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all scheduled_generations" ON scheduled_generations;
CREATE POLICY "Allow all scheduled_generations" ON scheduled_generations FOR ALL USING (true) WITH CHECK (true);
