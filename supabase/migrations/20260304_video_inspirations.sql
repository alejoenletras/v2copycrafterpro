-- ─────────────────────────────────────────────────────────────────
-- Video Inspiration Agent: table + storage bucket
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE public.video_inspirations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'default-user',

  -- Input
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'url')),
  source_url TEXT,
  storage_path TEXT,
  platform TEXT,

  -- Status (drives the 6-state UI)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'analyzing', 'analyzed',
    'searching', 'scoring', 'scored',
    'modeling', 'completed', 'error'
  )),
  error_message TEXT,

  -- Gemini analysis output
  analysis JSONB,

  -- Search
  search_results JSONB DEFAULT '[]',
  search_keywords_used TEXT[] DEFAULT '{}',

  -- Scoring
  scored_results JSONB DEFAULT '[]',

  -- Modeling config
  selected_ad_indices INTEGER[] DEFAULT '{}',
  dna_expert_id UUID REFERENCES public.dnas(id) ON DELETE SET NULL,
  dna_audience_id UUID REFERENCES public.dnas(id) ON DELETE SET NULL,
  dna_product_id UUID REFERENCES public.dnas(id) ON DELETE SET NULL,

  -- Modeling output
  modeled_scripts JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.video_inspirations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to video_inspirations" ON public.video_inspirations
  FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_vi_user_status ON public.video_inspirations(user_id, status);
CREATE INDEX idx_vi_created ON public.video_inspirations(created_at DESC);

-- ─── Storage bucket ──────────────────────────────────────────────
-- Run this separately if it fails (bucket may already exist)

INSERT INTO storage.buckets (id, name, public)
VALUES ('video-inspirations', 'video-inspirations', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow all uploads to video-inspirations"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'video-inspirations');

CREATE POLICY "Allow all reads from video-inspirations"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'video-inspirations');

CREATE POLICY "Allow all deletes from video-inspirations"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'video-inspirations');
