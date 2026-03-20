-- ============================================================================
-- HOOQ — Persistence Tables for Chat, Surveys, VSL
-- 2026-03-20
-- ============================================================================

-- ─── 1. BRAND CHAT ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default-user',
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  message_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, message_order);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id, updated_at DESC);

-- ─── 2. SURVEY ANALYSES ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS survey_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default-user',
  file_name TEXT NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  context TEXT,
  document TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_analyses_user ON survey_analyses(user_id, created_at DESC);

-- ─── 3. VSL PROJECTS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vsl_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default-user',
  project_name TEXT,
  expert_dna_id UUID REFERENCES dnas(id) ON DELETE SET NULL,
  audience_dna_id UUID REFERENCES dnas(id) ON DELETE SET NULL,
  product_dna_id UUID REFERENCES dnas(id) ON DELETE SET NULL,
  instructions TEXT,
  reference_url TEXT,
  reference_text TEXT,
  generated_sections JSONB DEFAULT '{}'::jsonb,
  chat_messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vsl_projects_user ON vsl_projects(user_id, updated_at DESC);
