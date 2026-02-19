import { useState } from 'react';
import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Trash2, Link, FileText, Loader2, Wand2,
  AlertCircle, CheckCircle2, Youtube, Film, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UrlInputType, UrlEntry } from '@/types';
import { useToast } from '@/hooks/use-toast';

const URL_TYPE_OPTIONS: { value: UrlInputType; label: string; isVideo: boolean }[] = [
  { value: 'youtube',      label: 'YouTube',        isVideo: true  },
  { value: 'tiktok',       label: 'TikTok',         isVideo: true  },
  { value: 'reel',         label: 'Instagram Reel', isVideo: true  },
  { value: 'landing-page', label: 'Landing Page',   isVideo: false },
  { value: 'document',     label: 'Documento/PDF',  isVideo: false },
  { value: 'other',        label: 'Otro',           isVideo: false },
];

const VIDEO_TYPES: UrlInputType[] = ['youtube', 'tiktok', 'reel'];

// Entries being auto-fetched (local state, not in store)
type FetchingState = 'idle' | 'loading' | 'success' | 'error';

function getTypeIcon(type: UrlInputType) {
  if (type === 'youtube') return <Youtube className="w-3.5 h-3.5" />;
  if (type === 'tiktok' || type === 'reel') return <Film className="w-3.5 h-3.5" />;
  return <Link className="w-3.5 h-3.5" />;
}

