import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDNAs } from '@/hooks/useDNAs';
import { useAdsAgentChat } from '@/hooks/useAdsAgentChat';
import ScriptCard from '@/components/agent/ScriptCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Home, Bot, Loader2, Mic, Users, Package,
  ChevronDown, Plus, X, Zap, RotateCcw,
  Info, Link as LinkIcon, FileText, Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdObjective } from '@/types';

// ─── Objectives ──────────────────────────────────────────────────────────────

const OBJECTIVES: Array<{ value: AdObjective; label: string }> = [
  { value: 'captacion', label: 'Captación — Top of Funnel' },
  { value: 'agitacion', label: 'Agitación — Problem Aware' },
  { value: 'remarketing', label: 'Remarketing — Retargeting' },
  { value: 'compra', label: 'Compra — Bottom of Funnel' },
  { value: 'reconocimiento', label: 'Reconocimiento — Brand Awareness' },
];

// ─── Build DNA context string ─────────────────────────────────────────────────

function buildDnaString(dnas: Array<{ id: string; type: string; data: Record<string, any> }> | undefined, dnaId: string): string {
  const dna = dnas?.find(d => d.id === dnaId);
  if (!dna?.data) return '';
  const d = dna.data as Record<string, any>;

  const safeJoin = (val: any, sep = ', '): string => {
    if (Array.isArray(val)) return val.join(sep) || '';
    if (typeof val === 'string') return val || '';
    return '';
  };

  if (dna.type === 'expert') {
    if (d.about || d.voice || d.credentials) {
      return [d.about ? `Sobre mí: ${d.about}` : '', d.voice ? `Voz/tono: ${d.voice}` : '', d.credentials ? `Credenciales: ${d.credentials}` : '', d.forbidden_words ? `Palabras prohibidas: ${d.forbidden_words}` : ''].filter(Boolean).join('\n');
    }
    const v = d.voice || {}; const s = d.story || {}; const b = d.beliefs || {};
    return [`Nombre: ${v.name || ''}`, `Tono: ${safeJoin(v.adjectives)}`, s.lowestPoint ? `Historia: ${s.lowestPoint} → ${s.breakthrough || ''} → ${s.current || ''}` : '', b.centralPromise ? `Promesa: ${b.centralPromise}` : '', b.commonEnemy ? `Enemigo: ${b.commonEnemy}` : ''].filter(Boolean).join('\n');
  }

  if (dna.type === 'audience') {
    if (d.ideal_client || d.core_belief) {
      return [d.ideal_client ? `Cliente ideal: ${d.ideal_client}` : '', d.core_belief ? `Creencia core: ${d.core_belief}` : '', d.testimonials ? `Testimonios: ${d.testimonials}` : '', d.keywords ? `Keywords: ${d.keywords}` : ''].filter(Boolean).join('\n');
    }
    const p = d.pains || {}; const des = d.desires || {};
    return [p.primary ? `Dolor principal: ${p.primary}` : '', des.identityTransformation ? `Transformación deseada: ${des.identityTransformation}` : '', safeJoin(p.economic) ? `Dolores económicos: ${safeJoin(p.economic)}` : ''].filter(Boolean).join('\n');
  }

  if (dna.type === 'product') {
    if (d.main_problem || d.solution_promise) {
      return [d.main_problem ? `Problema: ${d.main_problem}` : '', d.solution_promise ? `Promesa: ${d.solution_promise}` : '', d.irresistible_offer ? `Oferta: ${d.irresistible_offer}` : '', d.keywords ? `Keywords: ${d.keywords}` : ''].filter(Boolean).join('\n');
    }
    return [d.name ? `Producto: ${d.name}` : '', d.price ? `Precio: $${d.price}` : '', d.audienceProblem ? `Problema: ${d.audienceProblem}` : '', d.solution ? `Solución: ${d.solution}` : '', d.transformationOffer ? `Transformación: ${d.transformationOffer}` : ''].filter(Boolean).join('\n');
  }

  return Object.entries(d).filter(([k, v]) => v !== null && v !== undefined && v !== '' && !k.startsWith('_')).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');
}

// ─── DNA Selector (compact inline) ──────────────────────────────────────────

