-- Add vsl_mode column: 'manual' (default, preserves existing behavior) or 'auto'
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS vsl_mode TEXT DEFAULT 'manual'
    CHECK (vsl_mode IN ('manual', 'auto'));

-- Add auto_analysis column to store the 13 extracted data points as JSONB
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS auto_analysis JSONB DEFAULT NULL;

COMMENT ON COLUMN public.projects.vsl_mode IS
  'VSL generation mode: manual (wizard-filled) or auto (URL-extracted analysis)';

COMMENT ON COLUMN public.projects.auto_analysis IS
  'Structured JSON extracted by analyze-urls edge function.
   Keys: offerCore, mainPainPoints, promisedTransformation, targetAudience,
   authority, uniqueProblemMechanism, uniqueSolutionMechanism, voiceAndCommunication,
   expertRole, offerStructure, vslStructure, offerStructurePreview, conversionProjection';
