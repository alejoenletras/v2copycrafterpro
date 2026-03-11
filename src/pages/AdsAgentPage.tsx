import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Home, Loader2, ChevronDown, Search, Clock, CheckCircle2,
  AlertCircle, Globe, Bot, ExternalLink, XCircle, Sparkles,
  ThumbsUp, ThumbsDown, Copy, Calendar, Pause, Play, Trash2,
  ChevronRight, ChevronUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdSearches } from '@/hooks/useAdSearches';
import { useDNAs } from '@/hooks/useDNAs';
import { useGenerationRuns } from '@/hooks/useGenerationRuns';
import { useModeledScripts } from '@/hooks/useModeledScripts';
import { useScheduledGenerations } from '@/hooks/useScheduledGenerations';
import { useTrainingPatterns } from '@/hooks/useTrainingPatterns';
import { cn } from '@/lib/utils';
import type {
  Ad, AdSearch, AdSearchType, AdMediaFilter,
  GenerationRun, ModeledScriptV3, ScriptFormatSimple, ScheduleFrequency,
} from '@/types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const COUNTRIES = [
  { code: 'ALL', label: 'Todos' }, { code: 'US', label: 'Estados Unidos' },
  { code: 'MX', label: 'Mexico' }, { code: 'CO', label: 'Colombia' },
  { code: 'ES', label: 'Espana' }, { code: 'AR', label: 'Argentina' },
  { code: 'BR', label: 'Brasil' }, { code: 'UK', label: 'Reino Unido' },
  { code: 'CA', label: 'Canada' }, { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Alemania' }, { code: 'FR', label: 'Francia' },
];

const MEDIA_TYPES: { value: AdMediaFilter; label: string }[] = [
  { value: 'all', label: 'Todos' }, { value: 'video', label: 'Video' }, { value: 'image', label: 'Imagen' },
];

