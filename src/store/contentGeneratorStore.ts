import { create } from 'zustand';
import { ContentStructure, GenerationSession, GeneratedBlock, BlockStatus, ExtractedField } from '@/types';
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

interface ContentGeneratorState {
  // Navigation
  currentScreen: 1 | 2 | 3 | 4;

  // Data
  structures: ContentStructure[];
  selectedStructure: ContentStructure | null;
  session: GenerationSession | null;
  selectedDnaId: string | null;

  // Loading states
  isLoadingStructures: boolean;
  isGenerating: boolean;
  generatingBlockId: string | null;

  // Extraction state
  isExtracting: boolean;
  extractedFields: Record<string, ExtractedField>;

  // Error
  error: string | null;

  // Actions
  loadStructures: () => Promise<void>;
  selectStructure: (structure: ContentStructure) => void;
  setSelectedDna: (dnaId: string | null) => void;
  startSession: () => Promise<{ success: boolean; error?: string }>;
  updateCollectedInfo: (key: string, value: string) => void;
  extractFromDocument: (documentText: string) => Promise<void>;
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
  selectedDnaId: null,
  isLoadingStructures: false,
  isGenerating: false,
  generatingBlockId: null,
  isExtracting: false,
  extractedFields: {},
  error: null,
};

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
    set({ selectedStructure: structure, session: null, extractedFields: {} });
  },

  setSelectedDna: (dnaId) => {
    set({ selectedDnaId: dnaId });
  },

  startSession: async () => {
    const { selectedStructure, selectedDnaId } = get();
    if (!selectedStructure) return { success: false, error: 'No hay estructura seleccionada' };

    try {
      const sessionData = {
        structure_id: selectedStructure.id,
        dna_profile_id: selectedDnaId || null,
        collected_info: {},
        generated_blocks: {},
        status: 'collecting' as const,
      };

      const { data, error } = await supabase
        .from('generation_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      const session: GenerationSession = {
        id: data.id,
        structureId: data.structure_id,
        collectedInfo: data.collected_info ?? {},
        generatedBlocks: data.generated_blocks ?? {},
        status: data.status,
        dnaProfileId: data.dna_profile_id ?? undefined,
        createdAt: data.created_at,
      };

      set({ session, currentScreen: 2 });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  updateCollectedInfo: (key, value) => {
    set((state) => {
      if (!state.session) return {};
      const updated: GenerationSession = {
        ...state.session,
        collectedInfo: { ...state.session.collectedInfo, [key]: value },
      };
      // Persist to DB (fire and forget)
      supabase
        .from('generation_sessions')
        .update({ collected_info: updated.collectedInfo, updated_at: new Date().toISOString() })
        .eq('id', updated.id);
      return { session: updated };
    });
  },

  extractFromDocument: async (documentText: string) => {
    const { selectedStructure } = get();
    if (!selectedStructure) return;

    set({ isExtracting: true, error: null });

    // Collect all required_inputs across all blocks (deduplicated)
    const allFields = Array.from(
      new Set(selectedStructure.blocks.flatMap((b) => b.required_inputs))
    );

    try {
      const data = await callEdge('extract-document-data', {
        document_text: documentText,
        fields_to_extract: allFields,
      });

      if (data.success) {
        set({ extractedFields: data.extracted, isExtracting: false });
        // Auto-fill high-confidence fields
        const { session } = get();
        if (session) {
          const autoFilled: Record<string, string> = {};
          for (const [field, result] of Object.entries(data.extracted as Record<string, ExtractedField>)) {
            if (result.confidence === 'high' && result.value) {
              autoFilled[field] = result.value;
            }
          }
          if (Object.keys(autoFilled).length > 0) {
            const newInfo = { ...session.collectedInfo, ...autoFilled };
            set((state) => ({
              session: state.session ? { ...state.session, collectedInfo: newInfo } : null,
            }));
            supabase
              .from('generation_sessions')
              .update({ collected_info: newInfo, updated_at: new Date().toISOString() })
              .eq('id', session.id);
          }
        }
      } else {
        set({ error: data.error, isExtracting: false });
      }
    } catch (err: any) {
      set({ error: err.message, isExtracting: false });
    }
  },

  generateBlock: async (blockId: string, extraInstructions?: string) => {
    const { session, selectedStructure, selectedDnaId } = get();
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
      // Fetch DNA data if selected
      let dnaData: Record<string, any> | undefined;
      if (selectedDnaId) {
        const { data: dna } = await supabase
          .from('dnas')
          .select('data, type, name')
          .eq('id', selectedDnaId)
          .single();
        if (dna) dnaData = { ...dna.data, dna_type: dna.type, dna_name: dna.name };
      }

      const result = await callEdge('generate-content-block', {
        session_id: session.id,
        block_id: blockId,
        block_name: block.name,
        block_instructions: block.instructions,
        collected_info: session.collectedInfo,
        dna_data: dnaData,
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

    // Update session status
    await supabase
      .from('generation_sessions')
      .update({ status: 'generating', updated_at: new Date().toISOString() })
      .eq('id', session.id);

    set((state) => ({
      session: state.session ? { ...state.session, status: 'generating' } : null,
    }));

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
