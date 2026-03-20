import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, FileSpreadsheet, X, Sparkles, ChevronDown, ChevronUp,
  Copy, Check, Lightbulb, BarChart2, MessageSquareQuote, Target,
  TrendingUp, AlertCircle, Users, Megaphone, Brain, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text: string): { columns: { name: string; values: string[] }[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter(l => l.trim());
  if (nonEmpty.length < 2) return { columns: [] };

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        fields.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    return fields;
  };

  const headers = parseRow(nonEmpty[0]);
  const columns = headers.map(h => ({ name: h.trim().replace(/^"|"$/g, ''), values: [] as string[] }));

  for (let i = 1; i < nonEmpty.length; i++) {
    const row = parseRow(nonEmpty[i]);
    for (let j = 0; j < columns.length; j++) {
      columns[j].values.push((row[j] ?? '').trim());
    }
  }

  return { columns };
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface QuantStat { column: string; top_answer: string; insight: string; notable_pattern: string }
interface QualTheme {
  theme: string; description: string; frequency: string; sentiment: string;
  verbatims: string[]; marketing_implication: string;
}
interface Insight {
  type: 'pain_point' | 'desire' | 'belief' | 'objection' | 'trigger';
  title: string; description: string; evidence: string[]; action: string;
}
interface AdAngle {
  angle_type: string; hook: string; body_copy: string; cta: string; insight_source: string;
}
interface AudienceDNA { ideal_client: string; core_belief: string; testimonials: string; keywords: string }
interface SurveyAnalysis {
  executive_summary: string;
  key_findings: string[];
  quantitative: QuantStat[];
  qualitative_themes: QualTheme[];
  insights: Insight[];
  ad_angles: AdAngle[];
  audience_dna: AudienceDNA;
}

// ─── Small helpers ─────────────────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };
  return { copied, copy };
}

function CopyButton({ text, id }: { text: string; id: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      onClick={() => copy(text, id)}
      className="ml-2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied === id ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
}

const INSIGHT_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pain_point:  { label: 'Dolor',       color: 'bg-red-500/10 text-red-400 border-red-500/20',    icon: <AlertCircle size={13} /> },
  desire:      { label: 'Deseo',       color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <TrendingUp size={13} /> },
  belief:      { label: 'Creencia',    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Brain size={13} /> },
  objection:   { label: 'Objeción',    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <MessageSquareQuote size={13} /> },
  trigger:     { label: 'Disparador',  color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: <Target size={13} /> },
};

const ANGLE_COLORS: Record<string, string> = {
  dolor: 'bg-red-500/10 text-red-400',
  deseo: 'bg-emerald-500/10 text-emerald-400',
  prueba_social: 'bg-blue-500/10 text-blue-400',
  transformación: 'bg-violet-500/10 text-violet-400',
  objeción: 'bg-amber-500/10 text-amber-400',
};

const SENTIMENT_COLOR: Record<string, string> = {
  positivo: 'text-emerald-400',
  negativo: 'text-red-400',
  neutro: 'text-muted-foreground',
  mixto: 'text-amber-400',
};