// ─── Script Card ──────────────────────────────────────────────
function ScriptCard({ script, index, onApprove, onReject }: {
  script: ModeledScriptV3; index: number;
  onApprove: () => void; onReject: () => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showMeta, setShowMeta] = useState(false);

  const copyAll = useCallback(() => {
    const parts = [
      script.referente_name ? `REFERENTE: ${script.referente_name}` : '',
      `HOOK 1:\n${script.hook_1}`,
      script.hook_2 ? `HOOK 2:\n${script.hook_2}` : '',
      `CUERPO:\n${script.body}`,
      `CTA:\n${script.cta}`,
    ].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(parts);
    toast({ title: 'Copiado al portapapeles' });
  }, [script, toast]);

  const copySection = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado` });
  };

  const statusColor = script.status === 'approved' ? 'border-emerald-300 bg-emerald-50/30' :
    script.status === 'rejected' ? 'border-red-200 bg-red-50/20' : 'border-border';

  return (
    <div className={`border rounded-xl overflow-hidden ${statusColor}`}>
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
            Contenido #{index + 1}
            {script.referente_name && <span className="ml-1 text-violet-600">· {script.referente_name}</span>}
          </p>
          <p className="text-sm font-medium line-clamp-2 text-foreground">{script.hook_1}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {/* Hook 1 */}
          <ScriptSection label="HOOK 1" text={script.hook_1} onCopy={() => copySection('Hook 1', script.hook_1)} />

          {/* Hook 2 */}
          {script.hook_2 && <ScriptSection label="HOOK 2" text={script.hook_2} onCopy={() => copySection('Hook 2', script.hook_2!)} />}

          {/* Body */}
          <ScriptSection label="CUERPO" text={script.body} onCopy={() => copySection('Cuerpo', script.body)} />

          {/* CTA */}
          <ScriptSection label="CTA" text={script.cta} onCopy={() => copySection('CTA', script.cta)} />

          {/* Why / What / How (meta, collapsible) */}
          {(script.why_it_works || script.what_was_modeled || script.how_adapted) && (
            <div>
              <button onClick={() => setShowMeta(s => !s)} className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1">
                {showMeta ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Por qué funciona · Qué se modeló · Cómo se adaptó
              </button>
              {showMeta && (
                <div className="mt-2 space-y-2 pl-4 border-l-2 border-violet-200">
                  {script.why_it_works && <MetaRow label="Por qué funciona" text={script.why_it_works} />}
                  {script.what_was_modeled && <MetaRow label="Qué se modeló" text={script.what_was_modeled} />}
                  {script.how_adapted && <MetaRow label="Cómo se adaptó" text={script.how_adapted} />}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={copyAll}>
              <Copy className="w-3.5 h-3.5" /> Copiar todo
            </Button>
            <Button
              size="sm" variant="outline"
              className={cn('gap-1.5 text-xs', script.status === 'approved' && 'bg-emerald-50 border-emerald-300 text-emerald-700')}
              onClick={onApprove}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> Aprobar
            </Button>
            <Button
              size="sm" variant="outline"
              className={cn('gap-1.5 text-xs', script.status === 'rejected' && 'bg-red-50 border-red-300 text-red-700')}
              onClick={onReject}
            >
              <ThumbsDown className="w-3.5 h-3.5" /> Rechazar
            </Button>
            {script.google_doc_url && (
              <a href={script.google_doc_url} target="_blank" rel="noopener noreferrer" className="ml-auto">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs"><ExternalLink className="w-3.5 h-3.5" /> Doc</Button>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ScriptSection({ label, text, onCopy }: { label: string; text: string; onCopy: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <button onClick={onCopy} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <Copy className="w-3 h-3" />
        </button>
      </div>
      <p className="text-sm whitespace-pre-wrap text-foreground">{text}</p>
    </div>
  );
}

function MetaRow({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-xs text-foreground mt-0.5">{text}</p>
    </div>
  );
}

// ─── Run Status Badge ─────────────────────────────────────────
function RunStatusBadge({ status }: { status: GenerationRun['status'] }) {
  if (status === 'completed') return <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />;
  if (status === 'failed') return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />;
  return <Loader2 className="w-3 h-3 animate-spin text-amber-500 inline-block" />;
}

// ─── Motor de Modelado Tab ────────────────────────────────────
function MotorModeladoTab() {
  const { toast } = useToast();
  const { dnas } = useDNAs();

  const expertDnas = dnas?.filter(d => d.type === 'expert') ?? [];
  const audienceDnas = dnas?.filter(d => d.type === 'audience') ?? [];
  const productDnas = dnas?.filter(d => d.type === 'product') ?? [];

  const [personalityId, setPersonalityId] = useState(expertDnas.find(d => d.is_default)?.id ?? expertDnas[0]?.id ?? '');
  const [audienceId, setAudienceId] = useState(audienceDnas.find(d => d.is_default)?.id ?? audienceDnas[0]?.id ?? '');
  const [productId, setProductId] = useState(productDnas.find(d => d.is_default)?.id ?? productDnas[0]?.id ?? '');
  const [count, setCount] = useState(10);
  const [format, setFormat] = useState<ScriptFormatSimple>('video_script');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  // Scheduling state
  const [schedFrequency, setSchedFrequency] = useState<ScheduleFrequency>('weekly');
  const [schedEmail, setSchedEmail] = useState('');
  const [schedTelegram, setSchedTelegram] = useState(true);
  const [schedDoc, setSchedDoc] = useState(true);

  const { runs } = useGenerationRuns(personalityId || undefined);
  const { scripts, isLoading: isLoadingScripts, updateStatus } = useModeledScripts({ runId: selectedRunId ?? undefined });
  const { schedules, createSchedule, isCreating: isCreatingSchedule, toggleSchedule, deleteSchedule } = useScheduledGenerations();
  const { condensePatterns, isCondensing } = useTrainingPatterns();

  const canGenerate = personalityId && audienceId && productId;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/trigger-script-generation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}`, 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ personality_dna_id: personalityId, audience_dna_id: audienceId, product_dna_id: productId, count, script_format: format }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Generación iniciada', description: `Generando ${count} guiones. Aparecerán aquí en unos minutos.` });
        setSelectedRunId(data.run_id);
      } else {
        toast({ title: 'Error', description: data.error ?? 'No se pudo iniciar', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!canGenerate) return;
    await createSchedule({
      personality_dna_id: personalityId, audience_dna_id: audienceId, product_dna_id: productId,
      scripts_per_run: count, script_format: format, frequency: schedFrequency,
      is_active: true, delivery_email: schedEmail || null, delivery_telegram: schedTelegram, delivery_google_doc: schedDoc,
    });
    setShowSchedule(false);
  };

  const personalityDnaName = expertDnas.find(d => d.id === personalityId)?.name ?? '';

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left panel: form + runs */}
      <aside className="w-80 shrink-0 border-r border-border bg-card overflow-y-auto">
        <div className="p-4 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Configuración</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">DNA Personalidad *</label>
                <select value={personalityId} onChange={e => setPersonalityId(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Seleccionar...</option>
                  {expertDnas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">DNA Audiencia *</label>
                <select value={audienceId} onChange={e => setAudienceId(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Seleccionar...</option>
                  {audienceDnas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">DNA Producto *</label>
                <select value={productId} onChange={e => setProductId(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Seleccionar...</option>
                  {productDnas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Count */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Cantidad</p>
            <div className="flex gap-1.5">
              {[5, 10, 15, 20].map(n => (
                <button key={n} onClick={() => setCount(n)}
                  className={cn('flex-1 py-1.5 text-sm rounded-md border transition-colors font-medium',
                    count === n ? 'bg-violet-600 text-white border-violet-600' : 'border-border hover:border-violet-300 text-muted-foreground')}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Formato</p>
            <div className="flex gap-1.5">
              {([['video_script', 'Video Script'], ['written_ad', 'Ad Escrito']] as [ScriptFormatSimple, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setFormat(v)}
                  className={cn('flex-1 py-1.5 text-xs rounded-md border transition-colors font-medium',
                    format === v ? 'bg-violet-600 text-white border-violet-600' : 'border-border hover:border-violet-300 text-muted-foreground')}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {!canGenerate && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Selecciona los 3 DNAs para continuar.
            </p>
          )}

          <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating} className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2">
            {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando...</> : <><Sparkles className="w-4 h-4" /> Generar {count} guiones</>}
          </Button>

          {/* Schedule section */}
          <div>
            <button onClick={() => setShowSchedule(s => !s)} className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground py-1">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Programar agente</span>
              {showSchedule ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {showSchedule && (
              <div className="mt-3 space-y-3 p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Frecuencia</p>
                  <div className="flex gap-1.5">
                    {([['daily', 'Diario'], ['weekly', 'Semanal'], ['biweekly', 'Bisemanal']] as [ScheduleFrequency, string][]).map(([v, l]) => (
                      <button key={v} onClick={() => setSchedFrequency(v)}
                        className={cn('flex-1 py-1 text-xs rounded border transition-colors',
                          schedFrequency === v ? 'bg-violet-600 text-white border-violet-600' : 'border-border text-muted-foreground hover:border-violet-300')}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Email entrega</label>
                  <Input value={schedEmail} onChange={e => setSchedEmail(e.target.value)} placeholder="tu@email.com" className="text-xs h-8" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Telegram</label>
                  <button onClick={() => setSchedTelegram(s => !s)} className={cn('w-8 h-4 rounded-full transition-colors', schedTelegram ? 'bg-violet-600' : 'bg-muted border')}>
                    <span className={cn('block w-3 h-3 rounded-full bg-white shadow transition-transform', schedTelegram ? 'translate-x-4 ml-0.5' : 'translate-x-0.5')} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Google Doc</label>
                  <button onClick={() => setSchedDoc(s => !s)} className={cn('w-8 h-4 rounded-full transition-colors', schedDoc ? 'bg-violet-600' : 'bg-muted border')}>
                    <span className={cn('block w-3 h-3 rounded-full bg-white shadow transition-transform', schedDoc ? 'translate-x-4 ml-0.5' : 'translate-x-0.5')} />
                  </button>
                </div>
                <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1.5" onClick={handleCreateSchedule} disabled={!canGenerate || isCreatingSchedule}>
                  {isCreatingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  Activar agente automático
                </Button>
              </div>
            )}

            {/* Active schedules */}
            {schedules.length > 0 && (
              <div className="mt-3 space-y-2">
                {schedules.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border text-xs">
                    <div>
                      <p className="font-medium text-foreground capitalize">{s.frequency}</p>
                      <p className="text-muted-foreground">{s.scripts_per_run} guiones</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleSchedule({ id: s.id, is_active: !s.is_active })}
                        className={cn('w-6 h-6 rounded flex items-center justify-center', s.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-muted-foreground hover:bg-muted')}>
                        {s.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => deleteSchedule(s.id)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border" />

          {/* Runs list */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Ejecuciones recientes</p>
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay ejecuciones previas.</p>
            ) : (
              <div className="space-y-2">
                {runs.map(run => (
                  <button key={run.id} onClick={() => setSelectedRunId(run.id)}
                    className={cn('w-full text-left p-3 rounded-lg border transition-all',
                      selectedRunId === run.id ? 'border-violet-300 bg-violet-50' : 'border-border hover:border-violet-200 hover:bg-muted/50')}>
                    <div className="flex items-center gap-2 mb-1">
                      <RunStatusBadge status={run.status} />
                      <span className="text-xs font-medium truncate flex-1">{personalityDnaName || 'Generación'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{run.generated_count}/{run.requested_count} guiones</span>
                      <span>·</span>
                      <span>{new Date(run.started_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {run.status === 'failed' && run.error_message && (
                      <p className="text-xs text-red-500 mt-1 truncate">{run.error_message}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Right panel: scripts */}
      <main className="flex-1 overflow-y-auto bg-muted/20">
        {!selectedRunId ? (
          <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-violet-600" />
            </div>
            <h2 className="font-semibold text-lg text-foreground mb-2">Motor de Modelado</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Selecciona tus DNAs y haz clic en "Generar guiones". El agente scrapeará el contenido de tus referentes,
              lo analizará con IA y lo modelará a tu voz.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
              {[
                { icon: '🎯', label: 'Selecciona DNAs' },
                { icon: '🤖', label: 'IA modela' },
                { icon: '📝', label: 'Guiones listos' },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-sm">{s.icon}</div>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : isLoadingScripts ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          </div>
        ) : scripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400 mb-4" />
            <p className="font-medium text-foreground mb-1">Generando guiones...</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              El agente está trabajando. Los guiones aparecerán aquí en unos minutos.
              Puedes seguir trabajando — esta página se actualiza automáticamente.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg text-foreground">{scripts.length} guiones modelados</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Haz clic en un guión para expandirlo, copiar o evaluar.</p>
              </div>
              <Button
                variant="outline" size="sm"
                onClick={() => condensePatterns({ dna_expert_id: personalityId || undefined })}
                disabled={isCondensing}
                className="gap-1.5 text-xs"
                title="Extrae patrones de aprendizaje de tus correcciones anteriores"
              >
                {isCondensing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Condensar patrones
              </Button>
            </div>
            {scripts.map((script, i) => (
              <ScriptCard
                key={script.id}
                script={script}
                index={i}
                onApprove={() => updateStatus({ id: script.id, status: 'approved' })}
                onReject={() => updateStatus({ id: script.id, status: 'rejected' })}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Buscar Ads Tab (existing functionality) ──────────────────
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
                <td className="px-4 py-3"><span className="font-medium text-sm">{ad.page_name}</span></td>
                <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{ad.ad_type}</Badge></td>
                <td className="px-4 py-3 text-center">
                  <span className={cn('font-semibold text-sm',
                    ad.days_active >= 30 ? 'text-emerald-600' : ad.days_active >= 7 ? 'text-amber-600' : 'text-muted-foreground')}>
                    {ad.days_active}d
                  </span>
                </td>
                <td className="px-4 py-3 text-center"><span className="text-sm text-muted-foreground">{collation != null ? String(collation) : '-'}</span></td>
                <td className="px-4 py-3 text-center">
                  <a href={adLibUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium">
                    <ExternalLink className="w-3.5 h-3.5" /> Ver
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

function SearchHistoryItem({ search, isActive, onSelect }: { search: AdSearch; isActive: boolean; onSelect: () => void }) {
  const statusConfig: Record<string, { icon: typeof Clock; color: string }> = {
    pending: { icon: Clock, color: 'text-gray-400' },
    processing: { icon: Loader2, color: 'text-amber-500' },
    completed: { icon: CheckCircle2, color: 'text-emerald-500' },
    error: { icon: XCircle, color: 'text-red-500' },
  };
  const cfg = statusConfig[search.status] || statusConfig.pending;
  const StatusIcon = cfg.icon;

  return (
    <button onClick={onSelect} className={cn('w-full text-left p-3 rounded-lg border transition-all',
      isActive ? 'border-violet-300 bg-violet-50' : 'border-border hover:border-violet-200 hover:bg-muted/50')}>
      <div className="flex items-center gap-2 mb-1">
        <StatusIcon className={cn('w-3.5 h-3.5 shrink-0', cfg.color, search.status === 'processing' && 'animate-spin')} />
        <span className="text-xs font-medium truncate">{search.query}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{search.search_type === 'keyword' ? 'Keyword' : 'Pagina'}</span>
        <span>-</span><span>{search.country_code}</span>
        {search.filtered_results != null && <><span>-</span><span>{search.filtered_results} ads</span></>}
      </div>
      <span className="text-xs text-muted-foreground/70">
        {new Date(search.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    </button>
  );
}

function BuscarAdsTab() {
  const { toast } = useToast();
  const { searches, activeSearch, ads, isTriggering, isLoadingAds, isPolling, triggerSearch, selectSearch } = useAdSearches();
  const [searchType, setSearchType] = useState<AdSearchType>('keyword');
  const [query, setQuery] = useState('');
  const [countryCode, setCountryCode] = useState('ALL');
  const [mediaType, setMediaType] = useState<AdMediaFilter>('all');
  const [maxAds, setMaxAds] = useState(50);
  const [adTypeFilter, setAdTypeFilter] = useState<'all' | 'video' | 'image' | 'text'>('all');
  const [minDaysFilter, setMinDaysFilter] = useState<number>(0);

  const handleSearch = async () => {
    if (!query.trim()) { toast({ variant: 'destructive', description: 'Ingresa un keyword o URL' }); return; }
    await triggerSearch({ search_type: searchType, query: query.trim(), country_code: countryCode, media_type: mediaType, max_ads: maxAds });
  };

  const filteredAds = ads.filter(ad => {
    if (adTypeFilter !== 'all' && ad.ad_type !== adTypeFilter) return false;
    if (ad.days_active < minDaysFilter) return false;
    return true;
  });

  return (
    <div className="flex-1 flex overflow-hidden">
      <aside className="w-80 shrink-0 border-r border-border bg-card overflow-y-auto">
        <div className="p-4 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tipo de busqueda</p>
            <div className="flex gap-2">
              {(['keyword', 'page_url'] as AdSearchType[]).map(t => (
                <button key={t} onClick={() => setSearchType(t)}
                  className={cn('flex-1 text-xs py-2 px-3 rounded-lg border font-medium transition-all',
                    searchType === t ? 'bg-violet-600 text-white border-violet-600' : 'border-border text-muted-foreground hover:border-violet-300')}>
                  {t === 'keyword' ? 'Por Keyword' : 'Por Pagina'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              {searchType === 'keyword' ? 'Keyword' : 'URL de pagina de Facebook'}
            </label>
            <Input value={query} onChange={e => setQuery(e.target.value)}
              placeholder={searchType === 'keyword' ? 'ej: marketing digital...' : 'ej: https://facebook.com/page'}
              className="text-sm" onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5"><Globe className="w-3 h-3" /> Pais</label>
            <div className="relative">
              <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-ring">
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Tipo de media</p>
            <div className="flex gap-2">
              {MEDIA_TYPES.map(mt => (
                <button key={mt.value} onClick={() => setMediaType(mt.value)}
                  className={cn('flex-1 text-xs py-2 px-3 rounded-lg border font-medium transition-all',
                    mediaType === mt.value ? 'bg-violet-600 text-white border-violet-600' : 'border-border text-muted-foreground hover:border-violet-300')}>
                  {mt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Max anuncios: <span className="text-foreground font-semibold">{maxAds}</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[5, 15, 20, 30, 50, 60, 80, 100].map(n => (
                <button key={n} onClick={() => setMaxAds(n)}
                  className={cn('text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all',
                    maxAds === n ? 'bg-violet-600 text-white border-violet-600' : 'border-border text-muted-foreground hover:border-violet-300')}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleSearch} disabled={isTriggering || isPolling || !query.trim()} className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2">
            {isTriggering ? <><Loader2 className="w-4 h-4 animate-spin" />Iniciando...</> :
              isPolling ? <><Loader2 className="w-4 h-4 animate-spin" />Buscando...</> :
                <><Search className="w-4 h-4" />Buscar Anuncios</>}
          </Button>
          {isPolling && activeSearch && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              {activeSearch.status === 'pending' ? 'En cola...' : 'Procesando anuncios...'}
            </div>
          )}
          <div className="border-t border-border" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Busquedas recientes</p>
            {searches.length === 0 ? <p className="text-xs text-muted-foreground">No hay busquedas previas</p> : (
              <div className="space-y-2">
                {searches.map(s => (
                  <SearchHistoryItem key={s.id} search={s} isActive={activeSearch?.id === s.id} onSelect={() => s.status === 'completed' && selectSearch(s)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-muted/20">
        {!activeSearch && !isPolling && (
          <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4"><Search className="w-8 h-8 text-violet-600" /></div>
            <h2 className="font-semibold text-lg text-foreground mb-2">Buscar anuncios ganadores</h2>
            <p className="text-sm text-muted-foreground max-w-sm">Busca por keyword o por pagina de Facebook. El agente escanea la Ad Library y filtra anuncios activos 3+ dias.</p>
          </div>
        )}
        {isPolling && (
          <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-violet-100 flex items-center justify-center mb-6 animate-pulse"><Bot className="w-10 h-10 text-violet-600" /></div>
            <h2 className="font-semibold text-lg text-foreground mb-3">El agente esta trabajando...</h2>
            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
              <span>Buscando y analizando anuncios en Facebook Ad Library</span>
            </div>
          </div>
        )}
        {activeSearch && !isPolling && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  {activeSearch.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {activeSearch.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                  {activeSearch.query}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{activeSearch.search_type === 'keyword' ? 'Keyword' : 'Pagina'}</span>
                  <span>-</span><span>{activeSearch.country_code}</span>
                  {activeSearch.total_results != null && <><span>-</span><span>{activeSearch.total_results} total, {activeSearch.filtered_results} filtrados</span></>}
                </div>
              </div>
            </div>
            {activeSearch.status === 'error' && activeSearch.error_message && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{activeSearch.error_message}</span>
              </div>
            )}
            {ads.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-1.5">
                  {(['all', 'video', 'image', 'text'] as const).map(t => (
                    <button key={t} onClick={() => setAdTypeFilter(t)}
                      className={cn('text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all',
                        adTypeFilter === t ? 'bg-violet-600 text-white border-violet-600' : 'border-border text-muted-foreground hover:border-violet-300')}>
                      {t === 'all' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Min dias:</span>
                  <input type="number" value={minDaysFilter} onChange={e => setMinDaysFilter(Number(e.target.value))} min={0} className="w-14 border border-input rounded px-2 py-1 text-xs bg-background" />
                </div>
                <span className="text-xs text-muted-foreground ml-auto">{filteredAds.length} anuncios</span>
              </div>
            )}
            {isLoadingAds && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>}
            {!isLoadingAds && filteredAds.length > 0 && <AdsTable ads={filteredAds} />}
            {!isLoadingAds && ads.length === 0 && activeSearch.status === 'processing' && (
              <div className="text-center py-12 space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
                <p className="text-sm text-muted-foreground">El agente sigue procesando en N8N...</p>
                <Button variant="outline" size="sm" className="text-xs mt-2" onClick={() => activeSearch && selectSearch(activeSearch)}>Recargar anuncios</Button>
              </div>
            )}
            {!isLoadingAds && ads.length === 0 && (activeSearch.status === 'completed' || activeSearch.status === 'error') && (
              <div className="text-center py-12 space-y-2">
                <p className="text-sm text-muted-foreground">No se encontraron anuncios para esta busqueda.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
type TabKey = 'modelado' | 'buscar';

export default function AdsAgentPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('modelado');

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

          {/* Tab switcher */}
          <div className="ml-6 flex gap-1 bg-muted rounded-lg p-0.5">
            {([['modelado', 'Motor de Modelado'], ['buscar', 'Buscar Ads']] as [TabKey, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  activeTab === key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'modelado' ? <MotorModeladoTab /> : <BuscarAdsTab />}
      </div>
    </div>
  );
}
