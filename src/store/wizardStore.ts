import { create } from 'zustand';
import {
  Project,
  WizardStep,
  ExpertVoice,
  TransformationStory,
  CoreBeliefs,
  AvatarPains,
  AvatarDesires,
  RealObjection,
  MentalTrigger,
  ProductInfo,
  ConsciousnessLevel,
  VslType,
  VslMode,
  HighTicketInfo,
  SaleADSConfig,
  ExpertProfile,
  AvatarProfile,
  PersuasionStrategy,
  SelectedDNAs,
  UrlEntry,
  AutoAnalysis
} from '@/types';
import { supabase } from '@/lib/supabase';

interface WizardState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  project: Partial<Project>;
  projectId: string | null;
  isSaving: boolean;
  lastSavedAt: Date | null;
  selectedDNAs: SelectedDNAs;

  // Auto mode state
  urlEntries: UrlEntry[];
  rawTextContent: string;
  isAnalyzing: boolean;
  analysisError: string | null;

  // Actions
  setCurrentStep: (step: WizardStep) => void;
  markStepCompleted: (step: WizardStep) => void;
  updateProject: (updates: Partial<Project>) => void;
  canProceed: () => boolean;

  // Supabase Actions
  saveToSupabase: () => Promise<{ success: boolean; projectId?: string; error?: string }>;
  saveDraft: () => Promise<{ success: boolean; error?: string }>;
  loadProject: (projectId: string) => Promise<{ success: boolean; error?: string }>;

  // DNA Actions
  selectExpertDNA: (dna: any | null) => void;
  selectAudienceDNA: (dna: any | null) => void;
  selectProductDNA: (dna: any | null) => void;

  // Expert Profile Actions
  updateExpertVoice: (voice: Partial<ExpertVoice>) => void;
  updateExpertStory: (story: Partial<TransformationStory>) => void;
  updateExpertBeliefs: (beliefs: Partial<CoreBeliefs>) => void;

  // Avatar Profile Actions
  updateAvatarConsciousness: (level: ConsciousnessLevel) => void;
  updateAvatarPains: (pains: Partial<AvatarPains>) => void;
  updateAvatarDesires: (desires: Partial<AvatarDesires>) => void;
  updateAvatarObjections: (objections: RealObjection[]) => void;

  // Persuasion Actions
  updateMentalTriggers: (triggers: MentalTrigger[]) => void;

  // Product Actions
  updateProductInfo: (info: Partial<ProductInfo>) => void;

  // High Ticket Actions
  updateVslType: (vslType: VslType | undefined) => void;
  updateHighTicketInfo: (info: Partial<HighTicketInfo>) => void;

  // SaleADS Actions
  updateSaleADSConfig: (config: Partial<SaleADSConfig>) => void;

  // Auto Mode Actions
  updateVslMode: (mode: VslMode | undefined) => void;
  updateAutoAnalysis: (analysis: Partial<AutoAnalysis>) => void;
  addUrlEntry: (entry: UrlEntry) => void;
  removeUrlEntry: (id: string) => void;
  updateUrlEntry: (id: string, updates: Partial<UrlEntry>) => void;
  setRawTextContent: (text: string) => void;
  analyzeUrls: () => Promise<{ success: boolean; error?: string }>;
  fetchTranscriptForEntry: (id: string) => Promise<{ success: boolean; transcript?: string; instructions?: string; error?: string }>;

  // Reset
  resetWizard: () => void;
}

const DEFAULT_SALEADS_CONFIG: SaleADSConfig = {
  expert: {
    expertType: 'founder',
    name: 'Juan Osorio',
    credentials: '+$20M USD invertidos en publicidad, 319K seguidores',
    transformationStory: '',
    whyUseSaleADS: '',
    toneOfVoice: 'Directo, anti-agencia, motivador',
  },
  angle: {
    angleName: '',
    mainEnemy: '',
    bigIdea: '',
    mainPromise: '',
    hook30sec: '',
  },
  avatar: {
    isSpecific: false,
  },
  targetDuration: 20,
  ctaType: 'free-trial',
  targetCountry: 'multiple',
};