function Collapsible({ title, icon, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 font-medium text-sm">{icon}{title}</div>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function SurveyAnalysisPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<{ name: string; values: string[] }[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SurveyAnalysis | null>(null);
  const [savingDna, setSavingDna] = useState(false);
  const [dnaSaved, setDnaSaved] = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({ title: 'Formato no válido', description: 'Solo se aceptan archivos .csv', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { columns: parsed } = parseCSV(text);
      if (parsed.length === 0) {
        toast({ title: 'CSV vacío', description: 'No se encontraron columnas válidas', variant: 'destructive' });
        return;
      }
      setColumns(parsed);
      setFileName(file.name);
      setTotalRows(parsed[0]?.values.filter(v => v.trim()).length ?? 0);
      setAnalysis(null);
      setDnaSaved(false);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async () => {
    if (columns.length === 0) return;
    setLoading(true);
    setAnalysis(null);
    try {
      // Limitar payload: máximo 200 respuestas por columna para no saturar la función
      const trimmedColumns = columns.map(col => ({
        name: col.name,
        values: col.values.slice(0, 200),
      }));

      const { data, error } = await supabase.functions.invoke('analyze-survey', {
        body: { columns: trimmedColumns, context: context.trim() || undefined },
      });

      if (error) throw new Error(error.message);
      if (!data) throw new Error('La función no devolvió datos. Verifica que analyze-survey esté desplegada.');
      if (data.error) throw new Error(data.error);
      if (!data.analysis) throw new Error(`Respuesta inesperada: ${JSON.stringify(data).slice(0, 200)}`);

      setAnalysis(data.analysis);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error al analizar', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDna = async () => {
    if (!analysis?.audience_dna) return;
    setSavingDna(true);
    try {
      const { error } = await supabase.from('dnas').insert({
        user_id: 'default-user',
        type: 'audience',
        name: `Audiencia — ${fileName.replace('.csv', '')}`,
        data: analysis.audience_dna,
      });
      if (error) throw new Error(error.message);
      setDnaSaved(true);
      toast({ title: 'DNA guardado', description: 'DNA de Audiencia creado correctamente' });
      setTimeout(() => navigate('/dnas'), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error al guardar', description: msg, variant: 'destructive' });
    } finally {
      setSavingDna(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Análisis de Encuestas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sube un CSV de encuesta y obtén insights cuantitativos, cualitativos, perfiles de audiencia y ángulos de anuncios.
        </p>
      </div>

      {/* Upload */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !columns.length && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          columns.length ? 'border-violet-500/40 bg-violet-500/5 cursor-default' : 'border-border hover:border-violet-500/40 hover:bg-muted/30 cursor-pointer'
        }`}
      >
        {columns.length === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <UploadCloud size={36} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Arrastra tu CSV aquí o <span className="text-violet-400 underline">selecciona archivo</span></p>
            <p className="text-xs text-muted-foreground">Google Forms, Typeform, SurveyMonkey — cualquier exportación CSV</p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={24} className="text-violet-400" />
              <div className="text-left">
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">{totalRows} respuestas · {columns.length} preguntas</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setColumns([]); setFileName(''); setAnalysis(null); setDnaSaved(false); }}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      </div>

      {/* Context */}
      {columns.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Contexto del negocio <span className="text-muted-foreground font-normal">(opcional)</span></label>
          <Textarea
            placeholder="Ej: Somos una consultora de marketing para coaches. Esta encuesta fue a nuestra lista de email de 2.400 personas..."
            value={context}
            onChange={e => setContext(e.target.value)}
            className="resize-none text-sm"
            rows={3}
          />
          <Button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Analizando encuesta...
              </span>
            ) : (
              <span className="flex items-center gap-2"><Sparkles size={15} />Analizar encuesta</span>
            )}
          </Button>
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Executive summary */}
          <div className="border border-violet-500/20 bg-violet-500/5 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
              <Lightbulb size={15} /> Resumen ejecutivo
            </div>
            <p className="text-sm leading-relaxed">{analysis.executive_summary}</p>
            <div className="grid gap-2 pt-1">
              {analysis.key_findings.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-violet-400 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quantitative */}
          {analysis.quantitative?.length > 0 && (
            <Collapsible title={`Análisis cuantitativo (${analysis.quantitative.length} preguntas)`} icon={<BarChart2 size={15} className="text-blue-400" />} defaultOpen>
              <div className="space-y-4">
                {analysis.quantitative.map((q, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{q.column}</p>
                    <p className="text-sm font-medium">{q.top_answer}</p>
                    <p className="text-sm text-muted-foreground">{q.insight}</p>
                    {q.notable_pattern && (
                      <p className="text-xs text-amber-400/80 flex items-center gap-1.5 pt-1">
                        <TrendingUp size={11} /> {q.notable_pattern}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* Qualitative themes */}
          {analysis.qualitative_themes?.length > 0 && (
            <Collapsible title={`Temas cualitativos (${analysis.qualitative_themes.length} patrones)`} icon={<MessageSquareQuote size={15} className="text-emerald-400" />} defaultOpen>
              <div className="space-y-4">
                {analysis.qualitative_themes.map((t, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{t.theme}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t.frequency}</span>
                        <span className={`text-xs font-medium ${SENTIMENT_COLOR[t.sentiment] ?? 'text-muted-foreground'}`}>{t.sentiment}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                    {t.verbatims?.length > 0 && (
                      <div className="space-y-1.5 pl-3 border-l-2 border-muted">
                        {t.verbatims.map((v, j) => (
                          <p key={j} className="text-xs text-muted-foreground italic">"{v}"</p>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-violet-400/80 flex items-center gap-1.5 pt-1">
                      <Megaphone size={11} /> {t.marketing_implication}
                    </p>
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* Insights */}
          {analysis.insights?.length > 0 && (
            <Collapsible title={`Insights de marketing (${analysis.insights.length})`} icon={<Target size={15} className="text-amber-400" />} defaultOpen>
              <div className="grid gap-3">
                {analysis.insights.map((ins, i) => {
                  const meta = INSIGHT_META[ins.type] ?? INSIGHT_META.trigger;
                  return (
                    <div key={i} className={`border rounded-lg p-4 space-y-1.5 ${meta.color}`}>
                      <div className="flex items-center gap-2">
                        {meta.icon}
                        <span className="text-xs font-semibold uppercase tracking-wide">{meta.label}</span>
                        <span className="text-sm font-medium">{ins.title}</span>
                      </div>
                      <p className="text-sm opacity-90">{ins.description}</p>
                      {ins.evidence?.map((ev, j) => (
                        <p key={j} className="text-xs opacity-70 italic">↳ {ev}</p>
                      ))}
                      <p className="text-xs opacity-80 pt-1 font-medium">→ {ins.action}</p>
                    </div>
                  );
                })}
              </div>
            </Collapsible>
          )}

          {/* Ad angles */}
          {analysis.ad_angles?.length > 0 && (
            <Collapsible title={`Ángulos de anuncios (${analysis.ad_angles.length})`} icon={<Megaphone size={15} className="text-red-400" />} defaultOpen>
              <div className="space-y-4">
                {analysis.ad_angles.map((ad, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ANGLE_COLORS[ad.angle_type] ?? 'bg-muted text-muted-foreground'}`}>
                        {ad.angle_type}
                      </span>
                      <CopyButton text={`${ad.hook}\n\n${ad.body_copy}\n\n${ad.cta}`} id={`ad-${i}`} />
                    </div>
                    <p className="text-sm font-semibold leading-snug">"{ad.hook}"</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{ad.body_copy}</p>
                    <p className="text-xs font-medium text-violet-400">{ad.cta}</p>
                    <p className="text-xs text-muted-foreground/60 pt-1 italic">Basado en: {ad.insight_source}</p>
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* Audience DNA — always visible, highlighted */}
          {analysis.audience_dna && (
            <div className="border-2 border-violet-500/40 bg-violet-500/5 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
                <Users size={16} />
                DNA de Audiencia sugerido
              </div>
              <p className="text-xs text-muted-foreground">
                Basado en las respuestas reales de tu encuesta. Guárdalo directamente como DNA de Audiencia en Hooq.
              </p>
              {[
                { key: 'ideal_client', label: 'Cliente ideal' },
                { key: 'core_belief',  label: 'Creencias y miedos' },
                { key: 'testimonials', label: 'Transformaciones que busca' },
                { key: 'keywords',     label: 'Vocabulario de la audiencia' },
              ].map(({ key, label }) => {
                const val = analysis.audience_dna[key as keyof AudienceDNA];
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                      <CopyButton text={val} id={`dna-${key}`} />
                    </div>
                    <p className="text-sm leading-relaxed bg-muted/30 rounded-lg px-3 py-2">{val}</p>
                  </div>
                );
              })}
              <Button
                onClick={handleSaveDna}
                disabled={savingDna || dnaSaved}
                size="lg"
                className={`w-full mt-2 ${dnaSaved ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-violet-600 hover:bg-violet-700'}`}
              >
                {dnaSaved ? (
                  <span className="flex items-center gap-2"><CheckCircle2 size={16} /> DNA guardado — redirigiendo a DNAs...</span>
                ) : savingDna ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2"><Users size={16} /> Guardar como DNA de Audiencia</span>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
