import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDNAs } from '@/hooks/useDNAs';
import { useVideoInspirations } from '@/hooks/useVideoInspirations';
import UploadPanel from '@/components/video-inspiration/UploadPanel';
import AnalysisReview from '@/components/video-inspiration/AnalysisReview';
import ScoredAdCard from '@/components/video-inspiration/ScoredAdCard';
import ScriptCard from '@/components/agent/ScriptCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home, Video, Mic, Users, Package, ChevronDown,
  Loader2, Bot, CheckCircle2, RotateCcw, Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type {
  VideoInspiration, VideoAnalysis, ScoredAd, ModeledScript,
} from '@/types';

const CONFIG_KEY = 'hooq_video_inspiration_config';

function loadConfig(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); }
  catch { return {}; }
}

function saveConfig(cfg: Record<string, any>) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

// ─── DNA Selector ────────────────────────────────────────────────────────────

interface DnaSelectorProps {
  type: 'expert' | 'audience' | 'product';
  label: string;
  Icon: React.ElementType;
  color: string;
  dnas: Array<{ id: string; name: string; type: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
}

function DnaSelector({ type, label, Icon, color, dnas, selectedId, onSelect }: DnaSelectorProps) {
  const filtered = dnas.filter(d => d.type === type);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Icon className={cn('w-3 h-3', color)} /> {label}
      </label>
      <div className="relative">
        <select
          value={selectedId}
          onChange={e => onSelect(e.target.value)}
          className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— Seleccionar —</option>
          {filtered.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function VideoInspirationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { dnas } = useDNAs();
  const {
    inspirations, isLoading: listLoading,
    createInspiration, uploadVideo, isUploading,
    analyzeVideo, isAnalyzing,
    searchSimilarAds, isSearching,
    scoreAds, isScoring,
    modelAds, isModeling,
    updateFields, fetchTranscript, isFetchingTranscript,
    deleteInspiration,
  } = useVideoInspirations();

  // Saved config
  const saved = loadConfig();
  const [expertId, setExpertId] = useState(saved.expertId || '');
  const [audienceId, setAudienceId] = useState(saved.audienceId || '');
  const [productId, setProductId] = useState(saved.productId || '');
  // Active inspiration state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [scoredResults, setScoredResults] = useState<ScoredAd[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [modeledScripts, setModeledScripts] = useState<ModeledScript[]>([]);
  const [status, setStatus] = useState<string>('pending');
  const [errorMsg, setErrorMsg] = useState('');
  const [scoringProgress, setScoringProgress] = useState('');

  // Save config on change
  useEffect(() => {
    saveConfig({ expertId, audienceId, productId });
  }, [expertId, audienceId, productId]);

  // Load active inspiration from list
  const loadInspiration = (vi: VideoInspiration) => {
    setActiveId(vi.id);
    setStatus(vi.status);
    setAnalysis(vi.analysis || null);
    setScoredResults((vi.scored_results as ScoredAd[]) || []);
    setModeledScripts((vi.modeled_scripts as ModeledScript[]) || []);
    setErrorMsg(vi.error_message || '');
    if (vi.dna_expert_id) setExpertId(vi.dna_expert_id);
    if (vi.dna_audience_id) setAudienceId(vi.dna_audience_id);
    if (vi.dna_product_id) setProductId(vi.dna_product_id);
    // Pre-select recommended ads
    const recommended = new Set<number>();
    (vi.scored_results || []).forEach((ad: any, i: number) => {
      if (ad.recommended) recommended.add(i);
    });
    setSelectedIndices(recommended);
  };

  // Reset to new
  const resetToNew = () => {
    setActiveId(null);
    setStatus('pending');
    setAnalysis(null);
    setScoredResults([]);
    setSelectedIndices(new Set());
    setModeledScripts([]);
    setErrorMsg('');
    setScoringProgress('');
  };

  // ─── Build DNA string for pipeline ─────────────────────────────────────────

  function buildDnaString(dnaId: string): string {
    const dna = dnas?.find(d => d.id === dnaId);
    if (!dna) return '';
    const data = dna.data as Record<string, string>;
    return Object.entries(data)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleUploadFile = async (file: File) => {
    try {
      setStatus('analyzing');
      setErrorMsg('');

      // 1. Upload to storage
      const storagePath = await uploadVideo(file);

      // 2. Create DB record
      const vi = await createInspiration({
        source_type: 'upload',
        storage_path: storagePath,
        platform: 'upload',
      });
      setActiveId(vi.id);

      // 3. Update status
      await updateFields({ id: vi.id, status: 'analyzing' });

      // 4. Analyze with Gemini
      const result = await analyzeVideo({
        source_type: 'upload',
        storage_path: storagePath,
      });

      if (!result.success || !result.analysis) {
        throw new Error(result.error || 'No se pudo analizar el video');
      }

      // 5. Save analysis
      setAnalysis(result.analysis);
      setStatus('analyzed');
      await updateFields({
        id: vi.id,
        analysis: result.analysis as unknown as Record<string, unknown>,
        status: 'analyzed',
      });

      toast({ title: 'Video analizado correctamente' });
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
      if (activeId) {
        await updateFields({ id: activeId, status: 'error', error_message: err.message }).catch(() => {});
      }
    }
  };

  const handleSubmitUrl = async (url: string) => {
    try {
      setStatus('analyzing');
      setErrorMsg('');

      // Detect platform
      let platform = 'other';
      if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube';
      else if (url.includes('tiktok.com')) platform = 'tiktok';
      else if (url.includes('instagram.com')) platform = 'instagram';

      // Create DB record
      const vi = await createInspiration({
        source_type: 'url',
        source_url: url,
        platform,
      });
      setActiveId(vi.id);
      await updateFields({ id: vi.id, status: 'analyzing' });

      // Try to fetch transcript
      let transcript = '';
      try {
        const txResult = await fetchTranscript({ url, platform });
        transcript = txResult.transcript || txResult.text || '';
      } catch {
        console.warn('Could not fetch transcript, proceeding with URL only');
      }

      // Analyze
      const result = await analyzeVideo({
        source_type: 'url',
        source_url: url,
        transcript,
      });

      if (!result.success || !result.analysis) {
        throw new Error(result.error || 'No se pudo analizar el contenido');
      }

      setAnalysis(result.analysis);
      setStatus('analyzed');
      await updateFields({
        id: vi.id,
        analysis: result.analysis as unknown as Record<string, unknown>,
        status: 'analyzed',
      });

      toast({ title: 'Contenido analizado correctamente' });
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
      if (activeId) {
        await updateFields({ id: activeId, status: 'error', error_message: err.message }).catch(() => {});
      }
    }
  };

  const handleSearch = async (keywords: string[]) => {
    if (!activeId || !analysis) return;

    try {
      setStatus('searching');
      setScoringProgress('Buscando ads...');
      await updateFields({ id: activeId, status: 'searching', search_keywords_used: keywords });

      // Search
      const searchResult = await searchSimilarAds({ keywords });
      const ads = searchResult.ads || [];

      if (ads.length === 0) {
        toast({ title: 'Sin resultados', description: 'No se encontraron ads con esas keywords.', variant: 'destructive' });
        setStatus('analyzed');
        await updateFields({ id: activeId, status: 'analyzed' });
        return;
      }

      // Score in batches of 5
      setStatus('scoring');
      await updateFields({ id: activeId, search_results: ads, status: 'scoring' });

      const allScored: ScoredAd[] = [];
      const BATCH = 5;
      for (let i = 0; i < ads.length; i += BATCH) {
        const batch = ads.slice(i, i + BATCH);
        setScoringProgress(`Evaluando similitud: ${Math.min(i + BATCH, ads.length)}/${ads.length} ads...`);

        try {
          const result = await scoreAds({ video_analysis: analysis, ads: batch });
          allScored.push(...(result.scored_ads || []));
        } catch (err) {
          console.error('Scoring batch error:', err);
          // Add unscored ads as fallback
          batch.forEach((ad: any) => {
            allScored.push({
              ...ad,
              similarity_score: 0,
              reasoning: 'No se pudo evaluar',
              technique_match: [],
              recommended: false,
            });
          });
        }
      }

      // Sort by score
      allScored.sort((a, b) => b.similarity_score - a.similarity_score);

      // Pre-select recommended
      const recommended = new Set<number>();
      allScored.forEach((ad, i) => { if (ad.recommended) recommended.add(i); });

      setScoredResults(allScored);
      setSelectedIndices(recommended);
      setStatus('scored');
      setScoringProgress('');
      await updateFields({ id: activeId, scored_results: allScored, status: 'scored' });

      toast({ title: `${allScored.length} ads evaluados` });
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
      setScoringProgress('');
      if (activeId) {
        await updateFields({ id: activeId, status: 'error', error_message: err.message }).catch(() => {});
      }
    }
  };

  const handleModel = async () => {
    if (!activeId || selectedIndices.size === 0 || !expertId) return;

    try {
      setStatus('modeling');
      await updateFields({
        id: activeId,
        status: 'modeling',
        selected_ad_indices: Array.from(selectedIndices),
        dna_expert_id: expertId,
        dna_audience_id: audienceId || null,
        dna_product_id: productId || null,
      });

      // Build ads array for pipeline
      const selectedAds = Array.from(selectedIndices).map(i => scoredResults[i]).filter(Boolean);
      const pipelineAds = selectedAds.map(ad => ({
        source: ad.keyword_source || 'video-inspiration',
        link: '',
        author: ad.advertiser_name,
        text: ad.ad_text,
        headline: ad.headline,
        cta: ad.cta_text,
      }));

      const result = await modelAds({
        ads: pipelineAds,
        dna_expert: buildDnaString(expertId),
        dna_audience: audienceId ? buildDnaString(audienceId) : '',
        dna_product: productId ? buildDnaString(productId) : '',
      });

      const scripts = result.scripts || [];
      setModeledScripts(scripts);
      setStatus('completed');
      await updateFields({ id: activeId, modeled_scripts: scripts, status: 'completed' });

      toast({ title: `${scripts.length} guiones generados` });
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
      if (activeId) {
        await updateFields({ id: activeId, status: 'error', error_message: err.message }).catch(() => {});
      }
    }
  };

  const handleSaveAsReference = async () => {
    toast({ title: 'Próximamente', description: 'Ejecuta la migración 20260303_training_system.sql para habilitar referencias.' });
  };

  // ─── Derived ───────────────────────────────────────────────────────────────

  const isProcessing = isUploading || isAnalyzing || isSearching || isScoring || isModeling || isFetchingTranscript;
  const allDnas = (dnas || []) as Array<{ id: string; name: string; type: string }>;
  const canModel = selectedIndices.size > 0 && expertId;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" />
          </button>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-sm text-foreground">Video Inspiration</span>
          </div>
          <Badge variant="secondary" className="ml-2 text-xs">{status}</Badge>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ─── Left Sidebar ─────────────────────────────────────────── */}
        <aside className="w-72 shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-4 space-y-5">
            {/* DNA Selection */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">DNA para modelar</p>
              <DnaSelector type="expert" label="Experto" Icon={Mic} color="text-violet-600" dnas={allDnas} selectedId={expertId} onSelect={setExpertId} />
              <DnaSelector type="audience" label="Audiencia" Icon={Users} color="text-blue-600" dnas={allDnas} selectedId={audienceId} onSelect={setAudienceId} />
              <DnaSelector type="product" label="Producto" Icon={Package} color="text-emerald-600" dnas={allDnas} selectedId={productId} onSelect={setProductId} />
            </div>

            {/* History */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Historial</p>
              {listLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
                </div>
              ) : (
                <div className="space-y-1">
                  <button
                    onClick={resetToNew}
                    className={cn(
                      'w-full text-left px-2 py-2 rounded-md text-xs transition-all',
                      !activeId ? 'bg-amber-50 border border-amber-200' : 'hover:bg-muted/50'
                    )}
                  >
                    + Nueva inspiración
                  </button>
                  {inspirations?.slice(0, 10).map((vi) => (
                    <button
                      key={vi.id}
                      onClick={() => loadInspiration(vi)}
                      className={cn(
                        'w-full text-left px-2 py-2 rounded-md text-xs transition-all flex items-center justify-between gap-1',
                        activeId === vi.id ? 'bg-amber-50 border border-amber-200' : 'hover:bg-muted/50'
                      )}
                    >
                      <span className="truncate flex-1">
                        {vi.analysis?.summary?.substring(0, 35) || vi.source_url?.substring(0, 35) || 'Video subido'}
                      </span>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">{vi.status}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ─── Main Content Area ────────────────────────────────────── */}
        <main className="flex-1 overflow-hidden">
          {/* Pending: Upload panel */}
          {status === 'pending' && (
            <UploadPanel
              onUploadFile={handleUploadFile}
              onSubmitUrl={handleSubmitUrl}
              isLoading={isProcessing}
            />
          )}

          {/* Analyzing: Loading */}
          {status === 'analyzing' && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Bot className="w-8 h-8 text-amber-600 animate-pulse" />
              </div>
              <h2 className="font-semibold text-lg">Analizando tu video...</h2>
              <p className="text-sm text-muted-foreground max-w-sm text-center">
                Gemini está extrayendo la estructura, tono, técnicas y keywords de búsqueda. Esto puede tomar 30-60 segundos.
              </p>
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            </div>
          )}

          {/* Analyzed: Review */}
          {status === 'analyzed' && analysis && (
            <AnalysisReview
              analysis={analysis}
              onSearch={handleSearch}
              onSaveAsReference={handleSaveAsReference}
              isSearching={isSearching}
            />
          )}

          {/* Searching / Scoring: Loading */}
          {(status === 'searching' || status === 'scoring') && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Bot className="w-8 h-8 text-amber-600 animate-pulse" />
              </div>
              <h2 className="font-semibold text-lg">
                {status === 'searching' ? 'Buscando ads similares...' : 'Evaluando similitud...'}
              </h2>
              <p className="text-sm text-muted-foreground">{scoringProgress}</p>
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            </div>
          )}

          {/* Scored: Results review */}
          {status === 'scored' && scoredResults.length > 0 && (
            <div className="h-full flex flex-col">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Ads Similares ({scoredResults.length})</span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedIndices.size} seleccionados
                  </Badge>
                </div>
                <Button
                  onClick={handleModel}
                  disabled={!canModel || isModeling}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1 text-xs"
                >
                  {isModeling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Modelar Seleccionados ({selectedIndices.size})
                </Button>
              </div>

              {!expertId && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
                  Selecciona un DNA de Experto en el sidebar para poder modelar.
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {scoredResults.map((ad, i) => (
                  <ScoredAdCard
                    key={ad.ad_id}
                    ad={ad}
                    index={i}
                    selected={selectedIndices.has(i)}
                    onToggle={() => {
                      setSelectedIndices(prev => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Modeling: Loading */}
          {status === 'modeling' && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Bot className="w-8 h-8 text-amber-600 animate-pulse" />
              </div>
              <h2 className="font-semibold text-lg">Modelando {selectedIndices.size} ads...</h2>
              <p className="text-sm text-muted-foreground max-w-sm text-center">
                El pipeline analiza la estructura, modela sección por sección y audita la calidad. Esto puede tomar 3-5 minutos.
              </p>
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            </div>
          )}

          {/* Completed: Scripts */}
          {status === 'completed' && modeledScripts.length > 0 && (
            <div className="h-full flex flex-col">
              <div className="px-4 py-3 border-b border-border bg-emerald-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-sm text-emerald-800">
                    {modeledScripts.length} guiones generados
                  </span>
                </div>
                <Button onClick={resetToNew} variant="outline" size="sm" className="gap-1 text-xs">
                  <RotateCcw className="w-3 h-3" /> Nueva inspiración
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {modeledScripts.map((script) => (
                  <ScriptCard
                    key={script.content_number}
                    script={script}
                    dnaExpertId={expertId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <Video className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="font-semibold text-lg text-destructive">Error</h2>
              <p className="text-sm text-muted-foreground text-center max-w-sm">{errorMsg}</p>
              <Button onClick={resetToNew} variant="outline" size="sm" className="gap-1">
                <RotateCcw className="w-3 h-3" /> Intentar de nuevo
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
