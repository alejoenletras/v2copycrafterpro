import ScheduleConfig from '@/components/agent/ScheduleConfig';
import ReferentProfiles from '@/components/agent/ReferentProfiles';
import ScriptCard from '@/components/agent/ScriptCard';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDNAs } from '@/hooks/useDNAs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Home, Loader2, Mic, Users, Package, ChevronDown,
  Mail, Send, AlertCircle, Sparkles, Zap, Bot,
  CheckCircle2, Radio, ExternalLink, Camera, Target,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { AgentResult, ModeledScript } from '@/types';

// ─── N8N Webhook ────────────────────────────────────────────────────────────

const N8N_WEBHOOK_URL = 'https://primary-production-4e652.up.railway.app/webhook/hooq-agent';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchConfig {
  search_mode: 'keyword' | 'brand';
  search_query: string;
  max_ads: number;
  telegram_chat_id: string;
  email: string;
  schedule: 'manual' | 'daily' | 'weekly';
  objective: string;
  cta: string;
}

const OBJECTIVES = [
  { value: 'captacion', label: 'Captación' },
  { value: 'agitacion', label: 'Agitación' },
  { value: 'remarketing', label: 'Remarketing' },
  { value: 'venta', label: 'Venta' },
  { value: 'reconocimiento', label: 'Reconocimiento' },
];

const CONFIG_KEY = 'hooq_ads_agent_config';

function loadConfig(): Partial<SearchConfig> {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
  } catch { return {}; }
}

function saveConfig(cfg: Partial<SearchConfig>) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

