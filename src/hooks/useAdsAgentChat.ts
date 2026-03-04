import { useState, useCallback, useRef } from 'react';
import { callEdge } from '@/lib/callEdge';
import { useToast } from '@/hooks/use-toast';
import type { ChatMessage, AdObjective, AgentChatResponse, ModeledScript } from '@/types';

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function makeMsg(role: ChatMessage['role'], content: string, extra?: Partial<ChatMessage>): ChatMessage {
  return {
    id: makeId(),
    role,
    content,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

const WELCOME_MESSAGE: ChatMessage = makeMsg(
  'assistant',
  '¡Hola! Soy Hooq, tu estratega creativo de anuncios. ¿Qué tipo de campaña vamos a crear hoy?',
  {
    buttons: [
      { label: '🎯 Captación', value: 'captacion' },
      { label: '🔥 Agitación', value: 'agitacion' },
      { label: '🔄 Remarketing', value: 'remarketing' },
      { label: '💰 Compra', value: 'compra' },
      { label: '👁️ Reconocimiento', value: 'reconocimiento' },
    ],
  },
);

interface DnaContext {
  expert: string;
  audience: string;
  product: string;
}

export function useAdsAgentChat() {
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<string | null>(null);
  const [objective, setObjective] = useState<AdObjective | null>(null);
  const [cta, setCta] = useState<string | null>(null);

  // DNA IDs
  const [personalityId, setPersonalityId] = useState('');
  const [audienceId, setAudienceId] = useState('');
  const [productId, setProductId] = useState('');

  // DNA context builder ref (set by the page)
  const buildDnaStringRef = useRef<(id: string) => string>(() => '');

  const setBuildDnaString = useCallback((fn: (id: string) => string) => {
    buildDnaStringRef.current = fn;
  }, []);

  // ─── Core: Send message to Claude agent ──────────────────────────────────────

  const sendToAgent = useCallback(async (
    allMessages: ChatMessage[],
    currentObjective: AdObjective | null,
    currentCta: string | null,
    references: Array<{ name: string; content: string }>,
  ): Promise<AgentChatResponse> => {
    // Build DNA context
    const dnaContext: DnaContext = {
      expert: buildDnaStringRef.current(personalityId),
      audience: buildDnaStringRef.current(audienceId),
      product: buildDnaStringRef.current(productId),
    };

    // Get training context
    let trainingContext = '';
    try {
      const trainingRes = await callEdge('get-training-context', {
        dna_expert_id: personalityId || undefined,
      }, 15000);
      trainingContext = trainingRes.training_context || '';
    } catch (err) {
      console.warn('Could not get training context:', err);
    }

    // Build messages array for Claude
    const chatMessages = allMessages
      .filter(m => m.role !== 'system' && !m.isLoading)
      .map(m => ({ role: m.role, content: m.content }));

    const res = await callEdge('agent-chat', {
      messages: chatMessages,
      dna_context: dnaContext,
      objective: currentObjective,
      cta: currentCta,
      references: references.map(r => `[${r.name}]\n${r.content}`),
      training_context: trainingContext,
    }, 45000);

    return res as AgentChatResponse;
  }, [personalityId, audienceId, productId]);

  // ─── Execute pipeline (search → model → deliver) ─────────────────────────────

  const executePipeline = useCallback(async (params: {
    search_query: string;
    search_mode: 'keyword' | 'brand';
    countries: string[];
    max_ads: number;
    objective: AdObjective;
    cta: string;
    modeling_instructions: string;
  }) => {
    const addSystemMsg = (text: string) => {
      setMessages(prev => [...prev, makeMsg('system', text, { pipelineStatus: text })]);
    };

    try {
      // Phase 1: Search
      setPipelinePhase('searching');
      addSystemMsg('🔍 Buscando anuncios ganadores...');

      const searchResult = await callEdge('search-winning-ads', {
        search_mode: params.search_mode,
        search_query: params.search_query,
        countries: params.countries,
        max_ads: params.max_ads,
      }, 180000);

      const ads = searchResult.ads || [];
      if (ads.length === 0) {
        setMessages(prev => [...prev, makeMsg('assistant',
          `No encontré anuncios para "${params.search_query}". Prueba con otra palabra clave o amplía los países.`
        )]);
        setPipelinePhase(null);
        return;
      }

      addSystemMsg(`✅ ${ads.length} anuncios encontrados. Modelando guiones...`);

      // Phase 2: Model ads
      setPipelinePhase('modeling');

      // Get training context for modeling
      let trainingCtx = '';
      try {
        const tc = await callEdge('get-training-context', {
          dna_expert_id: personalityId || undefined,
        }, 15000);
        trainingCtx = tc.training_context || '';
      } catch {
        // continue without training context
      }

      // Build ads in the format pipeline expects
      const pipelineAds = ads.map((ad: Record<string, unknown>) => ({
        source: String(ad.platform || 'facebook'),
        link: `https://facebook.com/ads/library/?id=${ad.ad_id || ''}`,
        author: String(ad.advertiser_name || ad.page_name || 'Unknown'),
        text: String(ad.ad_text || ''),
        headline: ad.headline ? String(ad.headline) : undefined,
        cta: ad.cta_text ? String(ad.cta_text) : undefined,
        days_running: ad.days_running ?? undefined,
      }));

      const modelResult = await callEdge('pipeline-model-ads', {
        ads: pipelineAds,
        dna_expert: buildDnaStringRef.current(personalityId),
        dna_audience: buildDnaStringRef.current(audienceId),
        dna_product: buildDnaStringRef.current(productId),
        training_context: trainingCtx
          ? `${trainingCtx}\n\nINSTRUCCIONES ADICIONALES DEL USUARIO:\n${params.modeling_instructions}`
          : params.modeling_instructions,
      }, 300000);

      const scripts: ModeledScript[] = modelResult.scripts || [];

      if (scripts.length === 0) {
        setMessages(prev => [...prev, makeMsg('assistant',
          'El pipeline no generó guiones. Puede ser que los anuncios encontrados no tuvieran suficiente texto para modelar.'
        )]);
        setPipelinePhase(null);
        return;
      }

      // Phase 3: Done — show scripts in chat
      setPipelinePhase(null);
      addSystemMsg(`✅ ${scripts.length} guiones modelados. Edita y corrige para entrenar la IA.`);

      setMessages(prev => [...prev, makeMsg('assistant',
        `¡Listo! Generé **${scripts.length} guiones** basados en anuncios ganadores de "${params.search_query}". Revísalos, edita lo que necesites — cada corrección entrena mi estilo.`,
        { scripts },
      )]);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPipelinePhase(null);
      setMessages(prev => [...prev, makeMsg('assistant',
        `Hubo un error en el pipeline: ${msg}. ¿Quieres intentar de nuevo?`
      )]);
      toast({ variant: 'destructive', description: msg });
    }
  }, [personalityId, audienceId, productId, toast]);

  // ─── Send user message ────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (
    text: string,
    attachments?: Array<{ name: string; content: string }>,
  ) => {
    if (isProcessing) return;

    // Add user message
    const userMsg = makeMsg('user', text, { attachments });
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    // Add loading bubble
    const loadingMsg = makeMsg('assistant', '', { isLoading: true });
    setMessages(prev => [...prev, loadingMsg]);
    setIsProcessing(true);

    try {
      const response = await sendToAgent(
        newMessages,
        objective,
        cta,
        attachments || [],
      );

      // Remove loading bubble
      setMessages(prev => prev.filter(m => m.id !== loadingMsg.id));

      // Add assistant response
      const assistantMsg = makeMsg('assistant', response.message, {
        buttons: response.suggested_buttons || undefined,
      });
      setMessages(prev => [...prev, assistantMsg]);

      // If action returned, execute pipeline
      if (response.action?.type === 'execute') {
        const params = response.action.params;
        // Update state
        if (params.objective) setObjective(params.objective);
        if (params.cta) setCta(params.cta);

        await executePipeline(params);
      }

    } catch (err) {
      // Remove loading bubble
      setMessages(prev => prev.filter(m => m.id !== loadingMsg.id));
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(prev => [...prev, makeMsg('assistant',
        `Error de conexión: ${msg}. Intenta de nuevo.`,
      )]);
    } finally {
      setIsProcessing(false);
    }
  }, [messages, isProcessing, objective, cta, sendToAgent, executePipeline]);

  // ─── Quick button handler ─────────────────────────────────────────────────────

  const selectButton = useCallback((value: string) => {
    // If it's an objective button
    const objectives: AdObjective[] = ['captacion', 'agitacion', 'remarketing', 'compra', 'reconocimiento'];
    if (objectives.includes(value as AdObjective)) {
      setObjective(value as AdObjective);
    }
    // Send as a regular message
    sendMessage(value);
  }, [sendMessage]);

  // ─── Reset ────────────────────────────────────────────────────────────────────

  const resetChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setIsProcessing(false);
    setPipelinePhase(null);
    setObjective(null);
    setCta(null);
  }, []);

  return {
    messages,
    isProcessing,
    pipelinePhase,
    objective,
    cta,
    personalityId,
    audienceId,
    productId,
    setPersonalityId,
    setAudienceId,
    setProductId,
    setBuildDnaString,
    sendMessage,
    selectButton,
    resetChat,
  };
}
