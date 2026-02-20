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
