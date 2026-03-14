import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReferentes } from '@/hooks/useReferentes';
import { useReferenteContent } from '@/hooks/useReferenteContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Home, Plus, Pencil, Trash2, Loader2, Users2, Instagram, Radio, Download, ChevronDown, ChevronUp, Eye, Heart, MessageCircle, ExternalLink, Sparkles, Library, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Referente, ReferenteIgStatus, ReferenteTikTokStatus, ReferenteContent, ReferenteContentPlatform } from '@/types';

// ─── Status Badge ────────────────────────────────────────────
function StatusBadge({ status }: { status: ReferenteIgStatus | ReferenteTikTokStatus }) {
  const map = {
    found:     { label: 'Encontrado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    not_found: { label: 'No encontrado', color: 'bg-red-100 text-red-700 border-red-200' },
    pending:   { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    manual:    { label: 'Manual', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  };
  const { label, color } = map[status] ?? map.pending;
  return <Badge variant="outline" className={cn('text-xs', color)}>{label}</Badge>;
}

// ─── Quality Badge ────────────────────────────────────────────
function QualityBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  if (score >= 8) return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">{score}/10</Badge>;
  if (score >= 5) return <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">{score}/10</Badge>;
  return <Badge className="text-xs bg-red-100 text-red-700 border-red-200">{score}/10</Badge>;
}

// ─── Platform Icon ────────────────────────────────────────────
function PlatformIcon({ platform }: { platform: ReferenteContentPlatform }) {
  if (platform === 'instagram') return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
  if (platform === 'tiktok') return <Radio className="w-3.5 h-3.5 text-slate-600" />;
  return <span className="text-xs font-bold text-blue-600">f</span>;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ─── Content Card ─────────────────────────────────────────────
function ContentCard({ item }: { item: ReferenteContent }) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-background hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PlatformIcon platform={item.platform} />
          <Badge variant="outline" className="text-xs capitalize">{item.content_type}</Badge>
          <QualityBadge score={item.quality_score} />
          {item.is_used && <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200">Usado</Badge>}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          {item.views > 0 && <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{fmt(item.views)}</span>}
          {item.likes > 0 && <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{fmt(item.likes)}</span>}
          {item.comments > 0 && <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{fmt(item.comments)}</span>}
          {item.post_url && (
            <a href={item.post_url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {item.original_caption && (
        <p className="text-xs text-muted-foreground line-clamp-2">{item.original_caption}</p>
      )}

      {item.strategic_analysis && (
        <div>
          <button
            onClick={() => setShowAnalysis(s => !s)}
            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
          >
            <Sparkles className="w-3 h-3" />
            {showAnalysis ? 'Ocultar análisis' : 'Ver análisis estratégico'}
            {showAnalysis ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showAnalysis && (
            <p className="text-xs text-muted-foreground mt-1 pl-4 border-l-2 border-violet-200">{item.strategic_analysis}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Content Panel ────────────────────────────────────────────
const PLATFORMS: { key: ReferenteContentPlatform | 'all'; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'facebook_ads', label: 'Facebook Ads' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
];

function ContentPanel({ referenteId }: { referenteId: string }) {
  const [platform, setPlatform] = useState<ReferenteContentPlatform | 'all'>('all');
  const { content, isLoading } = useReferenteContent({
    referenteId,
    platform: platform === 'all' ? undefined : platform,
  });

  const counts = {
    all: content.length,
    facebook_ads: content.filter(c => c.platform === 'facebook_ads').length,
    instagram: content.filter(c => c.platform === 'instagram').length,
    tiktok: content.filter(c => c.platform === 'tiktok').length,
  };

  // When filtered, use all loaded content (filter client-side for tab counts)
  const filtered = platform === 'all' ? content : content.filter(c => c.platform === platform);

  return (
    <div className="p-4 bg-muted/20 border-t space-y-3">
      {/* Platform tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {PLATFORMS.map(p => (
          <button
            key={p.key}
            onClick={() => setPlatform(p.key)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              platform === p.key
                ? 'bg-violet-600 text-white'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground',
            )}
          >
            {p.label}
            {counts[p.key] > 0 && (
              <span className={cn('ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]',
                platform === p.key ? 'bg-white/20' : 'bg-background'
              )}>{counts[p.key]}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Download className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin contenido scrapeado todavía.</p>
          <p className="text-xs mt-1">Usa el botón ↓ para iniciar el scraping.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(item => <ContentCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

// ─── Banco de Contenido Tab ────────────────────────────────────
function BancoContentRow({ item, PlatformBadgeCB }: { item: ReferenteContent; PlatformBadgeCB: React.FC<{platform: string}> }) {
  const [expanded, setExpanded] = useState(false);
  const score = item.quality_score;
  const scoreColor = score && score >= 8 ? 'text-emerald-600' : score && score >= 6 ? 'text-amber-600' : 'text-red-500';
  return (
    <>
      <tr className="hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3">
          <p className="text-sm font-medium">{item.referente_name ?? '—'}</p>
          <p className="text-xs text-muted-foreground capitalize">{item.source_type}</p>
        </td>
        <td className="px-4 py-3"><PlatformBadgeCB platform={item.platform} /></td>
        <td className="px-4 py-3"><span className="text-xs capitalize">{item.content_type}</span></td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {item.views > 0 && <div>{(item.views / 1000).toFixed(0)}K vistas</div>}
          {item.likes > 0 && <div>{(item.likes / 1000).toFixed(1)}K likes</div>}
          {(item as any).days_active && <div>{(item as any).days_active}d activo</div>}
        </td>
        <td className="px-4 py-3">
          {score ? <span className={cn('text-sm font-bold', scoreColor)}>{score}/10</span> : <span className="text-xs text-muted-foreground">—</span>}
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
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><ExternalLink className="w-3.5 h-3.5" /></Button>
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
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function BancoTab() {
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

  const PlatformBadgeCB = ({ platform }: { platform: string }) => {
    const map: Record<string, string> = {
      facebook_ads: 'bg-blue-100 text-blue-700 border-blue-200',
      instagram: 'bg-pink-100 text-pink-700 border-pink-200',
      tiktok: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    const labels: Record<string, string> = { facebook_ads: 'FB Ads', instagram: 'Instagram', tiktok: 'TikTok' };
    return <Badge variant="outline" className={cn('text-xs', map[platform] ?? '')}>{labels[platform] ?? platform}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{content.length} piezas scrapeadas</p>
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select className="text-sm border rounded-md px-3 py-1.5 bg-background" value={filterReferente} onChange={e => setFilterReferente(e.target.value)}>
          <option value="">Todos los referentes</option>
          {referentes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className="text-sm border rounded-md px-3 py-1.5 bg-background" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
          <option value="">Todas las plataformas</option>
          <option value="facebook_ads">FB Ads</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
        <select className="text-sm border rounded-md px-3 py-1.5 bg-background" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="video">Video</option>
          <option value="image">Imagen</option>
          <option value="carousel">Carousel</option>
        </select>
        <select className="text-sm border rounded-md px-3 py-1.5 bg-background" value={filterMinQuality ?? ''} onChange={e => setFilterMinQuality(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Cualquier calidad</option>
          <option value="7">Score ≥ 7</option>
          <option value="8">Score ≥ 8</option>
          <option value="9">Score ≥ 9</option>
        </select>
        <select className="text-sm border rounded-md px-3 py-1.5 bg-background" value={filterUsed === undefined ? '' : String(filterUsed)} onChange={e => setFilterUsed(e.target.value === '' ? undefined : e.target.value === 'true')}>
          <option value="">Todos</option>
          <option value="false">Solo disponibles</option>
          <option value="true">Solo usados</option>
        </select>
        {(filterReferente || filterPlatform || filterType || filterMinQuality || filterUsed !== undefined) && (
          <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setFilterReferente(''); setFilterPlatform(''); setFilterType(''); setFilterMinQuality(undefined); setFilterUsed(undefined); }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : content.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Library className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">Banco de contenido vacío</p>
          <p className="text-sm mt-1">Scrapeá un referente para llenar este banco.</p>
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
                <BancoContentRow key={item.id} item={item} PlatformBadgeCB={PlatformBadgeCB} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Referente Form ───────────────────────────────────────────
interface ReferenteForm {
  name: string;
  description: string;
  fb_page_name: string;
  fb_page_url: string;
  ig_handle: string;
  ig_profile_url: string;
  tiktok_handle: string;
  tiktok_profile_url: string;
}

const EMPTY_FORM: ReferenteForm = {
  name: '', description: '', fb_page_name: '', fb_page_url: '',
  ig_handle: '', ig_profile_url: '', tiktok_handle: '', tiktok_profile_url: '',
};

interface ReferenteDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: Referente | null;
  onSave: (data: ReferenteForm) => Promise<void>;
  isSaving: boolean;
}

function ReferenteDialog({ open, onClose, editing, onSave, isSaving }: ReferenteDialogProps) {
  const [form, setForm] = useState<ReferenteForm>(
    editing
      ? {
          name: editing.name,
          description: editing.description ?? '',
          fb_page_name: editing.fb_page_name ?? '',
          fb_page_url: editing.fb_page_url ?? '',
          ig_handle: editing.ig_handle ?? '',
          ig_profile_url: editing.ig_profile_url ?? '',
          tiktok_handle: editing.tiktok_handle ?? '',
          tiktok_profile_url: editing.tiktok_profile_url ?? '',
        }
      : EMPTY_FORM,
  );

  const set = (key: keyof ReferenteForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    await onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar referente' : 'Nuevo referente'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">Nombre *</label>
            <input
              className="w-full mt-1 px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-violet-400"
              value={form.name}
              onChange={set('name')}
              placeholder="Marcus Lemonis, Alex Hormozi..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              className="w-full mt-1 px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              rows={2}
              value={form.description}
              onChange={set('description')}
              placeholder="Por qué este referente es relevante para modelar..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Nombre FB Page</label>
              <input className="w-full mt-1 px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-violet-400"
                value={form.fb_page_name} onChange={set('fb_page_name')} placeholder="The Profit Show" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">URL FB Page</label>
              <input className="w-full mt-1 px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-violet-400"
                value={form.fb_page_url} onChange={set('fb_page_url')} placeholder="facebook.com/..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">IG Handle</label>
              <input className="w-full mt-1 px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-violet-400"
                value={form.ig_handle} onChange={set('ig_handle')} placeholder="@marcuslemonis" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">TikTok Handle</label>
              <input className="w-full mt-1 px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-violet-400"
                value={form.tiktok_handle} onChange={set('tiktok_handle')} placeholder="@alexhormozi" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || isSaving}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {editing ? 'Guardar cambios' : 'Crear referente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function ReferentesPage() {
  const navigate = useNavigate();
  const { referentes, isLoading, createReferente, isCreating, updateReferente, isUpdating, deleteReferente, scrapeReferente, isScraping, scrapingId } = useReferentes();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Referente | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'referentes' | 'banco'>('referentes');

  const { content: allContent } = useReferenteContent({});

  const handleCreate = async (form: ReferenteForm) => {
    await createReferente({
      name: form.name,
      description: form.description || null,
      fb_page_name: form.fb_page_name || null,
      fb_page_url: form.fb_page_url || null,
      ig_handle: form.ig_handle || null,
      ig_profile_url: form.ig_profile_url || null,
      tiktok_handle: form.tiktok_handle || null,
      tiktok_profile_url: form.tiktok_profile_url || null,
    } as any);
  };

  const handleUpdate = async (form: ReferenteForm) => {
    if (!editing) return;
    await updateReferente({
      id: editing.id,
      updates: {
        name: form.name,
        description: form.description || null,
        fb_page_name: form.fb_page_name || null,
        fb_page_url: form.fb_page_url || null,
        ig_handle: form.ig_handle || null,
        ig_profile_url: form.ig_profile_url || null,
        tiktok_handle: form.tiktok_handle || null,
        tiktok_profile_url: form.tiktok_profile_url || null,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-1" /> Inicio
          </Button>
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Users2 className="w-5 h-5 text-violet-600" /> Referentes
          </h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Creadores de contenido que modelamos para generar guiones</p>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setShowCreate(true)} className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
              <Plus className="w-4 h-4" /> Nuevo referente
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 w-full">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-border pb-0">
          <button
            onClick={() => setActiveTab('referentes')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'referentes'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Referentes
          </button>
          <button
            onClick={() => setActiveTab('banco')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'banco'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Banco de contenido
          </button>
        </div>

        {activeTab === 'banco' ? (
          <BancoTab />
        ) : (
          <>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : referentes.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Users2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-semibold text-foreground">Sin referentes todavía</p>
                <p className="text-sm mt-1 mb-6">Agrega referentes para luego asignarlos a tus DNAs y generar guiones modelados.</p>
                <Button onClick={() => setShowCreate(true)} className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
                  <Plus className="w-4 h-4" /> Crear primer referente
                </Button>
              </div>
            ) : (
              <>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-left">
                        <th className="px-4 py-3 font-medium">Nombre</th>
                        <th className="px-4 py-3 font-medium">Instagram</th>
                        <th className="px-4 py-3 font-medium">TikTok</th>
                        <th className="px-4 py-3 font-medium">Facebook</th>
                        <th className="px-4 py-3 font-medium w-32">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {referentes.map((ref) => (
                        <>
                        <tr
                          key={ref.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setExpandedId(expandedId === ref.id ? null : ref.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {expandedId === ref.id
                                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                              <div>
                                <p className="font-medium">{ref.name}</p>
                                {ref.description && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{ref.description}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {ref.ig_handle ? (
                                <span className="flex items-center gap-1 text-xs font-mono">
                                  <Instagram className="w-3 h-3 text-pink-500" /> {ref.ig_handle}
                                </span>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                              <StatusBadge status={ref.ig_status} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {ref.tiktok_handle ? (
                                <span className="flex items-center gap-1 text-xs font-mono">
                                  <Radio className="w-3 h-3 text-slate-600" /> {ref.tiktok_handle}
                                </span>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                              <StatusBadge status={ref.tiktok_status} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {ref.fb_page_name ? (
                              <span className="text-xs">{ref.fb_page_name}</span>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost" size="sm" className="h-7 w-7 p-0 text-violet-600 hover:text-violet-700"
                                onClick={() => scrapeReferente(ref.id)}
                                disabled={isScraping && scrapingId === ref.id}
                                title="Scrapear contenido (FB Ads + IG + TikTok)"
                              >
                                {isScraping && scrapingId === ref.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Download className="w-3.5 h-3.5" />}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing(ref)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(ref.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {expandedId === ref.id && (
                          <tr key={`${ref.id}-panel`}>
                            <td colSpan={5} className="p-0">
                              <ContentPanel referenteId={ref.id} />
                            </td>
                          </tr>
                        )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Siguiente paso */}
                {referentes.length > 0 && (
                  <div className="mt-6 p-4 rounded-xl border border-violet-200 bg-violet-50/50">
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">Siguiente paso</p>
                    <p className="text-sm text-foreground">
                      {allContent.length > 0
                        ? `Tienes ${allContent.length} contenidos listos. Ve al Agente de Ads para modelarlos.`
                        : 'Scrapeá un referente para obtener contenido viral.'}
                    </p>
                    {allContent.length > 0 && (
                      <button onClick={() => navigate('/ads-agent')} className="mt-2 text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1">
                        Ir al Agente de Ads <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Create dialog */}
      {showCreate && (
        <ReferenteDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
          isSaving={isCreating}
        />
      )}

      {/* Edit dialog */}
      {editing && (
        <ReferenteDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          editing={editing}
          onSave={handleUpdate}
          isSaving={isUpdating}
        />
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar referente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el referente y todas sus reglas de modelado. El contenido scrapeado permanecerá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) deleteReferente(deleteId); setDeleteId(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
