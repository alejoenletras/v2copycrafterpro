import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testConnection } from '@/lib/supabase';
import { useDNAs } from '@/hooks/useDNAs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, AlertCircle, CheckCircle, Mic, Users, Package,
  ArrowRight, Dna, Zap, Sparkles, Bot, BookOpen, Video,
  Activity, FileText, Users2, Library,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatus {
  success: boolean;
  message: string;
}

const DNA_TYPES = [
  {
    type: 'expert' as const,
    label: 'Personalidad',
    description: 'Tu voz, historia y estilo',
    icon: Mic,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    iconBg: 'bg-violet-100',
  },
  {
    type: 'audience' as const,
    label: 'Audiencia',
    description: 'Tu cliente ideal y sus dolores',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
  },
  {
    type: 'product' as const,
    label: 'Producto',
    description: 'Tu oferta y diferenciador',
    icon: Package,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { dnas, isLoading: dnasLoading } = useDNAs();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);

  useEffect(() => {
    testConnection().then(setConnectionStatus);
  }, []);

  // DNA counts
  const dnaCountByType: Record<string, number> = {
    expert: dnas?.filter(d => d.type === 'expert').length ?? 0,
    audience: dnas?.filter(d => d.type === 'audience').length ?? 0,
    product: dnas?.filter(d => d.type === 'product').length ?? 0,
  };
  const hasAllThreeDnaTypes = dnaCountByType.expert > 0 && dnaCountByType.audience > 0 && dnaCountByType.product > 0;
  const hasAnyDna = (dnas?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-violet-500" />
            Hooq
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Crea guiones de venta de alta conversión con IA</p>
        </div>
      </header>

      {/* Connection error */}
      {connectionStatus && !connectionStatus.success && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{connectionStatus.message}</span>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 flex-1">
        {dnasLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── PASO 1: DNAs ─────────────────────────────── */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0',
                  hasAllThreeDnaTypes
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-violet-100 text-violet-700',
                )}>
                  {hasAllThreeDnaTypes ? <CheckCircle className="w-4 h-4" /> : '1'}
                </span>
                <div>
                  <h2 className="font-semibold text-lg text-foreground">Define tus DNAs</h2>
                  <p className="text-sm text-muted-foreground">
                    Los DNAs capturan la esencia de tu marca para que la IA escriba con tu voz.
                    {!hasAnyDna && <span className="text-violet-600 font-medium"> Empieza aquí.</span>}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DNA_TYPES.map((dna) => {
                  const Icon = dna.icon;
                  const count = dnaCountByType[dna.type];
                  const hasThis = count > 0;
                  return (
                    <button
                      key={dna.type}
                      onClick={() => navigate('/dnas')}
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md',
                        hasThis
                          ? `${dna.border} ${dna.bg}`
                          : 'border-dashed border-muted-foreground/30 hover:border-violet-300 hover:bg-violet-50/30',
                      )}
                    >
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', dna.iconBg)}>
                        <Icon className={cn('w-4 h-4', dna.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-semibold text-sm', hasThis ? dna.color : 'text-foreground')}>
                          {dna.label}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{dna.description}</p>
                      </div>
                      {hasThis ? (
                        <Badge variant="outline" className={cn('text-xs shrink-0', dna.border, dna.color)}>
                          {count}
                        </Badge>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  variant={hasAnyDna ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => navigate('/dnas')}
                  className={cn(
                    'gap-1.5',
                    !hasAnyDna && 'bg-violet-600 hover:bg-violet-700 text-white',
                  )}
                >
                  <Dna className="w-3.5 h-3.5" />
                  {hasAnyDna ? 'Gestionar DNAs' : 'Crear tu primer DNA'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </section>

            {/* ── PASO 2: VSL Maker ───────────────────────── */}
            <section className={cn(!hasAnyDna && 'opacity-50 pointer-events-none')}>
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-bold shrink-0">
                  2
                </span>
                <div>
                  <h2 className="font-semibold text-lg text-foreground">Genera tu VSL</h2>
                  <p className="text-sm text-muted-foreground">
                    Crea un guion de venta sección por sección con la IA.
                    {!hasAnyDna && <span className="italic"> Crea al menos un DNA primero.</span>}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/vsl')}
                className="w-full p-6 rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 hover:shadow-lg hover:border-violet-300 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg group-hover:text-violet-700 transition-colors">
                      VSL Maker
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Genera un Video Sales Letter completo de 12 secciones. La IA usa tus DNAs + las instrucciones de tu producto para crear un guion de venta de alta conversión.
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm text-violet-600 font-semibold mt-3 group-hover:gap-2.5 transition-all">
                      Abrir VSL Maker <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </button>
            </section>

            {/* ── PASO 3: Agente de Anuncios ───────────────── */}
            <section className={cn(!hasAnyDna && 'opacity-50 pointer-events-none')}>
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-bold shrink-0">
                  3
                </span>
                <div>
                  <h2 className="font-semibold text-lg text-foreground">Agente de Anuncios</h2>
                  <p className="text-sm text-muted-foreground">
                    Busca anuncios ganadores y los adapta automáticamente a tu voz y producto.
                    {!hasAnyDna && <span className="italic"> Crea al menos un DNA primero.</span>}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/ads-agent')}
                className="w-full p-6 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 hover:shadow-lg hover:border-blue-300 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center shrink-0">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg group-hover:text-blue-700 transition-colors">
                      Agente de Anuncios
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      El agente busca anuncios activos en Meta Ads Library (ganadores comprobados), los analiza y los reescribe con tu personalidad. Entrega 15-30 guiones por Telegram o email.
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-semibold group-hover:gap-2.5 transition-all">
                        Abrir Agente <ArrowRight className="w-4 h-4" />
                      </span>
                      <span className="text-xs text-muted-foreground">Requiere cuenta Apify</span>
                    </div>
                  </div>
                </div>
              </button>
            </section>

            {/* ── PASO 4: Video Inspiration ─────────────── */}
            <section className={cn(!hasAnyDna && 'opacity-50 pointer-events-none')}>
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-bold shrink-0">
                  4
                </span>
                <div>
                  <h2 className="font-semibold text-lg text-foreground">Video Inspiration</h2>
                  <p className="text-sm text-muted-foreground">
                    Sube un video que te inspire, encuentra ads similares y modela con tu DNA.
                    {!hasAnyDna && <span className="italic"> Crea al menos un DNA primero.</span>}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/video-inspiration')}
                className="w-full p-6 rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-lg hover:border-amber-300 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg group-hover:text-amber-700 transition-colors">
                      Video Inspiration Agent
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sube un video o pega un link, la IA lo analiza, busca anuncios con estructura similar y los modela a tu voz y producto.
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 font-semibold group-hover:gap-2.5 transition-all">
                        Abrir Agent <ArrowRight className="w-4 h-4" />
                      </span>
                      <span className="text-xs text-muted-foreground">Requiere Gemini API Key</span>
                    </div>
                  </div>
                </div>
              </button>
            </section>

            {/* ── Biblioteca de Referencias ──────────────── */}
            <section className={cn(!hasAnyDna && 'opacity-50 pointer-events-none')}>
              <button
                onClick={() => navigate('/references')}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-violet-300 hover:bg-violet-50/30 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground group-hover:text-violet-700 transition-colors">
                    Biblioteca de Referencias
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Guarda guiones propios y anuncios ganadores. La IA los usa para mejorar sus scripts.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/50 shrink-0 group-hover:text-violet-600 transition-colors" />
              </button>
            </section>

            {/* ── Motor de Modelado ──────────────────────── */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-foreground">Motor de Modelado</h2>
                  <p className="text-sm text-muted-foreground">
                    Modela contenido de referentes con tus DNAs para generar guiones listos para producción.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => navigate('/referentes')}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:shadow-md transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <Users2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-emerald-700">Referentes</p>
                    <p className="text-xs text-muted-foreground truncate">Creadores que modelamos</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </button>

                <button
                  onClick={() => navigate('/content-bank')}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-teal-200 bg-teal-50 hover:shadow-md transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                    <Library className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-teal-700">Banco de Contenido</p>
                    <p className="text-xs text-muted-foreground truncate">Contenido scrapeado</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                </button>

                <button
                  onClick={() => navigate('/scripts')}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-cyan-200 bg-cyan-50 hover:shadow-md transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-cyan-700">Guiones Modelados</p>
                    <p className="text-xs text-muted-foreground truncate">Listos para producción</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                </button>
              </div>
            </section>

            {/* ── HOOQ v2: Multi-Plataforma ──────────────── */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-100 to-pink-100 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-fuchsia-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-foreground">HOOQ v2</h2>
                  <p className="text-sm text-muted-foreground">
                    Inteligencia multi-plataforma: competidores, posts orgánicos y ejecuciones.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => navigate('/competitors')}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-violet-200 bg-violet-50 hover:shadow-md transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-violet-700">Competidores</p>
                    <p className="text-xs text-muted-foreground truncate">Perfiles FB + IG + TikTok</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                </button>

                <button
                  onClick={() => navigate('/organic-posts')}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-fuchsia-200 bg-fuchsia-50 hover:shadow-md transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-fuchsia-100 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-fuchsia-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-fuchsia-700">Posts Orgánicos</p>
                    <p className="text-xs text-muted-foreground truncate">IG + TikTok analizados</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                </button>

                <button
                  onClick={() => navigate('/runs')}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:shadow-md transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-blue-700">Ejecuciones</p>
                    <p className="text-xs text-muted-foreground truncate">Historial de scraping</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
