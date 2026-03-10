import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Home, Loader2, ChevronDown, Search, Clock, CheckCircle2,
  AlertCircle, Globe, Bot, ExternalLink,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdSearches } from '@/hooks/useAdSearches';
import { cn } from '@/lib/utils';
import type { Ad, AdSearch, AdSearchType, AdMediaFilter } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'ALL', label: 'Todos' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'MX', label: 'Mexico' },
  { code: 'CO', label: 'Colombia' },
  { code: 'ES', label: 'Espana' },
  { code: 'AR', label: 'Argentina' },
  { code: 'BR', label: 'Brasil' },
  { code: 'UK', label: 'Reino Unido' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Alemania' },
  { code: 'FR', label: 'Francia' },
];

const MEDIA_TYPES: { value: AdMediaFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'video', label: 'Video' },
  { value: 'image', label: 'Imagen' },
];

// ─── Ads Table ───────────────────────────────────────────────────────────────

function AdsTable({ ads }: { ads: Ad[] }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Pagina</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Tipo</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs">Dias activo</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs">Collation</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs">Link</th>
          </tr>
        </thead>
        <tbody>
          {ads.map(ad => {
            const collation = (ad.raw_data as Record<string, unknown>)?.collationCount;
            const adLibUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&id=${ad.ad_archive_id}`;
            return (
              <tr key={ad.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground text-sm">{ad.page_name}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs">
                    {ad.ad_type}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn(
                    'font-semibold text-sm',
                    ad.days_active >= 30 ? 'text-emerald-600' : ad.days_active >= 7 ? 'text-amber-600' : 'text-muted-foreground'
                  )}>
                    {ad.days_active}d
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm text-muted-foreground">
                    {collation != null ? String(collation) : '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <a
                    href={adLibUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ver
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Search History Item ─────────────────────────────────────────────────────

function SearchHistoryItem({ search, isActive, onSelect }: {
  search: AdSearch; isActive: boolean; onSelect: () => void;
}) {
  const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
    pending: { icon: Clock, color: 'text-gray-400', label: 'Pendiente' },
    processing: { icon: Loader2, color: 'text-amber-500', label: 'Procesando' },
    completed: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Completado' },
    error: { icon: XCircle, color: 'text-red-500', label: 'Error' },
  };

  const cfg = statusConfig[search.status] || statusConfig.pending;
  const StatusIcon = cfg.icon;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all',
        isActive
          ? 'border-violet-300 bg-violet-50'
          : 'border-border hover:border-violet-200 hover:bg-muted/50'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <StatusIcon className={cn('w-3.5 h-3.5 shrink-0', cfg.color, search.status === 'processing' && 'animate-spin')} />
        <span className="text-xs font-medium text-foreground truncate">{search.query}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{search.search_type === 'keyword' ? 'Keyword' : 'Pagina'}</span>
        <span>-</span>
        <span>{search.country_code}</span>
        {search.filtered_results != null && (
          <>
            <span>-</span>
            <span>{search.filtered_results} ads</span>
          </>
        )}
      </div>
      <span className="text-xs text-muted-foreground/70">
        {new Date(search.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdsAgentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    searches, activeSearch, ads, isTriggering, isLoadingAds, isPolling,
    triggerSearch, selectSearch,
  } = useAdSearches();

  // Search form state
  const [searchType, setSearchType] = useState<AdSearchType>('keyword');
  const [query, setQuery] = useState('');
  const [countryCode, setCountryCode] = useState('ALL');
  const [mediaType, setMediaType] = useState<AdMediaFilter>('all');
  const [maxAds, setMaxAds] = useState(50);

  // Ad filters
  const [adTypeFilter, setAdTypeFilter] = useState<'all' | 'video' | 'image' | 'text'>('all');
  const [minDaysFilter, setMinDaysFilter] = useState<number>(0);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({ variant: 'destructive', description: 'Ingresa un keyword o URL' });
      return;
    }
    await triggerSearch({
      search_type: searchType,
      query: query.trim(),
      country_code: countryCode,
      media_type: mediaType,
      max_ads: maxAds,
    });
  };

  const filteredAds = ads.filter(ad => {
    if (adTypeFilter !== 'all' && ad.ad_type !== adTypeFilter) return false;
    if (ad.days_active < minDaysFilter) return false;
    return true;
  });

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
            <Bot className="w-4 h-4 text-violet-600" />
            <span className="font-semibold text-sm text-foreground">Agente de Anuncios</span>
          </div>
          <Badge variant="secondary" className="ml-2 text-xs">v2</Badge>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Left panel: Search Form + History ─────────────────────────────── */}
        <aside className="w-80 shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-4 space-y-5">
            {/* Search Type Toggle */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tipo de busqueda</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchType('keyword')}
                  className={cn(
                    'flex-1 text-xs py-2 px-3 rounded-lg border font-medium transition-all',
                    searchType === 'keyword'
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-border text-muted-foreground hover:border-violet-300',
                  )}
                >
                  Por Keyword
                </button>
                <button
                  onClick={() => setSearchType('page_url')}
                  className={cn(
                    'flex-1 text-xs py-2 px-3 rounded-lg border font-medium transition-all',
                    searchType === 'page_url'
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-border text-muted-foreground hover:border-violet-300',
                  )}
                >
                  Por Pagina
                </button>
              </div>
            </div>

            {/* Query Input */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                {searchType === 'keyword' ? 'Keyword' : 'URL de pagina de Facebook'}
              </label>
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={searchType === 'keyword' ? 'ej: AI Automation, marketing digital...' : 'ej: https://facebook.com/SaleADS'}
                className="text-sm"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {/* Country */}
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                <Globe className="w-3 h-3" /> Pais
              </label>
              <div className="relative">
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Media Type */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Tipo de media</p>
              <div className="flex gap-2">
                {MEDIA_TYPES.map(mt => (
                  <button
                    key={mt.value}
                    onClick={() => setMediaType(mt.value)}
                    className={cn(
                      'flex-1 text-xs py-2 px-3 rounded-lg border font-medium transition-all',
                      mediaType === mt.value
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'border-border text-muted-foreground hover:border-violet-300',
                    )}
                  >
                    {mt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Ads */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Max anuncios a buscar: <span className="text-foreground font-semibold">{maxAds}</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[5, 15, 20, 30, 50, 60, 80, 100].map(n => (
                  <button
                    key={n}
                    onClick={() => setMaxAds(n)}
                    className={cn(
                      'text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all',
                      maxAds === n
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'border-border text-muted-foreground hover:border-violet-300',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={isTriggering || isPolling || !query.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              {isTriggering ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Iniciando...</>
              ) : isPolling ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Buscando...</>
              ) : (
                <><Search className="w-4 h-4" />Buscar Anuncios</>
              )}
            </Button>

            {/* Polling status */}
            {isPolling && activeSearch && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>
                  {activeSearch.status === 'pending' ? 'En cola...' : 'Procesando anuncios...'}
                </span>
              </div>
            )}

            <div className="border-t border-border" />

            {/* Search History */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Busquedas recientes</p>
              {searches.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay busquedas previas</p>
              ) : (
                <div className="space-y-2">
                  {searches.map(s => (
                    <SearchHistoryItem
                      key={s.id}
                      search={s}
                      isActive={activeSearch?.id === s.id}
                      onSelect={() => s.status === 'completed' && selectSearch(s)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Right panel: Results ──────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-muted/20">
          {/* No search selected */}
          {!activeSearch && !isPolling && (
            <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="font-semibold text-lg text-foreground mb-2">Buscar anuncios ganadores</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Busca por keyword o por pagina de Facebook. El agente escanea la Ad Library,
                filtra anuncios activos 3+ dias, analiza el contenido visual con IA y reescribe el copy.
              </p>
              <div className="mt-6 grid grid-cols-4 gap-4 text-xs text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Search className="w-4 h-4 text-blue-600" />
                  </div>
                  <span>Escanear</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <span>Filtrar 3d+</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-violet-600" />
                  </div>
                  <span>Analizar</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span>Resultados</span>
                </div>
              </div>
            </div>
          )}

          {/* Polling state */}
          {isPolling && (
            <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-violet-100 flex items-center justify-center mb-6 animate-pulse">
                <Bot className="w-10 h-10 text-violet-600" />
              </div>
              <h2 className="font-semibold text-lg text-foreground mb-3">El agente esta trabajando...</h2>
              <div className="space-y-2 text-sm text-muted-foreground max-w-md">
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                  <span>Buscando y analizando anuncios en Facebook Ad Library</span>
                </div>
                <p className="text-xs mt-4 text-muted-foreground/70">
                  Esto puede tardar 3-8 minutos. El agente busca anuncios, filtra los activos 3+ dias,
                  analiza el contenido visual con Gemini, resume con Sonnet y reescribe con Opus.
                </p>
              </div>
            </div>
          )}

          {/* Results */}
          {activeSearch && !isPolling && (
            <div className="p-6 space-y-5">
              {/* Search header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg text-foreground flex items-center gap-2">
                    {activeSearch.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    {activeSearch.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    {activeSearch.query}
                  </h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{activeSearch.search_type === 'keyword' ? 'Keyword' : 'Pagina'}</span>
                    <span>-</span>
                    <span>{activeSearch.country_code}</span>
                    {activeSearch.total_results != null && (
                      <>
                        <span>-</span>
                        <span>{activeSearch.total_results} total, {activeSearch.filtered_results} filtrados (3d+)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Error message */}
              {activeSearch.status === 'error' && activeSearch.error_message && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{activeSearch.error_message}</span>
                </div>
              )}

              {/* Filters */}
              {ads.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex gap-1.5">
                    {(['all', 'video', 'image', 'text'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setAdTypeFilter(t)}
                        className={cn(
                          'text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all',
                          adTypeFilter === t
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'border-border text-muted-foreground hover:border-violet-300',
                        )}
                      >
                        {t === 'all' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Min dias:</span>
                    <input
                      type="number"
                      value={minDaysFilter}
                      onChange={e => setMinDaysFilter(Number(e.target.value))}
                      min={0}
                      className="w-14 border border-input rounded px-2 py-1 text-xs bg-background"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {filteredAds.length} anuncios
                  </span>
                </div>
              )}

              {/* Loading */}
              {isLoadingAds && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                </div>
              )}

              {/* Ads Table */}
              {!isLoadingAds && filteredAds.length > 0 && (
                <AdsTable ads={filteredAds} />
              )}

              {/* Still processing (polling timed out or stuck) */}
              {!isLoadingAds && ads.length === 0 && activeSearch.status === 'processing' && (
                <div className="text-center py-12 text-muted-foreground space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
                  <p className="text-sm">El agente sigue procesando en N8N...</p>
                  <p className="text-xs text-muted-foreground/60">
                    Si lleva mas de 10 minutos, revisa la ejecucion en N8N para ver si hubo errores.
                    Los anuncios apareceran aqui cuando el procesamiento termine.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs mt-2"
                    onClick={() => activeSearch && selectSearch(activeSearch)}
                  >
                    Recargar anuncios
                  </Button>
                </div>
              )}

              {/* No results (completed or error) */}
              {!isLoadingAds && ads.length === 0 && (activeSearch.status === 'completed' || activeSearch.status === 'error') && (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <p className="text-sm">No se encontraron anuncios para esta busqueda.</p>
                  {activeSearch.total_results != null && (
                    <p className="text-xs">
                      Apify devolvio {activeSearch.total_results} items, {activeSearch.filtered_results || 0} pasaron el filtro de 3+ dias activos.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/60">
                    Intenta con otro keyword o pais. Si siempre devuelve 0 items, verifica tu token de Apify en N8N.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
