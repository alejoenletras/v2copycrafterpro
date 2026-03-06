-- HOOQ Ads Agent Rework — New tables for ad search jobs and found ads

-- Table: ad_searches (search jobs)
CREATE TABLE IF NOT EXISTS ad_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  search_type TEXT NOT NULL CHECK (search_type IN ('keyword', 'page_url')),
  query TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'ALL',
  media_type TEXT NOT NULL DEFAULT 'all' CHECK (media_type IN ('all', 'video', 'image')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  total_results INTEGER,
  filtered_results INTEGER,
  error_message TEXT,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ad_searches_status ON ad_searches(status);

-- Table: ads (found ads)
CREATE TABLE IF NOT EXISTS ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id UUID NOT NULL REFERENCES ad_searches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  ad_archive_id TEXT NOT NULL UNIQUE,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  page_url TEXT,
  page_likes INTEGER,
  ad_start_date DATE NOT NULL,
  days_active INTEGER NOT NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('video', 'image', 'text')),
  original_ad_copy TEXT,
  media_url TEXT,
  media_description TEXT,
  summary TEXT,
  rewritten_copy TEXT,
  raw_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_ads_search_id ON ads(search_id);
CREATE INDEX IF NOT EXISTS idx_ads_ad_archive_id ON ads(ad_archive_id);
CREATE INDEX IF NOT EXISTS idx_ads_days_active ON ads(days_active DESC);

-- Disable RLS (single-user app)
ALTER TABLE ad_searches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all ad_searches" ON ad_searches;
CREATE POLICY "Allow all ad_searches" ON ad_searches FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all ads" ON ads;
CREATE POLICY "Allow all ads" ON ads FOR ALL USING (true) WITH CHECK (true);
