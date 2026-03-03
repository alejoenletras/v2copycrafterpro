-- ─────────────────────────────────────────────────────────────────
-- Training System: 4 tables for learning from user corrections
-- ─────────────────────────────────────────────────────────────────

-- 1. script_corrections: User corrections to generated ad scripts
CREATE TABLE public.script_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'default-user',
  original_ad_text TEXT,
  generated_script JSONB NOT NULL,
  corrected_script JSONB NOT NULL,
  correction_type TEXT CHECK (correction_type IN ('tone', 'structure', 'content', 'complete_rewrite', 'minor_edit')),
  correction_notes TEXT,
  dna_expert_id UUID REFERENCES public.dnas(id) ON DELETE SET NULL,
  dna_audience_id UUID REFERENCES public.dnas(id) ON DELETE SET NULL,
  dna_product_id UUID REFERENCES public.dnas(id) ON DELETE SET NULL,
  quality_score_before REAL,
  quality_score_after REAL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.script_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to script_corrections" ON public.script_corrections
  FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_corrections_user ON public.script_corrections(user_id, created_at DESC);
CREATE INDEX idx_corrections_dna ON public.script_corrections(dna_expert_id);

-- 2. reference_scripts: Library of reference/benchmark scripts
CREATE TABLE public.reference_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'default-user',
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('ad', 'vsl', 'email', 'landing', 'other')),
  content TEXT NOT NULL,
  source_url TEXT,
  source_author TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reference_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to reference_scripts" ON public.reference_scripts
  FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_references_user ON public.reference_scripts(user_id, created_at DESC);
CREATE INDEX idx_references_category ON public.reference_scripts(category);

-- 3. referent_profiles: Influencer/copywriter profiles to track
CREATE TABLE public.referent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'default-user',
  name TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'youtube', 'other')),
  profile_url TEXT,
  fan_page_name TEXT,
  niche TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.referent_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to referent_profiles" ON public.referent_profiles
  FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_referents_user ON public.referent_profiles(user_id);

-- 4. training_patterns: AI-condensed patterns from corrections
CREATE TABLE public.training_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'default-user',
  dna_expert_id UUID REFERENCES public.dnas(id) ON DELETE SET NULL,
  pattern_type TEXT CHECK (pattern_type IN ('tone', 'structure', 'vocabulary', 'technique', 'general')),
  description TEXT NOT NULL,
  examples JSONB DEFAULT '[]',
  strength REAL DEFAULT 1.0,
  source_correction_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.training_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to training_patterns" ON public.training_patterns
  FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_patterns_user_dna ON public.training_patterns(user_id, dna_expert_id);
