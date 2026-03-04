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

interface DnaContext {
  expert: string;
  audience: string;
  product: string;
}

export function useAdsAgentChat() {
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<string | null>(null);
  const [generatedScripts, setGeneratedScripts] = useState<ModeledScript[]>([]);

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
    objective: AdObjective | null,
    ctaText: string | null,
    references: string[],
  ): Promise<AgentChatResponse> => {
    const dnaContext: DnaContext = {
      expert: buildDnaStringRef.current(personalityId),
      audience: buildDnaStringRef.current(audienceId),
      product: buildDnaStringRef.current(productId),
    };

    let trainingContext = '';
    try {
      const trainingRes = await callEdge('get-training-context', {
        dna_expert_id: personalityId || undefined,
      }, 15000);
      trainingContext = trainingRes.training_context || '';
    } catch (err) {
      console.warn('Could not get training context:', err);
    }

    const chatMessages = allMessages
      .filter(m => m.role !== 'system' && !m.isLoading)
      .map(m => ({ role: m.role, content: m.content }));

    const res = await callEdge('agent-chat', {
      messages: chatMessages,
      dna_context: dnaContext,
      objective,
      cta: ctaText,
      references,
      training_context: trainingContext,
    }, 45000);

    return res as AgentChatResponse;
  }, [personalityId, audienceId, productId]);

  // ─── Execute pipeline (search → model) ────────────────────────────────────────

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
      addSystemMsg('Buscando anuncios ganadores...');

      const searchResult = await callEdge('search-winning-ads', {
        search_mode: params.search_mode,
        search_query: params.search_query,
        countries: params.countries,
        max_ads: params.max_ads,
      }, 180000);

      const ads = searchResult.ads || [];
      if (ads.length === 0) {
        setMessages(prev => [...prev, makeMsg('assistant',
          `No encontre anuncios para "${params.search_query}". Prueba con otra palabra clave o amplia los paises.`
        )]);
        setPipelinePhase(null);
        return;
      }

      addSystemMsg(`${ads.length} anuncios encontrados. Modelando guiones con IA...`);

      // Phase 2: Model ads
      setPipelinePhase('modeling');

      let trainingCtx = '';
      try {
        const tc = await callEdge('get-training-context', {
          dna_expert_id: personalityId || undefined,
        }, 15000);
        trainingCtx = tc.training_context || '';
      } catch {
        // continue without
      }

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
          ? `${trainingCtx}\n\nINSTRUCCIONES ADICIONALES:\n${params.modeling_instructions}`
          : params.modeling_instructions,
      }, 300000);

      const scripts: ModeledScript[] = modelResult.scripts || [];
      setGeneratedScripts(scripts);

      if (scripts.length === 0) {
        setMessages(prev => [...prev, makeMsg('assistant',
          'El pipeline no genero guiones. Los anuncios encontrados no tenian suficiente texto para modelar.'
        )]);
      } else {
        addSystemMsg(`${scripts.length} guiones generados.`);
        setMessages(prev => [...prev, makeMsg('assistant',
          `Listo! Genere **${scripts.length} guiones** basados en anuncios ganadores de "${params.search_query}". Revisalos y edita lo que necesites — cada correccion entrena mi estilo.`,
          { scripts },
        )]);
      }

      setPipelinePhase(null);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPipelinePhase(null);
      setMessages(prev => [...prev, makeMsg('assistant',
        `Error en el pipeline: ${msg}`
      )]);
      toast({ variant: 'destructive', description: msg });
    }
  }, [personalityId, audienceId, productId, toast]);

  // ─── Generate: main form submit ───────────────────────────────────────────────

  const generate = useCallback(async (params: {
    objective: AdObjective;
    instructions: string;
    ctaText: string;
    references: string[];
    documents?: Array<{ name: string; content: string }>;
  }) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setGeneratedScripts([]);

    // Build a comprehensive user message from all form fields
    const parts: string[] = [];
    parts.push(`Objetivo de campaña: ${params.objective}`);
    if (params.ctaText) parts.push(`CTA: ${params.ctaText}`);
    if (params.instructions) parts.push(`Instrucciones: ${params.instructions}`);
    if (params.references.length > 0) {
      parts.push(`Referencias:\n${params.references.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
    }
    if (params.documents && params.documents.length > 0) {
      parts.push(`Documentos adjuntos:\n${params.documents.map((d) => `--- ${d.name} ---\n${d.content}`).join('\n\n')}`);
    }

    const userContent = parts.join('\n');
    const userMsg = makeMsg('user', userContent);
    const newMessages = [userMsg];
    setMessages(newMessages);

    // Add loading bubble
    const loadingMsg = makeMsg('assistant', '', { isLoading: true });
    setMessages(prev => [...prev, loadingMsg]);

    try {
      // Combine references + document contents for the AI
      const allRefs = [
        ...params.references,
        ...(params.documents || []).map(d => `[Documento: ${d.name}]\n${d.content}`),
      ];

      // Step 1: Ask AI for strategic analysis + search_query
      let pipelineParams: {
        search_query: string;
        search_mode: 'keyword' | 'brand';
        countries: string[];
        max_ads: number;
        objective: AdObjective;
        cta: string;
        modeling_instructions: string;
      } | null = null;

      try {
        const response = await sendToAgent(
          newMessages,
          params.objective,
          params.ctaText,
          allRefs,
        );

        // Remove loading
        setMessages(prev => prev.filter(m => m.id !== loadingMsg.id));

        // Show AI's strategic message
        if (response.message) {
          setMessages(prev => [...prev, makeMsg('assistant', response.message)]);
        }

        // Use AI's params if it returned execute action
        if (response.action?.type === 'execute' && response.action.params?.search_query) {
          pipelineParams = response.action.params;
        }
      } catch (aiErr) {
        console.warn('Agent-chat failed, using fallback:', aiErr);
        // Remove loading bubble
        setMessages(prev => prev.filter(m => m.id !== loadingMsg.id));
      }

      // Step 2: If AI didn't return params, build them from form data
      if (!pipelineParams) {
        // Extract search query from instructions or product DNA
        const productDna = buildDnaStringRef.current(productId);
        const fallbackQuery = params.instructions.trim().split(/\s+/).slice(0, 5).join(' ')
          || productDna.split('\n')[0]?.replace(/^[^:]*:\s*/, '').trim()
          || params.objective;

        pipelineParams = {
          search_query: fallbackQuery,
          search_mode: 'keyword',
          countries: ['CO', 'MX', 'AR'],
          max_ads: 15,
          objective: params.objective,
          cta: params.ctaText || '',
          modeling_instructions: [
            params.instructions,
            params.documents?.map(d => `[${d.name}]: ${d.content.substring(0, 2000)}`).join('\n'),
          ].filter(Boolean).join('\n\n'),
        };

        setMessages(prev => [...prev, makeMsg('assistant',
          `Voy a buscar anuncios con: **"${pipelineParams!.search_query}"**. Objetivo: ${params.objective}.`,
        )]);
      }

      // Step 3: ALWAYS execute pipeline
      await executePipeline(pipelineParams);

    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== loadingMsg.id));
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(prev => [...prev, makeMsg('assistant', `Error: ${msg}`)]);
      toast({ variant: 'destructive', description: msg });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, sendToAgent, executePipeline, productId, toast]);

  // ─── Send follow-up message in the chat ───────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (isProcessing || !text.trim()) return;
    setIsProcessing(true);

    const userMsg = makeMsg('user', text);
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    const loadingMsg = makeMsg('assistant', '', { isLoading: true });
    setMessages(prev => [...prev, loadingMsg]);

    try {
      const response = await sendToAgent(newMessages, null, null, []);

      setMessages(prev => prev.filter(m => m.id !== loadingMsg.id));
      const assistantMsg = makeMsg('assistant', response.message, {
        buttons: response.suggested_buttons || undefined,
      });
      setMessages(prev => [...prev, assistantMsg]);

      if (response.action?.type === 'execute') {
        await executePipeline(response.action.params);
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== loadingMsg.id));
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(prev => [...prev, makeMsg('assistant', `Error: ${msg}`)]);
    } finally {
      setIsProcessing(false);
    }
  }, [messages, isProcessing, sendToAgent, executePipeline]);

  // ─── Reset ────────────────────────────────────────────────────────────────────

  const resetChat = useCallback(() => {
    setMessages([]);
    setIsProcessing(false);
    setPipelinePhase(null);
    setGeneratedScripts([]);
  }, []);

  return {
    messages,
    isProcessing,
    pipelinePhase,
    generatedScripts,
    personalityId,
    audienceId,
    productId,
    setPersonalityId,
    setAudienceId,
    setProductId,
    setBuildDnaString,
    generate,
    sendMessage,
    resetChat,
  };
}
