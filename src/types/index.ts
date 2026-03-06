export type ConsciousnessLevel = 0 | 1 | 2 | 3 | 4;
export type FunnelType = 'vsl' | 'launch' | 'autowebinar' | 'vsl-saleads';
export type VslType = 'direct-sale' | 'high-ticket';
export type VslMode = 'manual' | 'auto';
export type Country = 'mexico' | 'colombia' | 'argentina' | 'spain' | 'chile' | 'peru' | 'multiple' | 'usa';

// AUTO MODE: URL input types
export type UrlInputType = 'youtube' | 'tiktok' | 'reel' | 'landing-page' | 'document' | 'other';

export interface UrlEntry {
  id: string;
  url: string;
  type: UrlInputType;
  transcript?: string; // required for youtube/tiktok/reel
  label?: string;
}

// AUTO MODE: The 13 data points extracted from URLs by the analyze-urls edge function
export interface AutoAnalysis {
  offerCore: string;               // 1. Core de la oferta
  mainPainPoints: string;          // 2. Pain points principales
  promisedTransformation: string;  // 3. Transformación prometida
  targetAudience: string;          // 4. Audiencia objetivo
  authority: string;               // 5. Autoridad
  uniqueProblemMechanism: string;  // 6. Mecanismo único del problema
  uniqueSolutionMechanism: string; // 7. Mecanismo único de la solución
  voiceAndCommunication: string;   // 8. Voz y comunicación
  expertRole: string;              // 9. Rol del experto y conexión con audiencia
  offerStructure: string;          // 10. Oferta completa
  vslStructure: string;            // 11. Estructura del VSL sugerida
  offerStructurePreview: string;   // 12. Preview de la estructura de la oferta
  conversionProjection: string;    // 13. Proyección de conversión
}

// DNAs de Campana
export type DNAType = 'expert' | 'audience' | 'product';

// Field-level status for AI-assisted DNA fields
export type DnaFieldStatus = 'empty' | 'ai_suggested' | 'validated';

// Personality DNA (type: expert) — 4 flat fields
export interface PersonalityDna {
  about: string;            // Who you are, your story, your transformation
  voice: string;            // How you speak: tone, rhythm, adjectives
  credentials: string;      // Results, certifications, credibility proof
  forbidden_words: string;  // Words or phrases to NEVER use
  _status?: Record<string, DnaFieldStatus>;
}

// Audience DNA (type: audience) — 4 flat fields
export interface AudienceDna {
  ideal_client: string;   // Who is the ideal client, their situation
  core_belief: string;    // The belief/frustration/desire that moves them
  testimonials: string;   // Real phrases, success stories, social proof
  keywords: string;       // Key words and phrases this audience uses
  _status?: Record<string, DnaFieldStatus>;
}

// Product DNA (type: product) — 4 flat fields
export interface ProductDna {
  main_problem: string;         // The specific problem your product solves
  solution_promise: string;     // The transformation/result you promise
  irresistible_offer: string;   // Price, bonuses, guarantee, payment plans
  keywords: string;             // Keywords for SEO and positioning
  _status?: Record<string, DnaFieldStatus>;
}