const initialState = {
  currentStep: 'funnel-type' as WizardStep,
  completedSteps: [] as WizardStep[],
  project: {
    saleadsConfig: DEFAULT_SALEADS_CONFIG,
  } as Partial<Project>,
  projectId: null as string | null,
  isSaving: false,
  lastSavedAt: null as Date | null,
  selectedDNAs: {} as SelectedDNAs,
  // Auto mode
  urlEntries: [] as UrlEntry[],
  rawTextContent: '',
  isAnalyzing: false,
  analysisError: null as string | null,
};

export const useWizardStore = create<WizardState>((set, get) => ({
  ...initialState,

  setCurrentStep: (step) => set({ currentStep: step }),

  markStepCompleted: (step) => {
    set((state) => ({
      completedSteps: state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step],
    }));
  },

  updateProject: (updates) => {
    set((state) => ({
      project: { ...state.project, ...updates },
    }));
  },

  canProceed: () => {
    const { currentStep, project, urlEntries, rawTextContent } = get();
    switch (currentStep) {
      case 'funnel-type':
        // For VSL, also need vslType selected
        if (project.funnelType === 'vsl') {
          return !!project.vslType;
        }
        // For vsl-saleads, just need funnelType
        return !!project.funnelType;
      case 'vsl-mode-selection':
        return !!project.vslMode;
      case 'url-input': {
        // Analysis must have been completed
        if (!project.autoAnalysis) return false;
        // At least one source must exist
        return urlEntries.length > 0 || rawTextContent.trim().length > 0;
      }
      case 'extracted-brief': {
        const aa = project.autoAnalysis;
        if (!aa) return false;
        return !!(
          aa.offerCore?.trim() &&
          aa.mainPainPoints?.trim() &&
          aa.promisedTransformation?.trim() &&
          aa.targetAudience?.trim() &&
          aa.uniqueSolutionMechanism?.trim()
        );
      }
      case 'dna-selection':
        // Always allow proceeding from DNA selection (manual is valid too)
        return true;
      case 'saleads-config': {
        const saleads = project.saleadsConfig;
        // El experto por defecto es 'founder' (si el usuario no tocó esa sección aún)
        const expertType = saleads?.expert?.expertType ?? 'founder';
        return !!(saleads?.angle?.angleName && expertType);
      }
      case 'high-ticket-info':
        const ht = project.highTicketInfo;
        return !!(
          ht?.serviceType &&
          ht?.investmentRange?.min &&
          ht?.investmentRange?.max &&
          ht?.programDuration &&
          ht?.qualificationCriteria?.minimumMonthlyRevenue
        );
      case 'expert-voice':
        const voice = project.expertProfile?.voice;
        return !!(
          voice?.name?.trim() &&
          (voice?.adjectives?.length || 0) >= 3 &&
          voice?.humorLevel &&
          voice?.sentenceLength &&
          voice?.useProfanity
        );
      case 'expert-story':
        return !!(project.expertProfile?.story?.lowestPoint && project.expertProfile?.story?.breakthrough);
      case 'expert-beliefs':
        const beliefs = project.expertProfile?.beliefs;
        return !!(
          (beliefs?.beliefs?.length || 0) >= 3 &&
          beliefs?.commonEnemy &&
          beliefs?.centralPromise?.trim()
        );
      case 'avatar-consciousness':
        return project.avatarProfile?.consciousnessLevel !== undefined;
      case 'avatar-pains':
        const pains = project.avatarProfile?.pains;
        return !!(
          pains?.primary?.trim() &&
          (pains?.economic?.length || 0) >= 2 &&
          (pains?.emotional?.length || 0) >= 2 &&
          (pains?.social?.length || 0) >= 2 &&
          (pains?.identity?.length || 0) >= 2
        );
      case 'avatar-desires':
        const desires = project.avatarProfile?.desires;
        return !!(
          desires?.identityTransformation?.trim() &&
          desires?.tangibleResults?.economic?.trim() &&
          desires?.tangibleResults?.lifestyle?.trim() &&
          desires?.tangibleResults?.relationships?.trim() &&
          desires?.timeframe
        );
      case 'avatar-objections':
        return (project.avatarProfile?.objections?.length || 0) > 0;
      case 'persuasion-triggers':
        return (project.persuasionStrategy?.mentalTriggers?.filter(t => t.enabled).length || 0) >= 3;
      case 'product-info':
        return !!(project.productInfo?.name && project.productInfo?.price);
      default:
        return true;
    }
  },

  saveToSupabase: async () => {
    const { project, projectId } = get();
    set({ isSaving: true });

    try {
      // Determine the effective funnel type for storage
      let effectiveFunnelType = project.funnelType || 'vsl';
      if (project.funnelType === 'vsl' && project.vslType === 'high-ticket') {
        effectiveFunnelType = 'vsl'; // Keep as 'vsl' in funnel_type column
      }

      // Para SaleADS, el país está en saleadsConfig.targetCountry
      const effectiveCountry = project.funnelType === 'vsl-saleads' 
        ? (project.saleadsConfig?.targetCountry || 'multiple')
        : (project.country || 'colombia');

      const projectData = {
        user_id: 'default-user',
        funnel_type: effectiveFunnelType,
        vsl_type: project.funnelType === 'vsl' ? project.vslType : null,
        vsl_mode: project.vslMode || 'manual',
        country: effectiveCountry,
        expert_profile: JSON.parse(JSON.stringify(project.expertProfile || {})),
        avatar_profile: JSON.parse(JSON.stringify(project.avatarProfile || {})),
        persuasion_strategy: JSON.parse(JSON.stringify(project.persuasionStrategy || {})),
        product_info: JSON.parse(JSON.stringify(project.productInfo || {})),
        high_ticket_info: project.vslType === 'high-ticket'
          ? JSON.parse(JSON.stringify(project.highTicketInfo || {}))
          : {},
        saleads_config: project.funnelType === 'vsl-saleads'
          ? JSON.parse(JSON.stringify(project.saleadsConfig || {}))
          : {},
        auto_analysis: project.autoAnalysis
          ? JSON.parse(JSON.stringify(project.autoAnalysis))
          : null,
      };

      let result;
      
      if (projectId) {
        // Update existing project
        const { data, error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', projectId)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new project
        const { data, error } = await supabase
          .from('projects')
          .insert(projectData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        set({ projectId: result.id });
      }

      set({ isSaving: false, lastSavedAt: new Date() });
      return { success: true, projectId: result.id };
    } catch (error: any) {
      set({ isSaving: false });
      console.error('Error saving to Supabase:', error);
      return { success: false, error: error.message };
    }
  },

  saveDraft: async () => {
    const result = await get().saveToSupabase();
    return { success: result.success, error: result.error };
  },

  selectExpertDNA: (dna) => {
    if (!dna) {
      set((state) => ({
        selectedDNAs: { ...state.selectedDNAs, expert: undefined },
        project: { ...state.project, expertProfile: {} },
      }));
      return;
    }
    set((state) => ({
      selectedDNAs: { ...state.selectedDNAs, expert: dna.id },
      project: {
        ...state.project,
        expertProfile: (dna.data || {}) as Partial<ExpertProfile>,
      },
    }));
  },

  selectAudienceDNA: (dna) => {
    if (!dna) {
      set((state) => ({
        selectedDNAs: { ...state.selectedDNAs, audience: undefined },
        project: { ...state.project, avatarProfile: {} },
      }));
      return;
    }
    set((state) => ({
      selectedDNAs: { ...state.selectedDNAs, audience: dna.id },
      project: {
        ...state.project,
        avatarProfile: (dna.data || {}) as Partial<AvatarProfile>,
      },
    }));
  },

  selectProductDNA: (dna) => {
    if (!dna) {
      set((state) => ({
        selectedDNAs: { ...state.selectedDNAs, product: undefined },
        project: { ...state.project, productInfo: undefined as any },
      }));
      return;
    }
    set((state) => ({
      selectedDNAs: { ...state.selectedDNAs, product: dna.id },
      project: {
        ...state.project,
        productInfo: (dna.data || {}) as ProductInfo,
      },
    }));
  },

  updateExpertVoice: (voice) => {
    set((state) => ({
      project: {
        ...state.project,
        expertProfile: {
          ...state.project.expertProfile,
          voice: { ...state.project.expertProfile?.voice, ...voice } as ExpertVoice,
        },
      },
    }));
  },

  updateExpertStory: (story) => {
    set((state) => ({
      project: {
        ...state.project,
        expertProfile: {
          ...state.project.expertProfile,
          story: { ...state.project.expertProfile?.story, ...story } as TransformationStory,
        },
      },
    }));
  },

  updateExpertBeliefs: (beliefs) => {
    set((state) => ({
      project: {
        ...state.project,
        expertProfile: {
          ...state.project.expertProfile,
          beliefs: { ...state.project.expertProfile?.beliefs, ...beliefs } as CoreBeliefs,
        },
      },
    }));
  },

  updateAvatarConsciousness: (level) => {
    set((state) => ({
      project: {
        ...state.project,
        avatarProfile: {
          ...state.project.avatarProfile,
          consciousnessLevel: level,
        },
      },
    }));
  },

  updateAvatarPains: (pains) => {
    set((state) => ({
      project: {
        ...state.project,
        avatarProfile: {
          ...state.project.avatarProfile,
          pains: { ...state.project.avatarProfile?.pains, ...pains } as AvatarPains,
        },
      },
    }));
  },

  updateAvatarDesires: (desires) => {
    set((state) => ({
      project: {
        ...state.project,
        avatarProfile: {
          ...state.project.avatarProfile,
          desires: { ...state.project.avatarProfile?.desires, ...desires } as AvatarDesires,
        },
      },
    }));
  },

  updateAvatarObjections: (objections) => {
    set((state) => ({
      project: {
        ...state.project,
        avatarProfile: {
          ...state.project.avatarProfile,
          objections,
        },
      },
    }));
  },

  updateMentalTriggers: (triggers) => {
    set((state) => ({
      project: {
        ...state.project,
        persuasionStrategy: {
          ...state.project.persuasionStrategy,
          mentalTriggers: triggers,
        },
      },
    }));
  },

  updateProductInfo: (info) => {
    set((state) => ({
      project: {
        ...state.project,
        productInfo: { ...state.project.productInfo, ...info } as ProductInfo,
      },
    }));
  },

  updateVslType: (vslType) => {
    set((state) => ({
      project: {
        ...state.project,
        vslType,
      },
    }));
  },

  updateHighTicketInfo: (info) => {
    set((state) => ({
      project: {
        ...state.project,
        highTicketInfo: { ...state.project.highTicketInfo, ...info } as HighTicketInfo,
      },
    }));
  },

  updateSaleADSConfig: (config) => {
    set((state) => ({
      project: {
        ...state.project,
        saleadsConfig: { 
          ...state.project.saleadsConfig, 
          ...config,
          expert: { ...state.project.saleadsConfig?.expert, ...config.expert },
          angle: { ...state.project.saleadsConfig?.angle, ...config.angle },
          avatar: { ...state.project.saleadsConfig?.avatar, ...config.avatar },
        } as SaleADSConfig,
      },
    }));
  },

  // Auto Mode Actions
  updateVslMode: (mode) => {
    set((state) => ({
      project: { ...state.project, vslMode: mode },
    }));
  },

  updateAutoAnalysis: (analysis) => {
    set((state) => ({
      project: {
        ...state.project,
        autoAnalysis: { ...state.project.autoAnalysis, ...analysis } as AutoAnalysis,
      },
    }));
  },

  addUrlEntry: (entry) => {
    set((state) => ({ urlEntries: [...state.urlEntries, entry] }));
  },

  removeUrlEntry: (id) => {
    set((state) => ({ urlEntries: state.urlEntries.filter(e => e.id !== id) }));
  },

  updateUrlEntry: (id, updates) => {
    set((state) => ({
      urlEntries: state.urlEntries.map(e => e.id === id ? { ...e, ...updates } : e),
    }));
  },

  setRawTextContent: (text) => {
    set({ rawTextContent: text });
  },

  analyzeUrls: async () => {
    const { urlEntries, rawTextContent } = get();
    if (urlEntries.length === 0 && !rawTextContent.trim()) {
      return { success: false, error: 'Agrega al menos una URL o texto para analizar' };
    }

    set({ isAnalyzing: true, analysisError: null });

    try {
      const baseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
      const analyzeUrl = `${baseUrl}/functions/v1/analyze-urls`;

      const response = await fetch(analyzeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          urls: urlEntries.map(e => ({ url: e.url, type: e.type, transcript: e.transcript })),
          rawText: rawTextContent,
        }),
        signal: AbortSignal.timeout(120000), // 2 minutes
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Error del servidor' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Error desconocido');

      set((state) => ({
        project: { ...state.project, autoAnalysis: data.analysis },
        isAnalyzing: false,
        analysisError: null,
      }));

      return { success: true };
    } catch (error: any) {
      const msg = error.message || 'Error al analizar contenido';
      set({ isAnalyzing: false, analysisError: msg });
      return { success: false, error: msg };
    }
  },

  fetchTranscriptForEntry: async (id) => {
    const { urlEntries } = get();
    const entry = urlEntries.find(e => e.id === id);
    if (!entry) return { success: false, error: 'Entrada no encontrada' };

    // Mark entry as loading
    set((state) => ({
      urlEntries: state.urlEntries.map(e =>
        e.id === id ? { ...e, label: '__loading__' } : e
      ),
    }));

    try {
      const baseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/functions/v1/fetch-transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ url: entry.url, type: entry.type }),
      });

      const data = await response.json();

      if (data.success && data.transcript) {
        set((state) => ({
          urlEntries: state.urlEntries.map(e =>
            e.id === id
              ? { ...e, transcript: data.transcript, label: `auto:${data.method}` }
              : e
          ),
        }));
        return { success: true, transcript: data.transcript };
      } else {
        set((state) => ({
          urlEntries: state.urlEntries.map(e =>
            e.id === id ? { ...e, label: undefined } : e
          ),
        }));
        return { success: false, instructions: data.instructions, error: data.error };
      }
    } catch (error: any) {
      set((state) => ({
        urlEntries: state.urlEntries.map(e =>
          e.id === id ? { ...e, label: undefined } : e
        ),
      }));
      return { success: false, error: error.message };
    }
  },

  resetWizard: () => set(initialState),

  loadProject: async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Proyecto no encontrado');

      // Map database fields to project structure
      const loadedProject: Partial<Project> = {
        funnelType: data.funnel_type === 'vsl-saleads' ? 'vsl-saleads' : data.funnel_type as any,
        vslType: data.vsl_type as VslType | undefined,
        vslMode: (data.vsl_mode as VslMode | undefined) || 'manual',
        country: data.country as Project['country'],
        expertProfile: (data.expert_profile || {}) as Partial<ExpertProfile>,
        avatarProfile: (data.avatar_profile || {}) as Partial<AvatarProfile>,
        persuasionStrategy: (data.persuasion_strategy || {}) as Partial<PersuasionStrategy>,
        productInfo: (data.product_info as unknown as ProductInfo) || undefined,
        highTicketInfo: (data.high_ticket_info as unknown as HighTicketInfo) || undefined,
        saleadsConfig: (data.saleads_config as unknown as SaleADSConfig) || DEFAULT_SALEADS_CONFIG,
        autoAnalysis: (data.auto_analysis as unknown as AutoAnalysis) || undefined,
      };

      // Determine the starting step based on funnel type
      let startStep: WizardStep = 'funnel-type';
      if (data.funnel_type === 'vsl-saleads' || data.funnel_type === 'vsl') {
        startStep = 'funnel-type';
      }

      set({
        project: loadedProject,
        projectId: data.id,
        currentStep: startStep,
        completedSteps: [],
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error loading project:', error);
      return { success: false, error: error.message };
    }
  },
}));
