-- =============================================================
-- Tabla: training_patterns
-- Usada por: get-training-context (lectura), condense-training-patterns (escritura)
-- Ejecutar en Supabase SQL Editor del proyecto ainspdnploxzrujbgcqo
-- =============================================================

CREATE TABLE IF NOT EXISTS training_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id TEXT DEFAULT 'default-user',
  dna_expert_id UUID REFERENCES dnas(id),
  pattern_type TEXT NOT NULL,
  description TEXT NOT NULL,
  examples JSONB DEFAULT '[]'::jsonb,
  strength NUMERIC DEFAULT 1
);

CREATE INDEX idx_training_patterns_user ON training_patterns(user_id);
CREATE INDEX idx_training_patterns_strength ON training_patterns(strength DESC);

ALTER TABLE training_patterns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON training_patterns;
CREATE POLICY "Allow all access" ON training_patterns FOR ALL USING (true) WITH CHECK (true);
