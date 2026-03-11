import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReferenteContent } from '@/hooks/useReferenteContent';
import { useReferentes } from '@/hooks/useReferentes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Library, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReferenteContent } from '@/types';

// ─── Platform badge ───────────────────────────────────────────
function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, string> = {
    facebook_ads: 'bg-blue-100 text-blue-700 border-blue-200',
    instagram:    'bg-pink-100 text-pink-700 border-pink-200',
    tiktok:       'bg-slate-100 text-slate-700 border-slate-200',
  };
  const labels: Record<string, string> = {
    facebook_ads: 'FB Ads',
    instagram: 'Instagram',
    tiktok: 'TikTok',
  };
  return (
    <Badge variant="outline" className={cn('text-xs', map[platform] ?? '')}>
      {labels[platform] ?? platform}
    </Badge>
  );
}

// ─── Quality stars ────────────────────────────────────────────
function QualityScore({ score }: { score: number | null }) {
  if (!score) return <span className="text-xs text-muted-foreground">—</span>;
  const color = score >= 8 ? 'text-emerald-600' : score >= 6 ? 'text-amber-600' : 'text-red-500';
  return <span className={cn('text-sm font-bold', color)}>{score}/10</span>;
}

// ─── Content row ──────────────────────────────────────────────
function ContentRow({ item }: { item: ReferenteContent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3">
          <p className="text-sm font-medium">{item.referente_name ?? '—'}</p>
          <p className="text-xs text-muted-foreground capitalize">{item.source_type}</p>
        </td>
        <td className="px-4 py-3">
          <PlatformBadge platform={item.platform} />
        </td>
        <td className="px-4 py-3">
          <span className="text-xs capitalize">{item.content_type}</span>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {item.views > 0 && <div>{(item.views / 1000).toFixed(0)}K vistas</div>}
          {item.likes > 0 && <div>{(item.likes / 1000).toFixed(1)}K likes</div>}
          {item.days_active && <div>{item.days_active}d activo</div>}
        </td>
        <td className="px-4 py-3">
          <QualityScore score={item.quality_score} />
        </td>
        <td className="px-4 py-3">
          <Badge variant="outline" className={cn('text-xs', item.is_used ? 'text-muted-foreground' : 'text-emerald-700 border-emerald-200')}>
            {item.is_used ? 'Usado' : 'Disponible'}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {item.post_url && (
              <a href={item.post_url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {item.original_caption && (
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">Caption original</p>
                  <p className="whitespace-pre-wrap text-foreground">{item.original_caption.substring(0, 500)}{item.original_caption.length > 500 ? '...' : ''}</p>
                </div>
              )}
              {item.strategic_analysis && (
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">Análisis estratégico</p>
                  <p className="text-foreground">{item.strategic_analysis}</p>
                </div>
              )}
              {item.content_structure && (
                <div className="md:col-span-2">
                  <p className="font-semibold text-muted-foreground mb-1">Estructura detectada</p>
                  <p className="text-foreground">{item.content_structure}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function ContentBankPage() {
  const navigate = useNavigate();
  const { referentes } = useReferentes();

  const [filterReferente, setFilterReferente] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMinQuality, setFilterMinQuality] = useState<number | undefined>(undefined);
  const [filterUsed, setFilterUsed] = useState<boolean | undefined>(undefined);

  const { content, isLoading } = useReferenteContent({
    referenteId: filterReferente || undefined,
    platform: filterPlatform || undefined,
    contentType: filterType || undefined,
    minQuality: filterMinQuality,
    isUsed: filterUsed,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-1" /> Inicio
          </Button>
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Library className="w-5 h-5 text-fuchsia-600" /> Banco de Contenido
          </h1>
          <Badge variant="outline" className="text-xs">{content.length} piezas</Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 w-full space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            className="text-sm border rounded-md px-3 py-1.5 bg-background"
            value={filterReferente}
            onChange={e => setFilterReferente(e.target.value)}
          >
            <option value="">Todos los referentes</option>
            {referentes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <select
            className="text-sm border rounded-md px-3 py-1.5 bg-background"
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
          >
            <option value="">Todas las plataformas</option>
            <option value="facebook_ads">FB Ads</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
          </select>

          <select
            className="text-sm border rounded-md px-3 py-1.5 bg-background"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="video">Video</option>
            <option value="image">Imagen</option>
            <option value="carousel">Carousel</option>
            <option value="text">Texto</option>
          </select>

          <select
            className="text-sm border rounded-md px-3 py-1.5 bg-background"
            value={filterMinQuality ?? ''}
            onChange={e => setFilterMinQuality(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Cualquier calidad</option>
            <option value="7">Score ≥ 7</option>
            <option value="8">Score ≥ 8</option>
            <option value="9">Score ≥ 9</option>
          </select>

          <select
            className="text-sm border rounded-md px-3 py-1.5 bg-background"
            value={filterUsed === undefined ? '' : String(filterUsed)}
            onChange={e => setFilterUsed(e.target.value === '' ? undefined : e.target.value === 'true')}
          >
            <option value="">Todos</option>
            <option value="false">Solo disponibles</option>
            <option value="true">Solo usados</option>
          </select>

          {(filterReferente || filterPlatform || filterType || filterMinQuality || filterUsed !== undefined) && (
            <Button variant="ghost" size="sm" onClick={() => {
              setFilterReferente(''); setFilterPlatform(''); setFilterType('');
              setFilterMinQuality(undefined); setFilterUsed(undefined);
            }}>
              Limpiar filtros
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : content.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Library className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-semibold text-foreground">Banco de contenido vacío</p>
            <p className="text-sm mt-1">El scraping automático llenará este banco cuando tengas referentes configurados con reglas de modelado.</p>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">Referente</th>
                  <th className="px-4 py-3 font-medium">Plataforma</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Métricas</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {content.map(item => (
                  <ContentRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