// ─── DNA Selector (small inline) ────────────────────────────────────────────

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
  const selected = filtered.find(d => d.id === selectedId);

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
      {selected && (
        <span className="text-xs text-muted-foreground truncate pl-1">{selected.name}</span>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdsAgentPage() {
  const navigate = useNavigate();
  const { dnas } = useDNAs();
  const { toast } = useToast();

  const saved = loadConfig();

  // DNA selection
  const [personalityId, setPersonalityId] = useState('');
  const [audienceId, setAudienceId] = useState('');
  const [productId, setProductId] = useState('');

  // Search config
  const [searchMode, setSearchMode] = useState<'keyword' | 'brand'>(saved.search_mode || 'keyword');
  const [searchQuery, setSearchQuery] = useState(saved.search_query || '');
  const [maxAds, setMaxAds] = useState(saved.max_ads || 20);
  const [objective, setObjective] = useState(saved.objective || 'captacion');
  const [ctaText, setCtaText] = useState(saved.cta || '');

  // Delivery
  const [telegramChatId, setTelegramChatId] = useState(saved.telegram_chat_id || '');
  const [email, setEmail] = useState(saved.email || '');
  const [schedule] = useState<'manual' | 'daily' | 'weekly'>(saved.schedule || 'manual');

  // Referents
  const [referentNames, setReferentNames] = useState<string[]>([]);

  // State
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'working' | 'done'>('idle');
  const [resultMessage, setResultMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null);
  const [generatedScripts, setGeneratedScripts] = useState<ModeledScript[]>([]);

  // Auto-select first DNA of each type
  useEffect(() => {
    if (!dnas) return;
    if (!personalityId) {
      const first = dnas.find(d => d.type === 'expert');
      if (first) setPersonalityId(first.id);
    }
    if (!audienceId) {
      const first = dnas.find(d => d.type === 'audience');
      if (first) setAudienceId(first.id);
    }
    if (!productId) {
      const first = dnas.find(d => d.type === 'product');
      if (first) setProductId(first.id);
    }
  }, [dnas]);

  const buildDnaString = (dnaId: string): string => {
    const dna = dnas?.find(d => d.id === dnaId);
    if (!dna?.data) return '';
    const d = dna.data as Record<string, any>;

    const safeJoin = (val: any, sep = ', '): string => {
      if (Array.isArray(val)) return val.join(sep) || 'No especificado';
      if (typeof val === 'string') return val || 'No especificado';
      return 'No especificado';
    };

    const safeList = (val: any, prefix = '- '): string[] => {
      if (Array.isArray(val) && val.length > 0) return val.map((item: any) => `${prefix}${typeof item === 'string' ? item : JSON.stringify(item)}`);
      if (typeof val === 'string' && val) return [`${prefix}${val}`];
      return ['No especificado'];
    };

    if (dna.type === 'expert') {
      const v = d.voice || {};
      const s = d.story || {};
      const b = d.beliefs || {};
      return [
        `=== VOZ DEL EXPERTO ===`,
        `Nombre: ${v.name || 'No especificado'}`,
        `Adjetivos de tono: ${safeJoin(v.adjectives)}`,
        `Descripcion: ${v.description || 'No especificado'}`,
        `Nivel de humor: ${v.humorLevel || 'No especificado'}`,
        `Longitud de oraciones: ${v.sentenceLength || 'No especificado'}`,
        `Lenguaje: ${v.useProfanity || 'No especificado'}`,
        ``,
        `=== HISTORIA DE TRANSFORMACION ===`,
        `Punto mas bajo: ${s.lowestPoint || 'No especificado'}`,
        `Descubrimiento/Punto de quiebre: ${s.breakthrough || 'No especificado'}`,
        `Situacion actual: ${s.current || 'No especificado'}`,
        `Credenciales: ${safeJoin(s.credentials, ' | ')}`,
        ``,
        `=== CREENCIAS Y PROMESA ===`,
        `Creencias centrales: ${safeJoin(b.beliefs, ' | ')}`,
        `Enemigo comun: ${b.commonEnemy || 'No especificado'}`,
        `Promesa central: ${b.centralPromise || 'No especificado'}`,
      ].join('\n');
    }

    if (dna.type === 'audience') {
      const p = d.pains || {};
      const des = d.desires || {};
      const tr = des.tangibleResults || {};
      const objs = Array.isArray(d.objections) ? d.objections : [];
      return [
        `=== NIVEL DE CONSCIENCIA ===`,
        `Nivel: ${d.consciousnessLevel ?? 'No especificado'}`,
        ``,
        `=== DOLORES DEL AVATAR ===`,
        `Economicos: ${safeJoin(p.economic, ' | ')}`,
        `Emocionales: ${safeJoin(p.emotional, ' | ')}`,
        `Sociales: ${safeJoin(p.social, ' | ')}`,
        `De identidad: ${safeJoin(p.identity, ' | ')}`,
        `Dolor primario: ${p.primary || 'No especificado'}`,
        ``,
        `=== DESEOS DEL AVATAR ===`,
        `Transformacion de identidad: ${des.identityTransformation || 'No especificado'}`,
        `Resultado economico: ${tr.economic || 'No especificado'}`,
        `Estilo de vida: ${tr.lifestyle || 'No especificado'}`,
        `Relaciones: ${tr.relationships || 'No especificado'}`,
        `Marco temporal: ${des.timeframe || 'No especificado'}`,
        ``,
        `=== OBJECIONES REALES ===`,
        ...(objs.length > 0
          ? objs.map((o: any, i: number) => `Objecion ${i + 1}: "${o.exact_words || ''}" | Causa: ${o.root_cause || ''} | Destruccion: ${o.destruction || ''}`)
          : ['No especificado']),
      ].join('\n');
    }

    if (dna.type === 'product') {
      const bonuses = Array.isArray(d.bonuses) ? d.bonuses : [];
      const pp = d.paymentPlan || {};
      return [
        `=== PRODUCTO/SERVICIO ===`,
        `Nombre: ${d.name || 'No especificado'}`,
        `Precio: $${d.price || 'No especificado'}`,
        ``,
        `=== PROBLEMA Y SOLUCION ===`,
        `Problema de la audiencia: ${d.audienceProblem || 'No especificado'}`,
        `Solucion del producto: ${d.solution || 'No especificado'}`,
        `Oferta de transformacion: ${d.transformationOffer || 'No especificado'}`,
        ``,
        `=== BENEFICIOS ===`,
        ...safeList(d.benefitBullets),
        ``,
        `=== GARANTIA Y BONOS ===`,
        `Garantia: ${d.guaranteePeriod ? d.guaranteePeriod + ' dias' : 'No especificado'} — ${d.guaranteeDescription || ''}`,
        ...(bonuses.length > 0 ? bonuses.map((b: any) => `Bono: ${b.name} (valor $${b.value})`) : []),
        ...(pp.enabled ? [`Plan de pagos: ${pp.installments} cuotas de $${pp.installmentPrice}`] : []),
        ``,
        `=== KEYWORDS ===`,
        `${safeJoin(d.keywords)}`,
      ].join('\n');
    }

    return Object.entries(d)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join('\n');
  };

  const handleRun = async () => {
    if (!searchQuery.trim()) {
      toast({ variant: 'destructive', description: 'Ingresa una búsqueda' });
      return;
    }
    if (!telegramChatId && !email) {
      toast({ variant: 'destructive', description: 'Configura al menos Telegram o email para recibir los guiones' });
      return;
    }

    saveConfig({
      search_mode: searchMode, search_query: searchQuery,
      max_ads: maxAds, objective, cta: ctaText,
      telegram_chat_id: telegramChatId, email, schedule,
    });

    setIsRunning(true);
    setError(null);
    setResultMessage('');
    setGeneratedScripts([]);
    setAgentResult(null);
    setPhase('working');

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: searchQuery,
          niche: searchQuery,
          search_mode: searchMode,
          page_url: searchMode === 'brand' ? searchQuery : undefined,
          objective,
          cta: ctaText || undefined,
          max_ads: maxAds,
          dna_expert: buildDnaString(personalityId),
          dna_audience: buildDnaString(audienceId),
          dna_product: buildDnaString(productId),
          telegram_chat_id: telegramChatId,
          email: email || undefined,
          referentes: referentNames.length > 0 ? referentNames : undefined,
        }),
        signal: AbortSignal.timeout(300000),
      });

      const result: AgentResult = await response.json();

      if (result.success) {
        setPhase('done');
        setResultMessage(result.message || 'Scripts generados y enviados');
        setAgentResult(result);
        setGeneratedScripts(result.scripts || []);
        toast({ description: result.message || 'Scripts enviados' });
      } else {
        throw new Error((result as any).error || result.message || 'Error en el agente');
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setPhase('idle');
      toast({ variant: 'destructive', description: msg });
    } finally {
      setIsRunning(false);
    }
  };

  const handleNewSearch = () => {
    setPhase('idle');
    setResultMessage('');
    setGeneratedScripts([]);
    setAgentResult(null);
  };

  const pc = agentResult?.platformCounts;
  const stats = agentResult?.stats;

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
          <Badge variant="secondary" className="ml-2 text-xs">N8N</Badge>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Left panel: Config ──────────────────────────────────────────── */}
        <aside className="w-80 shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-4 space-y-5">

            {/* DNA Selection */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">DNA del Experto</p>
              <div className="space-y-3">
                <DnaSelector type="expert" label="Personalidad" Icon={Mic} color="text-violet-600"
                  dnas={dnas || []} selectedId={personalityId} onSelect={setPersonalityId} />
                <DnaSelector type="audience" label="Audiencia" Icon={Users} color="text-blue-600"
                  dnas={dnas || []} selectedId={audienceId} onSelect={setAudienceId} />
                <DnaSelector type="product" label="Producto" Icon={Package} color="text-emerald-600"
                  dnas={dnas || []} selectedId={productId} onSelect={setProductId} />
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Referent Profiles */}
            <ReferentProfiles onReferentsChange={setReferentNames} />

            <div className="border-t border-border" />

            {/* Search Mode */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Modo de búsqueda</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchMode('keyword')}
                  className={cn(
                    'flex-1 text-xs py-2 px-3 rounded-lg border font-medium transition-all',
                    searchMode === 'keyword'
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-border text-muted-foreground hover:border-violet-300',
                  )}
                >
                  Por nicho
                </button>
                <button
                  onClick={() => setSearchMode('brand')}
                  className={cn(
                    'flex-1 text-xs py-2 px-3 rounded-lg border font-medium transition-all',
                    searchMode === 'brand'
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-border text-muted-foreground hover:border-violet-300',
                  )}
                >
                  Por marca
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {searchMode === 'keyword'
                  ? 'Busca anuncios por palabra clave (ej: "marketing digital", "pérdida de peso")'
                  : 'Busca anuncios de una marca por URL o nombre de su fan page'}
              </p>
            </div>

            {/* Search Input */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                {searchMode === 'keyword' ? 'Palabra clave / nicho' : 'Nombre o URL de la fan page'}
              </label>
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={searchMode === 'keyword' ? 'ej: marketing digital, adelgazar...' : 'ej: SaleADS o facebook.com/SaleADS'}
                className="text-sm"
              />
            </div>

            {/* Objective */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                <Target className="w-3 h-3 inline mr-1" />Objetivo de campaña
              </p>
              <div className="flex flex-wrap gap-1.5">
                {OBJECTIVES.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setObjective(o.value)}
                    className={cn(
                      'text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all',
                      objective === o.value
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'border-border text-muted-foreground hover:border-violet-300',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                CTA (llamada a la acción)
              </label>
              <Input
                value={ctaText}
                onChange={e => setCtaText(e.target.value)}
                placeholder="ej: Agenda tu llamada, Compra ahora, Link en bio..."
                className="text-sm"
              />
            </div>

            {/* Max ads */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Cantidad de anuncios: <span className="text-foreground font-semibold">{maxAds}</span>
              </label>
              <input
                type="range" min={5} max={30} step={5} value={maxAds}
                onChange={e => setMaxAds(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                <span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Delivery */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Entrega de guiones</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Send className="w-3 h-3 text-sky-500" /> Chat ID de Telegram
                  </label>
                  <Input
                    value={telegramChatId}
                    onChange={e => setTelegramChatId(e.target.value)}
                    placeholder="-100123456789"
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Mail className="w-3 h-3 text-emerald-500" /> Email de entrega
                  </label>
                  <Input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="text-xs"
                    type="email"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* CTA Button */}
            <Button
              onClick={handleRun}
              disabled={isRunning || !searchQuery.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              {isRunning ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Agente trabajando...</>
              ) : (
                <><Zap className="w-4 h-4" />Lanzar Agente</>
              )}
            </Button>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="border-t border-border" />

            {/* Schedule */}
            <ScheduleConfig
              keyword={searchQuery}
              countries={[]}
              maxAds={maxAds}
              dnaExpert={buildDnaString(personalityId)}
              dnaAudience={buildDnaString(audienceId)}
              dnaProduct={buildDnaString(productId)}
              telegramChatId={telegramChatId}
              email={email}
            />
          </div>
        </aside>

        {/* ── Right panel: Results ──────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-muted/20">

          {phase === 'working' && (
            <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-violet-100 flex items-center justify-center mb-6 animate-pulse">
                <Bot className="w-10 h-10 text-violet-600" />
              </div>
              <h2 className="font-semibold text-lg text-foreground mb-3">El agente está trabajando...</h2>
              <div className="space-y-2 text-sm text-muted-foreground max-w-md">
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                  <span>Buscando anuncios ganadores en Facebook, Instagram + TikTok</span>
                </div>
                <p className="text-xs mt-4 text-muted-foreground/70">
                  Esto puede tardar 3-5 minutos. El agente busca, filtra por criterio de ganadores,
                  analiza la estructura, modela los guiones sección por sección, y audita la calidad.
                </p>
              </div>
              <div className="mt-8 grid grid-cols-5 gap-4 text-xs text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Radio className="w-4 h-4 text-blue-600" />
                  </div>
                  <span>FB Ads</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-fuchsia-100 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-fuchsia-600" />
                  </div>
                  <span>Instagram</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-pink-600" />
                  </div>
                  <span>TikTok</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                  </div>
                  <span>Claude IA</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Send className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span>Entrega</span>
                </div>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="p-6 space-y-6">
              {/* Summary header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Agente completado
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">{resultMessage}</p>
                </div>
                <Button onClick={handleNewSearch} variant="outline" size="sm" className="gap-1 text-xs">
                  <Zap className="w-3 h-3" /> Nueva búsqueda
                </Button>
              </div>

              {/* Stats bar */}
              <div className="flex flex-wrap gap-3">
                {pc && (
                  <div className="flex gap-2 text-xs">
                    <Badge variant="secondary" className="gap-1">
                      <Radio className="w-3 h-3 text-blue-600" /> FB: {pc.facebook}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Camera className="w-3 h-3 text-fuchsia-600" /> IG: {pc.instagram}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <ExternalLink className="w-3 h-3 text-pink-600" /> TK: {pc.tiktok}
                    </Badge>
                  </div>
                )}
                {stats && (
                  <div className="flex gap-2 text-xs">
                    {stats.average_quality_score != null && (
                      <Badge variant="outline">
                        Score prom: {stats.average_quality_score}/100
                      </Badge>
                    )}
                    {stats.processing_time_ms != null && !isNaN(stats.processing_time_ms) && (
                      <Badge variant="outline">
                        Tiempo: {Math.round(stats.processing_time_ms / 1000)}s
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Warnings */}
              {agentResult?.warnings && agentResult.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                  {agentResult.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Delivery confirmations */}
              <div className="flex gap-3">
                {telegramChatId && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-xs">
                    <Send className="w-3.5 h-3.5 text-sky-600" />
                    <span className="text-sky-800">Telegram enviado</span>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-800">Email enviado</span>
                  </div>
                )}
                {agentResult?.docUrl && (
                  <a
                    href={agentResult.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-200 text-xs hover:bg-violet-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-violet-600" />
                    <span className="text-violet-800">Abrir Google Doc</span>
                  </a>
                )}
              </div>

              {/* Generated scripts */}
              {generatedScripts.length > 0 && (
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Guiones generados ({generatedScripts.length}) — Edita y corrige para entrenar la IA
                  </p>
                  {generatedScripts.map((script) => (
                    <ScriptCard
                      key={script.content_number}
                      script={script}
                      dnaExpertId={personalityId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {phase === 'idle' && (
            <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="font-semibold text-lg text-foreground mb-2">Agente listo</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Configura la búsqueda, selecciona tus DNAs y lanza el agente.
                Buscará anuncios ganadores en Facebook, Instagram y TikTok, los adaptará a tu voz y los enviará por Telegram y email.
              </p>
              <div className="mt-6 grid grid-cols-5 gap-3 text-xs text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Radio className="w-4 h-4 text-blue-600" />
                  </div>
                  <span>FB Ads</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-fuchsia-100 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-fuchsia-600" />
                  </div>
                  <span>Instagram</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-pink-600" />
                  </div>
                  <span>TikTok</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                  </div>
                  <span>Modela con IA</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Send className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span>Telegram + Email</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