function DnaSelector({ type, Icon, color, dnas, selectedId, onSelect }: {
  type: string; Icon: React.ElementType; color: string;
  dnas: Array<{ id: string; name: string; type: string }>;
  selectedId: string; onSelect: (id: string) => void;
}) {
  const filtered = dnas.filter(d => d.type === type);
  const selected = filtered.find(d => d.id === selectedId);
  return (
    <div className="flex-1 min-w-0">
      <div className="relative">
        <Icon className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5', color)} />
        <select
          value={selectedId}
          onChange={e => onSelect(e.target.value)}
          className="w-full text-xs border border-input rounded-lg pl-8 pr-7 py-2.5 bg-background appearance-none truncate focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 font-medium"
          title={selected?.name || type}
        >
          <option value="">— Seleccionar —</option>
          {filtered.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdsAgentPage() {
  const navigate = useNavigate();
  const { dnas } = useDNAs();
  const agent = useAdsAgentChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Form state
  const [selectedObjective, setSelectedObjective] = useState<AdObjective>('captacion');
  const [instructions, setInstructions] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [references, setReferences] = useState<string[]>([]);
  const [newRef, setNewRef] = useState('');
  const [documents, setDocuments] = useState<Array<{ name: string; content: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select first DNA of each type
  useEffect(() => {
    if (!dnas) return;
    if (!agent.personalityId) {
      const first = dnas.find(d => d.type === 'expert');
      if (first) agent.setPersonalityId(first.id);
    }
    if (!agent.audienceId) {
      const first = dnas.find(d => d.type === 'audience');
      if (first) agent.setAudienceId(first.id);
    }
    if (!agent.productId) {
      const first = dnas.find(d => d.type === 'product');
      if (first) agent.setProductId(first.id);
    }
  }, [dnas]);

  // Wire DNA builder
  useEffect(() => {
    agent.setBuildDnaString((id: string) => buildDnaString(dnas as any, id));
  }, [dnas, agent.setBuildDnaString]);

  // Auto-scroll output panel
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [agent.generatedScripts, agent.statusMessages]);

  const handleGenerate = () => {
    agent.generate({
      objective: selectedObjective,
      instructions,
      ctaText,
      references,
      documents: documents.length > 0 ? documents : undefined,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 1_000_000) continue;
      try {
        const content = await file.text();
        setDocuments(prev => [...prev, {
          name: file.name,
          content: content.substring(0, 10000),
        }]);
      } catch {
        // skip binary files
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddRef = () => {
    const trimmed = newRef.trim();
    if (!trimmed) return;
    setReferences(prev => [...prev, trimmed]);
    setNewRef('');
  };

  const hasResults = agent.generatedScripts.length > 0 || agent.statusMessages.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
              <Home className="w-4 h-4" />
            </button>
            <span className="text-muted-foreground">/</span>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-600" />
              <span className="font-semibold text-sm text-foreground">Agente de Anuncios</span>
            </div>
            {agent.pipelinePhase && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 animate-pulse font-medium">
                {agent.pipelinePhase === 'searching' ? 'Buscando anuncios...' :
                 agent.pipelinePhase === 'modeling' ? 'Modelando guiones...' : agent.pipelinePhase}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasResults && (
              <Button onClick={agent.resetChat} variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
                <RotateCcw className="w-3.5 h-3.5" />
                Nueva
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden max-w-[1400px] mx-auto w-full">

        {/* ── Left Panel: Agent Settings ─────────────────────────────────────── */}
        <aside className="w-[480px] shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Section title */}
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-foreground">Agent Settings</h2>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </div>

            {/* Campaign DNA */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Campaign DNA</label>
              <div className="flex gap-2">
                <DnaSelector type="expert" Icon={Mic} color="text-violet-600" dnas={dnas || []} selectedId={agent.personalityId} onSelect={agent.setPersonalityId} />
                <DnaSelector type="audience" Icon={Users} color="text-blue-600" dnas={dnas || []} selectedId={agent.audienceId} onSelect={agent.setAudienceId} />
                <DnaSelector type="product" Icon={Package} color="text-emerald-600" dnas={dnas || []} selectedId={agent.productId} onSelect={agent.setProductId} />
              </div>
            </div>

            {/* Objective */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Objetivo de campaña<span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedObjective}
                  onChange={e => setSelectedObjective(e.target.value as AdObjective)}
                  className="w-full text-sm border border-input rounded-lg px-3 py-2.5 bg-background appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400"
                >
                  {OBJECTIVES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Instructions */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <label className="text-xs font-medium text-muted-foreground">Instrucciones y contenido extra</label>
                <Info className="w-3 h-3 text-muted-foreground" />
              </div>
              <Textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder={`Ejemplos:\n- "marketing digital"\n- "coaching fitness"\n- "ecommerce dropshipping"\n- "bienes raices"\n\nEscribe una palabra clave del nicho para buscar anuncios ganadores.`}
                rows={6}
                className="text-sm resize-y min-h-[140px]"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Escribe la palabra clave del nicho para buscar anuncios en Facebook Ads Library.
              </p>
            </div>

            {/* Document upload */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                <FileText className="w-3 h-3 inline mr-1" />
                Documentos de referencia (opcional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".txt,.md,.html,.csv,.json,.doc,.docx,.pdf"
                multiple
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/50 transition-all"
              >
                <Upload className="w-4 h-4" />
                Subir documentos
              </button>
              {documents.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {documents.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-xs">
                      <FileText className="w-3 h-3 text-violet-600 shrink-0" />
                      <span className="truncate flex-1 text-violet-700 font-medium">{doc.name}</span>
                      <span className="text-violet-400 shrink-0">{Math.ceil(doc.content.length / 1000)}k</span>
                      <button
                        onClick={() => setDocuments(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-violet-400 hover:text-destructive shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">
                Sube paginas de venta, briefs, guiones previos u otros docs. La IA los lee antes de generar.
              </p>
            </div>

            {/* Reference links */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                <LinkIcon className="w-3 h-3 inline mr-1" />
                Links de referencia (opcional)
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newRef}
                  onChange={e => setNewRef(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddRef()}
                  placeholder="Pega un link de referencia..."
                  className="text-sm flex-1"
                />
                <Button onClick={handleAddRef} size="sm" variant="outline" className="gap-1 shrink-0">
                  <Plus className="w-3 h-3" /> Agregar
                </Button>
              </div>
              {references.length > 0 && (
                <div className="space-y-1.5">
                  {references.map((ref, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs">
                      <LinkIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{ref}</span>
                      <button
                        onClick={() => setReferences(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTA */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <label className="text-xs font-medium text-muted-foreground">CTA</label>
                <Info className="w-3 h-3 text-muted-foreground" />
              </div>
              <Input
                value={ctaText}
                onChange={e => setCtaText(e.target.value)}
                placeholder="Destino del anuncio: link, WhatsApp, landing..."
                className="text-sm"
              />
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={agent.isProcessing}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2 h-11 text-sm font-semibold"
            >
              {agent.isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
              ) : (
                <><Zap className="w-4 h-4" /> Generar</>
              )}
            </Button>
          </div>
        </aside>

        {/* ── Right Panel: Output (ScriptCards) ──────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-muted/20">
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {!hasResults ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
                <div className="text-sm text-muted-foreground max-w-md space-y-4">
                  <p className="font-semibold text-foreground text-lg">Recuerda el Axioma 41/39/20:</p>
                  <p>
                    El éxito de una campaña es <strong>41%</strong> la Audiencia,{' '}
                    <strong>39%</strong> la Oferta, y solo <strong>20%</strong> el Copy.
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Configura tus DNAs, elige un objetivo, escribe una palabra clave del nicho y genera.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Status messages */}
                {agent.statusMessages.map((msg, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-50 border border-violet-100">
                    {agent.isProcessing && i === agent.statusMessages.length - 1 ? (
                      <Loader2 className="w-3.5 h-3.5 text-violet-600 animate-spin shrink-0" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                    )}
                    <span className="text-sm text-violet-700">{msg}</span>
                  </div>
                ))}

                {/* ScriptCards */}
                {agent.generatedScripts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Zap className="w-4 h-4 text-violet-600" />
                      {agent.generatedScripts.length} Guiones Generados
                    </h3>
                    <p className="text-xs text-muted-foreground -mt-2">
                      Edita cualquier guion y guarda la corrección — Hooq aprende de cada ajuste.
                    </p>
                    {agent.generatedScripts.map((script) => (
                      <ScriptCard
                        key={script.content_number}
                        script={script}
                        dnaExpertId={agent.personalityId}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
