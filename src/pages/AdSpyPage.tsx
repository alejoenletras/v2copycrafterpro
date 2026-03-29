import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Search, Clock, CheckCircle2, AlertCircle,
  Globe, Copy, ChevronDown, ChevronUp, Video, Image, FileText,
  Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdSpy } from '@/hooks/useAdSpy';
import { cn } from '@/lib/utils';
import type { AdSpyResult, AdSpyRun, AdSpyAdType } from '@/types';

const COUNTRIES = [
  { code: 'US', label: 'Estados Unidos' },
  { code: 'ALL', label: 'Todos' },
  { code: 'MX', label: 'Mexico' },
  { code: 'CO', label: 'Colombia' },
  { code: 'ES', label: 'Espana' },
  { code: 'AR', label: 'Argentina' },
  { code: 'BR', label: 'Brasil' },
  { code: 'UK', label: 'Reino Unido' },
  { code: 'CA', label: 'Canada' },
  { code: 'DE', label: 'Alemania' },
];

const TYPE_ICON: Record<AdSpyAdType, typeof Video> = {
  video: Video,
  image: Image,
  text: FileText,
};

const TYPE_COLOR: Record<AdSpyAdType, string> = {
  video: 'bg-purple-100 text-purple-700',
  image: 'bg-blue-100 text-blue-700',
  text: 'bg-amber-100 text-amber-700',
};

