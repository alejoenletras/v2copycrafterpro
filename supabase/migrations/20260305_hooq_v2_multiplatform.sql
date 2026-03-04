-- =============================================================
-- HOOQ v2 — Multi-Platform Extension
-- Tables: competitor_profiles, organic_posts, scrape_runs
-- =============================================================

-- competitor_profiles: perfiles enriquecidos de competidores (FB → IG → TikTok)
CREATE TABLE IF NOT EXISTS competitor_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  fb_page_name TEXT NOT NULL,
  fb_page_url TEXT,
  fb_page_id TEXT,
  ig_handle TEXT,
  ig_profile_url TEXT,
  ig_status TEXT DEFAULT 'pending',
  ig_enriched_at TIMESTAMPTZ,
  tiktok_handle TEXT,
  tiktok_profile_url TEXT,
  tiktok_status TEXT DEFAULT 'pending',
  tiktok_enriched_at TIMESTAMPTZ,
  source_keyword TEXT,
  last_scraped_at TIMESTAMPTZ,
  UNIQUE(fb_page_id)
);

CREATE INDEX IF NOT EXISTS idx_competitor_ig_status ON competitor_profiles(ig_status);
CREATE INDEX IF NOT EXISTS idx_competitor_tiktok_status ON competitor_profiles(tiktok_status);
CREATE INDEX IF NOT EXISTS idx_competitor_fb_page_name ON competitor_profiles(fb_page_name);

-- organic_posts: posts orgánicos de IG/TikTok filtrados
CREATE TABLE IF NOT EXISTS organic_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  competitor_id UUID REFERENCES competitor_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  post_type TEXT NOT NULL CHECK (post_type IN ('video', 'image', 'carousel', 'text')),
  post_url TEXT,
  post_id TEXT,
  posted_at TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  caption TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  content_analysis TEXT,
  rewritten_copy TEXT,
  analyzed_at TIMESTAMPTZ,
  UNIQUE(platform, post_id)
);

CREATE INDEX IF NOT EXISTS idx_organic_platform ON organic_posts(platform);
CREATE INDEX IF NOT EXISTS idx_organic_views ON organic_posts(views);
CREATE INDEX IF NOT EXISTS idx_organic_competitor ON organic_posts(competitor_id);
CREATE INDEX IF NOT EXISTS idx_organic_analyzed ON organic_posts(analyzed_at);

-- scrape_runs: log de ejecuciones de scraping
CREATE TABLE IF NOT EXISTS scrape_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  source TEXT NOT NULL CHECK (source IN ('facebook_ads', 'instagram', 'tiktok')),
  keyword TEXT,
  competitor_id UUID REFERENCES competitor_profiles(id),
  max_results INTEGER,
  total_scraped INTEGER DEFAULT 0,
  total_filtered INTEGER DEFAULT 0,
  total_analyzed INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  error_message TEXT,
  apify_cost_usd DECIMAL(10,4)
);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_status ON scrape_runs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_source ON scrape_runs(source);
