-- ─────────────────────────────────────────────────────────────────────────────
-- content_structures: Estructuras de marketing editables (VSL, webinar, ads…)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.content_structures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('vsl', 'webinar', 'facebook-ad', 'youtube-ad', 'email')),
  description TEXT,
  target_audiences TEXT[] DEFAULT '{}',
  blocks      JSONB NOT NULL DEFAULT '[]',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.content_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to content_structures" ON public.content_structures
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_content_structures_type ON public.content_structures(type);
CREATE INDEX idx_content_structures_active ON public.content_structures(is_active);

-- ─────────────────────────────────────────────────────────────────────────────
-- generation_sessions: Estado de cada sesión de generación bloque a bloque
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.generation_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT DEFAULT 'default-user',
  structure_id     UUID REFERENCES public.content_structures(id) ON DELETE SET NULL,
  collected_info   JSONB DEFAULT '{}',
  generated_blocks JSONB DEFAULT '{}',
  status           TEXT DEFAULT 'collecting'
                     CHECK (status IN ('collecting', 'generating', 'completed', 'paused')),
  dna_profile_id   UUID REFERENCES public.dnas(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.generation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to generation_sessions" ON public.generation_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_generation_sessions_user ON public.generation_sessions(user_id, created_at DESC);
CREATE INDEX idx_generation_sessions_status ON public.generation_sessions(status);