export interface DNA {
  id: string;
  userId: string;
  type: DNAType;
  name: string;
  is_default?: boolean;
  data: PersonalityDna | AudienceDna | ProductDna | Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SelectedDNAs {
  expert?: string;   // DNA id
  audience?: string;  // DNA id
  product?: string;   // DNA id
}

// SALEADS.AI CONFIGURATION
export interface SaleADSAngle {
  angleName: string;
  mainEnemy: string;
  bigIdea: string;
  mainPromise: string;
  hook30sec: string;
}

export interface SaleADSExpert {
  expertType: 'founder' | 'user' | 'character';
  name: string;
  credentials: string;
  transformationStory: string;
  whyUseSaleADS: string;
  toneOfVoice: string;
}

export interface SaleADSAvatar {
  isSpecific: boolean;
  industry?: string;
  experienceLevel?: string;
  mainFrustration?: string;
  primaryDesire?: string;
  consciousnessLevel?: number;
  avatarPhrases?: string;
}

export interface SaleADSConfig {
  expert: SaleADSExpert;
  angle: SaleADSAngle;
  avatar: SaleADSAvatar;
  targetDuration: number;
  ctaType: 'free-trial' | 'direct-purchase';
  targetCountry: string;
}

// HIGH TICKET CONFIGURATION
export interface HighTicketQualificationCriteria {
  minimumMonthlyRevenue: number;
  requiredExperience: string;
  expectedCommitment: string;
}

export interface HighTicketInvestmentRange {
  min: number;
  max: number;
}

export interface HighTicketStrategicCallInfo {
  duration: number; // minutes
  format: 'zoom' | 'phone' | 'in-person';
  whoConducts: 'you' | 'team';
}

export type HighTicketServiceType = 'coaching-1on1' | 'coaching-group' | 'consulting' | 'mentorship' | 'done-for-you' | 'other';
export type HighTicketProgramDuration = '30-days' | '60-days' | '90-days' | '6-months' | '12-months' | 'custom';

export interface HighTicketInfo {
  serviceType: HighTicketServiceType;
  serviceTypeOther?: string;
  investmentRange: HighTicketInvestmentRange;
  programDuration: HighTicketProgramDuration;
  programDurationCustom?: string;
  qualificationCriteria: HighTicketQualificationCriteria;
  strategicCallInfo: HighTicketStrategicCallInfo;
}

// PILAR 1: EXPERTO
export interface ExpertVoice {
  name: string;
  adjectives: string[];
  description: string;
  humorLevel: 'none' | 'low' | 'medium' | 'high';
  sentenceLength: 'short' | 'medium' | 'long' | 'mixed';
  useProfanity: 'never' | 'rarely' | 'sometimes' | 'often';
}

export interface TransformationStory {
  lowestPoint: string;
  breakthrough: string;
  current: string;
  credentials: string[];
}

export interface CoreBeliefs {
  beliefs: string[];
  commonEnemy: string;
  centralPromise: string;
}

export interface ExpertProfile {
  voice: ExpertVoice;
  story: TransformationStory;
  beliefs: CoreBeliefs;
  contentSamples: Array<{ id: number; excerpt: string; url?: string }>;
}

// PILAR 2: AVATAR
export interface AvatarPains {
  economic: string[];
  emotional: string[];
  social: string[];
  identity: string[];
  primary: string;
}

export interface AvatarDesires {
  identityTransformation: string;
  tangibleResults: {
    economic: string;
    lifestyle: string;
    relationships: string;
  };
  timeframe: string;
}

export interface RealObjection {
  exact_words: string;
  root_cause: string;
  destruction: string;
}

export interface AvatarProfile {
  consciousnessLevel: ConsciousnessLevel;
  pains: AvatarPains;
  desires: AvatarDesires;
  objections: RealObjection[];
  language: string[];
}

// PILAR 3: PERSUASIÓN
export interface MentalTrigger {
  name: string;
  enabled: boolean;
  application: string;
  timing: string;
}

export interface PersuasionStrategy {
  mentalTriggers: MentalTrigger[];
  cognitiveBiases: Array<{ name: string; enabled: boolean; usage: string }>;
}

// PRODUCTO
export interface Bonus {
  name: string;
  value: number;
}

export interface PaymentPlan {
  enabled: boolean;
  installments: number;
  installmentPrice: number;
}

export type GuaranteePeriod = '30' | '60' | '90' | 'custom';

export interface ProductInfo {
  name: string;
  price: number;
  audienceProblem: string;
  solution: string;
  transformationOffer: string;
  benefitBullets: string[];
  keywords: string[];
  guaranteePeriod: GuaranteePeriod;
  guaranteeDescription: string;
  bonuses: Bonus[];
  paymentPlan: PaymentPlan;
}

// PROYECTO
export interface Project {
  id: string;
  userId: string;
  funnelType: FunnelType;
  vslType?: VslType;
  vslMode?: VslMode;          // 'manual' (default) | 'auto'
  autoAnalysis?: AutoAnalysis; // Populated when vslMode === 'auto'
  country: Country;
  expertProfile: Partial<ExpertProfile>;
  avatarProfile: Partial<AvatarProfile>;
  persuasionStrategy: Partial<PersuasionStrategy>;
  productInfo: ProductInfo;
  highTicketInfo?: HighTicketInfo;
  saleadsConfig?: SaleADSConfig;
  createdAt: Date;
  updatedAt: Date;
}

export type WizardStep =
  | 'funnel-type'
  | 'vsl-mode-selection'   // Auto vs Manual selection (VSL only)
  | 'url-input'            // URL/content input (auto mode only)
  | 'extracted-brief'      // Review & edit the 13 extracted data points (auto mode only)
  | 'high-ticket-info'
  | 'saleads-config'
  | 'dna-selection'
  | 'expert-voice'
  | 'expert-story'
  | 'expert-beliefs'
  | 'avatar-consciousness'
  | 'avatar-pains'
  | 'avatar-desires'
  | 'avatar-objections'
  | 'persuasion-triggers'
  | 'product-info'
  | 'review';

export interface StepConfig {
  id: WizardStep;
  label: string;
  shortLabel: string;
  pilar: 0 | 1 | 2 | 3;
  pilarName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT GENERATOR SYSTEM (block-by-block AI generation)
// ─────────────────────────────────────────────────────────────────────────────

export type ContentType = 'vsl' | 'webinar' | 'facebook-ad' | 'youtube-ad' | 'email';
export type BlockStatus = 'pending' | 'generating' | 'completed' | 'review-needed';
export type SessionStatus = 'collecting' | 'generating' | 'completed' | 'paused';

export interface StructureBlock {
  id: string;
  name: string;
  objective: string;
  instructions: string;
  required_inputs: string[];
}

export interface ContentStructure {
  id: string;
  name: string;
  type: ContentType;
  description: string;
  targetAudiences: string[];
  blocks: StructureBlock[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GeneratedBlock {
  content: string;
  status: BlockStatus;
  generatedAt?: string;
}

export interface GenerationSession {
  id: string;
  structureId: string;
  collectedInfo: Record<string, string>;
  generatedBlocks: Record<string, GeneratedBlock>;
  status: SessionStatus;
  dnaProfileId?: string;
  createdAt?: string;
}

export interface ExtractedField {
  value: string;
  confidence: 'high' | 'low' | 'missing';
}

// ─── Training & Optimization System ─────────────────────────────────────────

export type CorrectionType = 'tone' | 'structure' | 'content' | 'complete_rewrite' | 'minor_edit';
export type ReferenceCategory = 'ad' | 'vsl' | 'email' | 'landing' | 'other';
export type ReferentPlatform = 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'other';
export type PatternType = 'tone' | 'structure' | 'vocabulary' | 'technique' | 'general';

export interface ScriptCorrection {
  id: string;
  user_id: string;
  original_ad_text?: string;
  generated_script: Record<string, string>;
  corrected_script: Record<string, string>;
  correction_type?: CorrectionType;
  correction_notes?: string;
  dna_expert_id?: string;
  dna_audience_id?: string;
  dna_product_id?: string;
  quality_score_before?: number;
  quality_score_after?: number;
  created_at: string;
}

export interface ReferenceScript {
  id: string;
  user_id: string;
  name: string;
  category: ReferenceCategory;
  content: string;
  source_url?: string;
  source_author?: string;
  tags: string[];
  notes?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReferentProfile {
  id: string;
  user_id: string;
  name: string;
  platform: ReferentPlatform;
  profile_url?: string;
  fan_page_name?: string;
  niche?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface TrainingPattern {
  id: string;
  user_id: string;
  dna_expert_id?: string;
  pattern_type: PatternType;
  description: string;
  examples: Array<{ before: string; after: string }>;
  strength: number;
  created_at: string;
  updated_at: string;
}

export interface ModeledScript {
  content_number: number;
  referente: string;
  platform: string;
  link: string;
  hook_1: string;
  hook_2: string;
  cuerpo: string;
  cta_1: string;
  cta_2: string;
  quality_score: number;
  attempts: number;
  needs_review: boolean;
  pending_items?: string[];
}

export interface AgentResult {
  success: boolean;
  message: string;
  keyword: string;
  docUrl?: string | null;
  platformCounts?: { facebook: number; instagram: number; tiktok: number };
  warnings?: string[];
  stats?: {
    total_ads_processed: number;
    average_quality_score: number;
    retries_used: number;
    processing_time_ms: number;
  };
  scripts?: ModeledScript[];
}

// ─── Video Inspiration Agent ─────────────────────────────────────────────────

export type VideoInspirationStatus =
  | 'pending'
  | 'analyzing'
  | 'analyzed'
  | 'searching'
  | 'scoring'
  | 'scored'
  | 'modeling'
  | 'completed'
  | 'error';

export type VideoSourceType = 'upload' | 'url';

export interface VideoAnalysis {
  summary: string;
  content_type: string;
  tone: string;
  visual_style: string;
  key_techniques: string[];
  target_audience_profile: string;
  search_keywords: string[];
  estimated_duration_seconds: number;
  hook_analysis: string;
  cta_analysis: string;
  persuasion_structure: string;
}

export interface ScoredAd {
  ad_id: string;
  ad_text: string;
  advertiser_name: string;
  headline?: string;
  cta_text?: string;
  days_running?: number | null;
  video_url?: string | null;
  keyword_source?: string;
  similarity_score: number;
  reasoning: string;
  technique_match: string[];
  recommended: boolean;
}

export interface VideoInspiration {
  id: string;
  user_id: string;
  source_type: VideoSourceType;
  source_url?: string;
  storage_path?: string;
  platform?: string;
  status: VideoInspirationStatus;
  error_message?: string;
  analysis?: VideoAnalysis;
  search_results?: Record<string, unknown>[];
  search_keywords_used?: string[];
  scored_results?: ScoredAd[];
  selected_ad_indices?: number[];
  dna_expert_id?: string;
  dna_audience_id?: string;
  dna_product_id?: string;
  modeled_scripts?: ModeledScript[];
  created_at: string;
  updated_at: string;
}

// ─── Ads Agent Rework ─────────────────────────────────────────────────────────

export type AdSearchStatus = 'pending' | 'processing' | 'completed' | 'error';
export type AdSearchType = 'keyword' | 'page_url';
export type AdMediaFilter = 'all' | 'video' | 'image';

export interface AdSearch {
  id: string;
  created_at: string;
  search_type: AdSearchType;
  query: string;
  country_code: string;
  media_type: AdMediaFilter;
  status: AdSearchStatus;
  total_results: number | null;
  filtered_results: number | null;
  error_message: string | null;
  completed_at: string | null;
}

export interface Ad {
  id: string;
  search_id: string;
  created_at: string;
  ad_archive_id: string;
  page_id: string;
  page_name: string;
  page_url: string | null;
  page_likes: number | null;
  ad_start_date: string;
  days_active: number;
  ad_type: 'video' | 'image' | 'text';
  original_ad_copy: string | null;
  media_url: string | null;
  media_description: string | null;
  summary: string | null;
  rewritten_copy: string | null;
  raw_data: Record<string, unknown> | null;
}

// ─── Ads Agent Chat ──────────────────────────────────────────────────────────

export type AdObjective = 'captacion' | 'agitacion' | 'remarketing' | 'compra' | 'reconocimiento';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  scripts?: ModeledScript[];
  buttons?: Array<{ label: string; value: string }>;
  isLoading?: boolean;
  pipelineStatus?: string;
  attachments?: Array<{ name: string; content: string }>;
}

export interface AgentChatResponse {
  message: string;
  action?: {
    type: 'execute';
    params: {
      search_query: string;
      search_mode: 'keyword' | 'brand';
      countries: string[];
      max_ads: number;
      objective: AdObjective;
      cta: string;
      modeling_instructions: string;
    };
  } | null;
  suggested_buttons?: Array<{ label: string; value: string }>;
}

// ===== HOOQ v2 — Multi-Platform Types =====

export interface CompetitorProfile {
  id: string;
  created_at: string;
  updated_at: string;
  fb_page_name: string;
  fb_page_url: string | null;
  fb_page_id: string | null;
  ig_handle: string | null;
  ig_profile_url: string | null;
  ig_status: 'found' | 'not_found' | 'pending';
  ig_enriched_at: string | null;
  tiktok_handle: string | null;
  tiktok_profile_url: string | null;
  tiktok_status: 'found' | 'not_found' | 'pending';
  tiktok_enriched_at: string | null;
  source_keyword: string | null;
  last_scraped_at: string | null;
}

export interface OrganicPost {
  id: string;
  created_at: string;
  competitor_id: string;
  competitor_name?: string;
  platform: 'instagram' | 'tiktok';
  post_type: 'video' | 'image' | 'carousel' | 'text';
  post_url: string | null;
  post_id: string | null;
  posted_at: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  caption: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  content_analysis: string | null;
  rewritten_copy: string | null;
  analyzed_at: string | null;
}

export interface ScrapeRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  source: 'facebook_ads' | 'instagram' | 'tiktok';
  keyword: string | null;
  competitor_id: string | null;
  competitor_name?: string;
  max_results: number | null;
  total_scraped: number;
  total_filtered: number;
  total_analyzed: number;
  total_errors: number;
  status: 'running' | 'completed' | 'failed' | 'partial';
  error_message: string | null;
  apify_cost_usd: number | null;
}
