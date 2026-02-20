import { create } from 'zustand';
import { ContentStructure, GenerationSession, GeneratedBlock, BlockStatus } from '@/types';
import { supabase } from '@/lib/supabase';

const BASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function edgeFn(name: string) {
  return `${BASE_URL}/functions/v1/${name}`;
}

async function callEdge(name: string, body: unknown) {
  const res = await fetch(edgeFn(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  return res.json();
}

// Selected DNAs structure (holds the full DNA objects for prompt building)
interface SelectedDnasState {
  personality: any | null;  // expert DNA
  audience: any | null;     // audience DNA
  product: any | null;      // product DNA
}

interface ContentGeneratorState {
  // Navigation
  currentScreen: 1 | 2 | 3 | 4;

  // Data
  structures: ContentStructure[];
  selectedStructure: ContentStructure | null;
  session: GenerationSession | null;

  // DNA selection (3 separate DNAs + optional extra context)
  selectedDnas: SelectedDnasState;
  extraContext: string;

  // Loading states
  isLoadingStructures: boolean;
  isGenerating: boolean;
  generatingBlockId: string | null;

  // Error
  error: string | null;

  // Actions
  loadStructures: () => Promise<void>;
  selectStructure: (structure: ContentStructure) => void;
  setSelectedDna: (slot: keyof SelectedDnasState, dna: any | null) => void;
  setExtraContext: (ctx: string) => void;
  startSessionWithDnas: () => Promise<void>;
  generateBlock: (blockId: string, extraInstructions?: string) => Promise<{ success: boolean; error?: string }>;
  generateAll: () => Promise<void>;
  setCurrentScreen: (screen: 1 | 2 | 3 | 4) => void;
  resetSession: () => void;
}

const initialState = {
  currentScreen: 1 as const,
  structures: [],
  selectedStructure: null,
  session: null,
  selectedDnas: { personality: null, audience: null, product: null },
  extraContext: '',
  isLoadingStructures: false,
  isGenerating: false,
  generatingBlockId: null,
  error: null,
};

// Build the DNA context object to pass to the edge function
function buildDnaContext(selectedDnas: SelectedDnasState, extraContext: string) {
  const ctx: Record<string, any> = {};

  if (selectedDnas.personality) {
    const d = selectedDnas.personality.data ?? {};
    ctx.personality = {
      about: d.about ?? '',
      voice: d.voice ?? '',
      credentials: d.credentials ?? '',
      forbidden_words: d.forbidden_words ?? '',
      name: selectedDnas.personality.name,
    };
  }

  if (selectedDnas.audience) {
    const d = selectedDnas.audience.data ?? {};
    ctx.audience = {
      ideal_client: d.ideal_client ?? '',
      core_belief: d.core_belief ?? '',
      testimonials: d.testimonials ?? '',
      keywords: d.keywords ?? '',
      name: selectedDnas.audience.name,
    };
  }

  if (selectedDnas.product) {
    const d = selectedDnas.product.data ?? {};
    ctx.product = {
      main_problem: d.main_problem ?? '',
      solution_promise: d.solution_promise ?? '',
      irresistible_offer: d.irresistible_offer ?? '',
      keywords: d.keywords ?? '',
      name: selectedDnas.product.name,
    };
  }

  if (extraContext?.trim()) {
    ctx.extra_context = extraContext.trim();
  }

  return ctx;
}

export const useContentGeneratorStore = create<ContentGeneratorState>((set, get) => ({
  ...initialState,

  loadStructures: async () => {
    set({ isLoadingStructures: true, error: null });
    try {
      const res = await fetch(edgeFn('fetch-structures'), {
        headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'apikey': SUPABASE_KEY },
      });
      const data = await res.json();
      if (data.success) {
        set({ structures: data.structures, isLoadingStructures: false });
      } else {
        set({ error: data.error, isLoadingStructures: false });
      }
    } catch (err: any) {
      set({ error: err.message, isLoadingStructures: false });
    }
  },

  selectStructure: (structure) => {
    set({ selectedStructure: structure, session: null });
  },

  setSelectedDna: (slot, dna) => {
    set((state) => ({
      selectedDnas: { ...state.selectedDnas, [slot]: dna },
    }));
  },

  setExtraContext: (ctx) => set({ extraContext: ctx }),

  startSessionWithDnas: async () => {
    const { selectedStructure } = get();
    if (!selectedStructure) return;

    try {
      const { data, error } = await supabase
        .from('generation_sessions')
        .insert({
          structure_id: selectedStructure.id,
          collected_info: {},
          generated_blocks: {},
          status: 'generating',
        })
        .select()
        .single();

      if (error) throw error;

      const session: GenerationSession = {
        id: data.id,
        structureId: data.structure_id,
        collectedInfo: {},
        generatedBlocks: {},
        status: 'generating',
        createdAt: data.created_at,
      };

      set({ session, currentScreen: 3 });

      // Kick off all-block generation immediately
      get().generateAll();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  generateBlock: async (blockId: string, extraInstructions?: string) => {
    const { session, selectedStructure, selectedDnas, extraContext } = get();
    if (!session || !selectedStructure) return { success: false, error: 'Sesión no iniciada' };

    const block = selectedStructure.blocks.find((b) => b.id === blockId);
    if (!block) return { success: false, error: 'Bloque no encontrado' };

    // Mark as generating
    set((state) => ({
      generatingBlockId: blockId,
      session: state.session
        ? {
            ...state.session,
            generatedBlocks: {
              ...state.session.generatedBlocks,
              [blockId]: { content: '', status: 'generating' as BlockStatus, generatedAt: undefined },
            },
          }
        : null,
    }));

    try {
      const dnaContext = buildDnaContext(selectedDnas, extraContext);

      const result = await callEdge('generate-content-block', {
        session_id: session.id,
        block_id: blockId,
        block_name: block.name,
        block_instructions: block.instructions,
        dna_context: dnaContext,
        extra_instructions: extraInstructions,
      });

      if (result.success) {
        const generatedBlock: GeneratedBlock = {
          content: result.content,
          status: 'completed',
          generatedAt: new Date().toISOString(),
        };
        set((state) => ({
          generatingBlockId: null,
          session: state.session
            ? {
                ...state.session,
                generatedBlocks: { ...state.session.generatedBlocks, [blockId]: generatedBlock },
              }
            : null,
        }));
        return { success: true };
      } else {
        set((state) => ({
          generatingBlockId: null,
          session: state.session
            ? {
                ...state.session,
                generatedBlocks: {
                  ...state.session.generatedBlocks,
                  [blockId]: { content: '', status: 'review-needed' as BlockStatus },
                },
              }
            : null,
        }));
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      set((state) => ({
        generatingBlockId: null,
        session: state.session
          ? {
              ...state.session,
              generatedBlocks: {
                ...state.session.generatedBlocks,
                [blockId]: { content: '', status: 'review-needed' as BlockStatus },
              },
            }
          : null,
      }));
      return { success: false, error: err.message };
    }
  },

  generateAll: async () => {
    const { selectedStructure, session } = get();
    if (!selectedStructure || !session) return;

    set({ isGenerating: true, error: null });

    for (const block of selectedStructure.blocks) {
      await get().generateBlock(block.id);
    }

    // Mark completed
    await supabase
      .from('generation_sessions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', session.id);

    set((state) => ({
      isGenerating: false,
      session: state.session ? { ...state.session, status: 'completed' } : null,
      currentScreen: 4,
    }));
  },

  setCurrentScreen: (screen) => set({ currentScreen: screen }),

  resetSession: () => set(initialState),
}));
