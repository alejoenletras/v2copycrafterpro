import { useState, useCallback, useRef } from 'react';
import { callEdge } from '@/lib/callEdge';
import { useToast } from '@/hooks/use-toast';
import type { AdObjective, ModeledScript } from '@/types';

interface DnaContext {
  expert: string;
  audience: string;
  product: string;
}

export function useAdsAgentChat() {
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<string | null>(null);
  const [generatedScripts, setGeneratedScripts] = useState<ModeledScript[]>([]);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);

  // DNA IDs
  const [personalityId, setPersonalityId] = useState('');
  const [audienceId, setAudienceId] = useState('');
  const [productId, setProductId] = useState('');

  // DNA context builder ref (set by the page)
  const buildDnaStringRef = useRef<(id: string) => string>(() => '');

  const setBuildDnaString = useCallback((fn: (id: string) => string) => {
    buildDnaStringRef.current = fn;
  }, []);

  const addStatus = (msg: string) => {
    setStatusMessages(prev => [...prev, msg]);
  };

  // ─── Generate: form submit → pipeline directly ───────────────────────────────

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
    setStatusMessages([]);

    const dnaContext: DnaContext = {
      expert: buildDnaStringRef.current(personalityId),
      audience: buildDnaStringRef.current(audienceId),
      product: buildDnaStringRef.current(productId),
    };

    // Build search query from instructions + product DNA
    const productDna = dnaContext.product;
    const searchQuery =
      params.instructions.trim().split(/\s+/).slice(0, 5).join(' ')
      || productDna.split('\n')[0]?.replace(/^[^:]*:\s*/, '').trim()
      || params.objective;

    try {
      // ── Phase 1: Search winning ads ──────────────────────────────────────────
      setPipelinePhase('searching');
      addStatus(`Buscando anuncios: "${searchQuery}"...`);

      const searchResult = await callEdge('search-winning-ads', {
        search_mode: 'keyword',
        search_query: searchQuery,
        countries: ['CO', 'MX', 'AR'],
        max_ads: 15,
      }, 180000);

      const ads = searchResult.ads || [];
      if (ads.length === 0) {
        addStatus(`No se encontraron anuncios para "${searchQuery}". Prueba con otra palabra clave.`);
        setPipelinePhase(null);
        setIsProcessing(false);
        return;
      }

      addStatus(`${ads.length} anuncios encontrados. Modelando guiones...`);

      // ── Phase 2: Get training context ────────────────────────────────────────
      let trainingCtx = '';
      try {
        const tc = await callEdge('get-training-context', {
          dna_expert_id: personalityId || undefined,
        }, 15000);
        trainingCtx = tc.training_context || '';
      } catch {
        // continue without training context
      }

      // ── Phase 3: Model ads ───────────────────────────────────────────────────
      setPipelinePhase('modeling');

      // Build modeling instructions from all user inputs
      const modelingParts: string[] = [];
      if (params.instructions) modelingParts.push(params.instructions);
      if (params.ctaText) modelingParts.push(`CTA: ${params.ctaText}`);
      if (params.references.length > 0) {
        modelingParts.push(`Referencias:\n${params.references.join('\n')}`);
      }
      if (params.documents && params.documents.length > 0) {
        modelingParts.push(
          params.documents.map(d => `[${d.name}]: ${d.content.substring(0, 2000)}`).join('\n')
        );
      }

      const modelingInstructions = modelingParts.filter(Boolean).join('\n\n');

      const pipelineAds = ads.map((ad: Record<string, unknown>) => ({
        source: String(ad.platform || 'facebook'),
        link: `https://facebook.com/ads/library/?id=${ad.ad_id || ''}`,
        author: String(ad.advertiser_name || ad.page_name || 'Unknown'),
        text: String(ad.ad_text || ''),
        headline: ad.headline ? String(ad.headline) : undefined,
        cta: ad.cta_text ? String(ad.cta_text) : undefined,
        days_running: ad.days_running ?? undefined,
      }));

      const fullTrainingCtx = trainingCtx
        ? `${trainingCtx}\n\nINSTRUCCIONES ADICIONALES:\n${modelingInstructions}`
        : modelingInstructions;

      const modelResult = await callEdge('pipeline-model-ads', {
        ads: pipelineAds,
        dna_expert: dnaContext.expert,
        dna_audience: dnaContext.audience,
        dna_product: dnaContext.product,
        training_context: fullTrainingCtx,
      }, 300000);

      const scripts: ModeledScript[] = modelResult.scripts || [];
      setGeneratedScripts(scripts);

      if (scripts.length === 0) {
        addStatus('El pipeline no generó guiones. Los anuncios encontrados no tenían suficiente texto.');
      } else {
        addStatus(`${scripts.length} guiones generados. Revísalos y edita lo que necesites — cada corrección entrena el estilo.`);
      }

      setPipelinePhase(null);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPipelinePhase(null);
      addStatus(`Error: ${msg}`);
      toast({ variant: 'destructive', description: msg });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, personalityId, audienceId, productId, toast]);

  // ─── Reset ────────────────────────────────────────────────────────────────────

  const resetChat = useCallback(() => {
    setIsProcessing(false);
    setPipelinePhase(null);
    setGeneratedScripts([]);
    setStatusMessages([]);
  }, []);

  return {
    isProcessing,
    pipelinePhase,
    generatedScripts,
    statusMessages,
    personalityId,
    audienceId,
    productId,
    setPersonalityId,
    setAudienceId,
    setProductId,
    setBuildDnaString,
    generate,
    resetChat,
  };
}