// ─── Result Card ───────────────────────────────────────────────────────
function SpyResultCard({ result }: { result: AdSpyResult }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const Icon = TYPE_ICON[result.ad_type] || FileText;

  const copyText = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado` });
  };

  return (
    <div className="border rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full', TYPE_COLOR[result.ad_type])}>
              <Icon className="w-3 h-3" />
              {result.ad_type}
            </span>
            <span className="text-xs text-muted-foreground truncate">{result.ad_archive_id}</span>
          </div>
          <p className="text-sm font-semibold truncate">{result.page_name}</p>
          {result.page_url && (
            <a
              href={result.page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-600 hover:underline truncate block"
            >
              {result.page_url}
            </a>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Summary (always visible) */}
      {result.summary && (
        <div className="px-4 pb-3">
          <p className={cn('text-sm text-muted-foreground', !expanded && 'line-clamp-3')}>
            {result.summary}
          </p>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-muted/30">
          {/* Rewritten ad copy */}
          {result.rewritten_ad_copy && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ad Copy Reescrito</p>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => copyText('Ad copy', result.rewritten_ad_copy!)}>
                  <Copy className="w-3 h-3" /> Copiar
                </Button>
              </div>
              <div className="bg-white rounded-lg border p-3 text-sm whitespace-pre-wrap">
                {result.rewritten_ad_copy}
              </div>
            </div>
          )}

          {/* Image prompt */}
          {result.image_prompt && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descripcion de Imagen</p>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => copyText('Image prompt', result.image_prompt!)}>
                  <Copy className="w-3 h-3" /> Copiar
                </Button>
              </div>
              <div className="bg-white rounded-lg border p-3 text-sm whitespace-pre-wrap">
                {result.image_prompt}
              </div>
            </div>
          )}

          {/* Video prompt */}
          {result.video_prompt && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descripcion de Video</p>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => copyText('Video prompt', result.video_prompt!)}>
                  <Copy className="w-3 h-3" /> Copiar
                </Button>
              </div>
              <div className="bg-white rounded-lg border p-3 text-sm whitespace-pre-wrap">
                {result.video_prompt}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Run History Item ──────────────────────────────────────────────────
function RunItem({ run, isActive, onSelect }: { run: AdSpyRun; isActive: boolean; onSelect: () => void }) {
  const statusIcon = run.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
    : run.status === 'error' ? <AlertCircle className="w-3.5 h-3.5 text-red-500" />
    : <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left px-3 py-2 rounded-lg border transition-colors text-sm',
        isActive ? 'bg-violet-50 border-violet-200' : 'hover:bg-muted/50 border-transparent',
      )}
    >
      <div className="flex items-center gap-2">
        {statusIcon}
        <span className="font-medium truncate flex-1">{run.search_query}</span>
        <Badge variant="secondary" className="text-[10px] shrink-0">{run.total_results || 0}</Badge>
      </div>
      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
        <Globe className="w-3 h-3" /> {run.country_code}
        <Clock className="w-3 h-3 ml-1" /> {new Date(run.created_at).toLocaleDateString()}
      </div>
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────
export default function AdSpyPage() {
  const { toast } = useToast();
  const {
    runs, activeRun, results, isTriggering, isLoadingResults,
    isPolling, triggerSpy, selectRun,
  } = useAdSpy();

  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('US');
  const [minLikes, setMinLikes] = useState('1000');
  const [maxAds, setMaxAds] = useState('200');
  const [typeFilter, setTypeFilter] = useState<'all' | AdSpyAdType>('all');

  const handleTrigger = async () => {
    if (!query.trim()) {
      toast({ variant: 'destructive', description: 'Escribe un termino de busqueda' });
      return;
    }
    await triggerSpy({
      search_query: query.trim(),
      country_code: country,
      min_page_likes: Number(minLikes) || 1000,
      max_ads: Number(maxAds) || 200,
    });
  };

  const filteredResults = typeFilter === 'all'
    ? results
    : results.filter(r => r.ad_type === typeFilter);

  const counts = {
    all: results.length,
    video: results.filter(r => r.ad_type === 'video').length,
    image: results.filter(r => r.ad_type === 'image').length,
    text: results.filter(r => r.ad_type === 'text').length,
  };

  return (
    <div className="w-full px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Ad Spy Tool</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Escanea la Facebook Ad Library, analiza anuncios de competidores y obtiene copy reescrito.
        </p>
      </div>

      {/* Search Form */}
      <div className="border rounded-xl p-4 space-y-3 bg-card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Buscar anuncios</label>
            <Input
              placeholder='Ej: "ai automation", "weight loss", "coaching"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTrigger()}
            />
          </div>
          <div className="w-40">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Pais</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="w-36">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Min. likes de pagina</label>
            <Input type="number" value={minLikes} onChange={(e) => setMinLikes(e.target.value)} />
          </div>
          <div className="w-36">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Max. anuncios</label>
            <Input type="number" value={maxAds} onChange={(e) => setMaxAds(e.target.value)} />
          </div>
          <Button
            onClick={handleTrigger}
            disabled={isTriggering || isPolling}
            className="gap-2"
          >
            {isTriggering || isPolling ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {isPolling ? 'Procesando...' : 'Iniciando...'}</>
            ) : (
              <><Search className="w-4 h-4" /> Espiar anuncios</>
            )}
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex gap-6">
        {/* Left: Run history */}
        {runs.length > 0 && (
          <div className="w-64 shrink-0 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Historial</p>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {runs.map(run => (
                <RunItem
                  key={run.id}
                  run={run}
                  isActive={activeRun?.id === run.id}
                  onSelect={() => selectRun(run)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Right: Results */}
        <div className="flex-1 min-w-0">
          {activeRun && (
            <>
              {/* Type filter tabs */}
              <div className="flex items-center gap-2 mb-4">
                {(['all', 'video', 'image', 'text'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                      typeFilter === t
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {t === 'all' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
                    <span className="ml-1 opacity-60">({counts[t]})</span>
                  </button>
                ))}
              </div>

              {/* Results list */}
              {isLoadingResults ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">
                    {results.length === 0
                      ? 'No hay resultados para este run.'
                      : 'No hay resultados de este tipo.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredResults.map(result => (
                    <SpyResultCard key={result.id} result={result} />
                  ))}
                </div>
              )}
            </>
          )}

          {!activeRun && !isPolling && (
            <div className="text-center py-20 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Lanza una busqueda o selecciona un run del historial</p>
              <p className="text-xs mt-1">Los resultados del spy apareceran aqui.</p>
            </div>
          )}

          {isPolling && !activeRun?.status?.match(/completed|error/) && (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-3" />
              <p className="text-sm font-medium">El agente esta analizando anuncios...</p>
              <p className="text-xs text-muted-foreground mt-1">Esto puede tomar varios minutos (video toma mas tiempo).</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