export default function UrlInputStep() {
  const {
    urlEntries, rawTextContent, isAnalyzing, analysisError,
    addUrlEntry, removeUrlEntry, updateUrlEntry,
    setRawTextContent, analyzeUrls, fetchTranscriptForEntry,
    project, markStepCompleted, setCurrentStep,
  } = useWizardStore();
  const { toast } = useToast();

  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<UrlInputType>('youtube');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Per-entry fetch state
  const [fetchingState, setFetchingState] = useState<Record<string, FetchingState>>({});
  const [fetchInstructions, setFetchInstructions] = useState<Record<string, string>>({});

  const handleAddUrl = async () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;

    const entry: UrlEntry = {
      id: crypto.randomUUID(),
      url: trimmed,
      type: newType,
    };
    addUrlEntry(entry);
    setNewUrl('');

    // Auto-fetch transcript for video types
    if (VIDEO_TYPES.includes(newType)) {
      setFetchingState(prev => ({ ...prev, [entry.id]: 'loading' }));

      const result = await fetchTranscriptForEntry(entry.id);

      if (result.success) {
        setFetchingState(prev => ({ ...prev, [entry.id]: 'success' }));
        toast({
          title: 'Transcript obtenido automáticamente',
          description: 'El texto del video fue extraído con éxito.',
        });
      } else {
        setFetchingState(prev => ({ ...prev, [entry.id]: 'error' }));
        if (result.instructions) {
          setFetchInstructions(prev => ({ ...prev, [entry.id]: result.instructions! }));
        }
        // Auto-expand to show manual input
        setExpandedId(entry.id);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddUrl();
  };

  const handleRetryFetch = async (id: string) => {
    setFetchingState(prev => ({ ...prev, [id]: 'loading' }));
    const result = await fetchTranscriptForEntry(id);
    if (result.success) {
      setFetchingState(prev => ({ ...prev, [id]: 'success' }));
      setExpandedId(null);
      toast({ title: 'Transcript actualizado', description: 'El texto del video fue extraído.' });
    } else {
      setFetchingState(prev => ({ ...prev, [id]: 'error' }));
      if (result.instructions) setFetchInstructions(prev => ({ ...prev, [id]: result.instructions! }));
    }
  };

  const missingTranscripts = urlEntries.filter(
    e => VIDEO_TYPES.includes(e.type) && !e.transcript?.trim() && fetchingState[e.id] !== 'loading'
  );

  const handleAnalyze = async () => {
    if (missingTranscripts.length > 0) {
      toast({
        title: 'Faltan transcripts',
        description: `${missingTranscripts.length} video(s) aún no tienen transcript. Pégalo manualmente.`,
        variant: 'destructive',
      });
      setExpandedId(missingTranscripts[0].id);
      return;
    }

    const result = await analyzeUrls();
    if (result.success) {
      toast({ title: '¡Análisis completado!', description: 'La IA extrajo los 13 puntos clave.' });
      markStepCompleted('url-input');
      setCurrentStep('extracted-brief');
    } else {
      toast({ title: 'Error en análisis', description: result.error, variant: 'destructive' });
    }
  };

  const hasContent = urlEntries.length > 0 || rawTextContent.trim().length > 0;
  const alreadyAnalyzed = !!project.autoAnalysis;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 rounded-full text-violet-600 text-sm font-medium mb-4">
          <Wand2 className="w-4 h-4" />
          Modo Automático
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Agrega tus fuentes de contenido
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          La IA extrae el transcript automáticamente de YouTube. Para TikTok y Reels puedes pegarlo manualmente.
        </p>
      </div>

      <div className="space-y-6">
        {/* URL Input Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">URLs de contenido</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              YouTube: extracción automática
            </div>
          </div>

          {/* Add URL Row */}
          <div className="flex gap-2 mb-4">
            <Select value={newType} onValueChange={(v) => setNewType(v as UrlInputType)}>
              <SelectTrigger className="w-[170px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {URL_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="https://..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleAddUrl} variant="outline" size="icon" className="shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* URL List */}
          {urlEntries.length > 0 ? (
            <div className="space-y-3">
              {urlEntries.map((entry) => {
                const isVideo = VIDEO_TYPES.includes(entry.type);
                const hasTranscript = !!entry.transcript?.trim();
                const fetchState = fetchingState[entry.id] ?? 'idle';
                const isLoading = fetchState === 'loading';
                const autoSuccess = fetchState === 'success';
                const autoError = fetchState === 'error' && !hasTranscript;
                const isExpanded = expandedId === entry.id;
                const typeMeta = URL_TYPE_OPTIONS.find(o => o.value === entry.type);
                const instructions = fetchInstructions[entry.id];

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      isLoading                       && "border-violet-200 bg-violet-50/40",
                      autoSuccess || (isVideo && hasTranscript && !autoError) ? "border-emerald-200 bg-emerald-50/30" : '',
                      autoError                       && "border-amber-300 bg-amber-50/50",
                      !isVideo                        && "border-border bg-muted/30",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="shrink-0 gap-1">
                        {getTypeIcon(entry.type)}
                        {typeMeta?.label}
                      </Badge>
                      <span className="text-sm text-foreground/70 truncate flex-1">{entry.url}</span>

                      {/* Status indicators */}
                      {isLoading && (
                        <span className="flex items-center gap-1 text-xs text-violet-600 shrink-0">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Obteniendo...
                        </span>
                      )}

                      {!isLoading && isVideo && hasTranscript && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-emerald-600 shrink-0"
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          {autoSuccess ? 'Auto ✓' : 'Transcript ✓'}
                        </Button>
                      )}

                      {!isLoading && isVideo && !hasTranscript && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-amber-600 shrink-0"
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        >
                          <AlertCircle className="w-3.5 h-3.5 mr-1" />
                          {entry.type === 'youtube' ? 'Pegar transcript' : 'Agregar transcript'}
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeUrlEntry(entry.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>

                    {/* Expanded transcript panel */}
                    {isVideo && isExpanded && !isLoading && (
                      <div className="mt-3 space-y-2">
                        {/* Platform-specific instructions when auto-fetch failed */}
                        {autoError && instructions && (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 whitespace-pre-line">
                            {instructions}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground flex items-center justify-between">
                            <span>
                              Transcript del video
                              {!hasTranscript && <span className="text-amber-500 ml-1">*requerido</span>}
                            </span>
                            {entry.type === 'youtube' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => handleRetryFetch(entry.id)}
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                Reintentar auto-fetch
                              </Button>
                            )}
                          </Label>
                          <Textarea
                            placeholder={
                              entry.type === 'youtube'
                                ? 'YouTube: Video → "..." → "Mostrar transcripción" → copia el texto'
                                : entry.type === 'tiktok'
                                  ? 'Pega el guión o texto del TikTok...'
                                  : 'Pega el guión o texto del Reel...'
                            }
                            value={entry.transcript || ''}
                            onChange={(e) => updateUrlEntry(entry.id, { transcript: e.target.value })}
                            rows={6}
                            className="resize-none text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed border-muted rounded-lg">
              Agrega al menos una URL arriba
            </div>
          )}

          {missingTranscripts.length > 0 && (
            <p className="mt-3 text-xs text-amber-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {missingTranscripts.length} video(s) sin transcript. Haz clic en el botón del video para agregarlo.
            </p>
          )}
        </Card>

        {/* Raw Text Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">
              Texto adicional <span className="text-muted-foreground font-normal text-sm">(opcional)</span>
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Pega emails, posts, descripciones de oferta, scripts o cualquier texto relevante.
          </p>
          <Textarea
            placeholder="Descripción del programa, emails de venta, posts de redes, testimonios, guiones existentes..."
            value={rawTextContent}
            onChange={(e) => setRawTextContent(e.target.value)}
            rows={7}
            className="resize-none"
          />
        </Card>

        {/* Analysis error */}
        {analysisError && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {analysisError}
          </div>
        )}

        {/* Already analyzed indicator */}
        {alreadyAnalyzed && !isAnalyzing && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg text-emerald-700 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Contenido ya analizado. Puedes continuar o re-analizar con nuevas fuentes.
          </div>
        )}

        {/* Analyze Button */}
        <Button
          onClick={handleAnalyze}
          disabled={!hasContent || isAnalyzing}
          className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white h-12 text-base"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analizando con IA... (30-60 segundos)
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-5 w-5" />
              {alreadyAnalyzed ? 'Re-analizar contenido' : 'Analizar con IA'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
