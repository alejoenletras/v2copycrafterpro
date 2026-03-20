import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDNAs } from '@/hooks/useDNAs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Home, Loader2, Mic, Users, Package, ChevronDown,
  Sparkles, Copy, Check, Link, X, Plus, Download, RotateCcw,
  AlertCircle, CheckCircle2, FileText, MessageCircle, Send, Zap, ListChecks,
  Trash2, FolderOpen, Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/hooks/useUserId';
import type { DNAType } from '@/types';

// ─── Chat message type (moved up for VslProject reference) ────────────────

interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
}

// ─── VSL Project type ─────────────────────────────────────────────────────

interface VslProject {
  id: string;
  user_id: string;
  project_name: string;
  expert_dna_id: string | null;
  audience_dna_id: string | null;
  product_dna_id: string | null;
  instructions: string | null;
  reference_url: string | null;
  reference_text: string | null;
  generated_sections: Record<string, string>;
  chat_messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

// ─── Edge function caller ───────────────────────────────────────────────────

const BASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callEdge(name: string, body: unknown, timeoutMs = 120000) {
  const res = await fetch(`${BASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return res.json();
}

// ─── VSL Sections (12-section methodology) ──────────────────────────────────

const VSL_SECTIONS = [
  {
    id: 'hook_root_cause',
    name: 'Gancho + Causa Raíz',
    objective: 'Interrumpir el patrón mental del lector con un hook poderoso, revelar la causa oculta del problema y desacreditar las soluciones populares que no funcionan. El lector llega escéptico y cansado — debe salir con curiosidad genuina. Usa un hook que rompa expectativas, revela por qué lo que han probado antes NO funciona (el villano), e introduce la causa raíz real del problema sin revelar la solución todavía.',
  },
  {
    id: 'solution_mechanism',
    name: 'Mecanismo de Solución',
    objective: 'Introducir el "qué" de la solución sin revelar el "cómo". Usa analogías simples para explicar por qué este enfoque es diferente. Crea curiosidad insoportable sobre el mecanismo único. El lector debe pensar "esto tiene sentido, quiero saber más". No nombres el producto todavía — habla del mecanismo o principio detrás de la solución.',
  },
  {
    id: 'damaging_admission',
    name: 'Admisión Dañina',
    objective: 'Reconocer verdades incómodas con honestidad radical para generar confianza profunda. Admite limitaciones, errores pasados o verdades que la mayoría de marketers nunca diría. Esto posiciona al experto como "uno de ellos", no como un vendedor más. La autenticidad aquí destruye el escepticismo restante.',
  },
  {
    id: 'transition',
    name: 'Transición',
    objective: 'Puente emocional entre el problema y la solución. Crea un momento de esperanza genuina. Usa la historia personal del experto como pivote — el momento donde todo cambió. Prepara emocionalmente al lector para la revelación del producto. La transición debe sentirse natural, no forzada.',
  },
  {
    id: 'product_reveal',
    name: 'La Solución (Producto)',
    objective: 'Revelar finalmente el producto o método. Explica cómo ataca directamente la causa raíz identificada en la Sección 1. Muestra diferenciación clara vs alternativas. No vendas todavía — presenta la solución como la respuesta lógica a todo lo que has construido. El lector debe pensar "esto tiene total sentido".',
  },
  {
    id: 'offer',
    name: 'La Oferta',
    objective: 'Desglose detallado del valor que recibe el cliente. Presenta cada componente de la oferta con su valor individual. Compara el precio total vs la inversión real. Justifica lógicamente por qué es una ganga. Usa anclaje de precio: muestra cuánto costaría obtener estos resultados por otro camino.',
  },
  {
    id: 'cta_scarcity',
    name: 'CTA + Escasez',
    objective: 'Llamado a la acción cristalino y directo. Incluye una razón LEGÍTIMA de urgencia (no falsa escasez). Muestra la consecuencia real de no actuar ahora. El CTA debe ser imposible de malinterpretar. Usa lenguaje de acción directa.',
  },
  {
    id: 'bonuses',
    name: 'Bonos',
    objective: 'Presenta bonos que eliminan objeciones específicas (no bonos random). Cada bono debe tener valor percibido alto y relevancia directa al objetivo principal. Explica POR QUÉ incluyes cada bono y qué obstáculo elimina. Los bonos deben hacer que la oferta sea irresistible.',
  },
  {
    id: 'guarantee',
    name: 'Garantía',
    objective: 'Reversión total del riesgo. La garantía debe hacer que NO comprar sea más arriesgado que comprar. Usa lenguaje específico y confiable — nada de letra pequeña. Explica exactamente cómo funciona la garantía, quién califica, y por qué puedes ofrecerla (porque confías en tu producto).',
  },
  {
    id: 'urgency',
    name: 'Urgencia',
    objective: 'Deadline real con consecuencia clara. FOMO legítimo basado en hechos (plazas limitadas, precio que sube, bono que desaparece). No uses urgencia falsa — el lector lo detecta. Pinta vívidamente qué pasa si pospone la decisión.',
  },
  {
    id: 'options',
    name: 'Opciones',
    objective: 'Compara tres caminos: (1) No hacer nada y seguir con los mismos resultados, (2) Intentar solo y arriesgarse a perder más tiempo/dinero, (3) Tomar acción ahora con la solución probada. Pinta el futuro sin solución vs el futuro con solución de forma vívida y específica.',
  },
  {
    id: 'emotional_close',
    name: 'Cierre Emocional',
    objective: 'Recap del beneficio #1 más poderoso. Última inyección emocional que conecta con el dolor inicial y muestra la transformación completa. CTA final claro y directo. Termina con una nota que inspire acción inmediata — no duda, no "lo pienso", sino "lo hago ahora".',
  },
];

// ─── DNA selector component ────────────────────────────────────────────────

const DNA_CONFIG: { type: DNAType; label: string; icon: typeof Mic; color: string; bg: string }[] = [
  { type: 'expert', label: 'Personalidad', icon: Mic, color: 'text-violet-600', bg: 'bg-violet-50' },
  { type: 'audience', label: 'Audiencia', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  { type: 'product', label: 'Producto', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

interface DnaSelectorProps {
  dnaType: DNAType;
  config: typeof DNA_CONFIG[0];
  allDnas: any[];
  selected: any | null;
  onSelect: (dna: any) => void;
}

function DnaSelector({ dnaType, config, allDnas, selected, onSelect }: DnaSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dnaOptions = allDnas.filter(d => d.type === dnaType);
  const Icon = config.icon;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm w-full text-left transition-colors',
          selected ? `${config.bg} border-current/20` : 'border-dashed border-muted-foreground/30 hover:border-muted-foreground/50',
        )}
      >
        <Icon className={cn('w-3.5 h-3.5 shrink-0', config.color)} />
        <span className={cn('flex-1 truncate', selected ? config.color : 'text-muted-foreground')}>
          {selected ? selected.name : `Seleccionar ${config.label}`}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
          {dnaOptions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">Sin perfiles de {config.label}</p>
          ) : (
            dnaOptions.map((dna: any) => (
              <button
                key={dna.id}
                onClick={() => { onSelect(dna); setOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors flex items-center gap-2',
                  selected?.id === dna.id && 'bg-muted font-medium',
                )}
              >
                <span className="truncate flex-1">{dna.name}</span>
                {dna.is_default && <Badge variant="outline" className="text-[10px] h-4 px-1">Default</Badge>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chat message component ─────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
      {msg.role === 'ai' && (
        <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3 text-violet-600" />
        </div>
      )}
      <div className={cn(
        'rounded-xl px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap',
        msg.role === 'ai'
          ? 'bg-muted text-foreground'
          : 'bg-violet-600 text-white ml-auto',
      )}>
        {msg.text}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function VslMakerPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userId = useUserId();
  const { dnas, isLoading: dnasLoading } = useDNAs();

  // Shared state
  const [selectedDnas, setSelectedDnas] = useState<Record<DNAType, any | null>>({
    expert: null, audience: null, product: null,
  });
  const [instructions, setInstructions] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [referenceText, setReferenceText] = useState('');
  const [isFetchingRef, setIsFetchingRef] = useState(false);
  const [refError, setRefError] = useState('');
  const [generatedSections, setGeneratedSections] = useState<Record<string, string>>({});
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  // Mode state
  const [mode, setMode] = useState<'section' | 'full'>('full');

  // Section-by-section state
  const [selectedSection, setSelectedSection] = useState(VSL_SECTIONS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);

  // Full VSL state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isInfoComplete, setIsInfoComplete] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Project persistence state ────────────────────────────────────────────
  const [projects, setProjects] = useState<VslProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [showProjects, setShowProjects] = useState(true);

  // ── Fetch projects on mount ──────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('vsl_projects' as any)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setProjects((data as VslProject[]) ?? []);
    } catch (err: any) {
      console.error('Error fetching VSL projects:', err.message);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // ── Generate project name ────────────────────────────────────────────────
  const generateProjectName = (instr: string) => {
    if (instr.trim()) {
      const clean = instr.trim().replace(/\n/g, ' ');
      return clean.length > 40 ? clean.slice(0, 40) + '...' : clean;
    }
    const d = new Date();
    return `VSL — ${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  };

  // ── Save / update project ───────────────────────────────────────────────
  const saveProject = useCallback(async (
    sections: Record<string, string>,
    msgs: ChatMessage[],
    projectId: string | null,
  ) => {
    const row = {
      user_id: userId,
      project_name: generateProjectName(instructions),
      expert_dna_id: selectedDnas.expert?.id ?? null,
      audience_dna_id: selectedDnas.audience?.id ?? null,
      product_dna_id: selectedDnas.product?.id ?? null,
      instructions: instructions || null,
      reference_url: referenceUrl || null,
      reference_text: referenceText || null,
      generated_sections: sections,
      chat_messages: msgs,
      updated_at: new Date().toISOString(),
    };

    try {
      if (projectId) {
        // Update existing
        const { error } = await supabase
          .from('vsl_projects' as any)
          .update(row)
          .eq('id', projectId);
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('vsl_projects' as any)
          .insert(row)
          .select('id')
          .single();
        if (error) throw error;
        if (data) setActiveProjectId(data.id);
      }
      fetchProjects();
    } catch (err: any) {
      console.error('Error saving VSL project:', err.message);
    }
  }, [instructions, selectedDnas, referenceUrl, referenceText, fetchProjects]);

  // ── Load a project ──────────────────────────────────────────────────────
  const loadProject = (project: VslProject) => {
    setActiveProjectId(project.id);
    setInstructions(project.instructions || '');
    setReferenceUrl(project.reference_url || '');
    setReferenceText(project.reference_text || '');
    setShowLinkInput(!!(project.reference_url || project.reference_text));
    setGeneratedSections(project.generated_sections || {});
    setChatMessages(project.chat_messages || []);
    setIsInfoComplete(false);

    // Restore DNA selections
    if (dnas && dnas.length > 0) {
      setSelectedDnas({
        expert: dnas.find(d => d.id === project.expert_dna_id) ?? null,
        audience: dnas.find(d => d.id === project.audience_dna_id) ?? null,
        product: dnas.find(d => d.id === project.product_dna_id) ?? null,
      });
    }
  };

  // ── Delete a project ────────────────────────────────────────────────────
  const deleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('vsl_projects' as any)
        .delete()
        .eq('id', projectId);
      if (error) throw error;
      if (activeProjectId === projectId) {
        setActiveProjectId(null);
        setGeneratedSections({});
        setChatMessages([]);
        setInstructions('');
        setReferenceUrl('');
        setReferenceText('');
        setShowLinkInput(false);
      }
      fetchProjects();
      toast({ title: 'Proyecto eliminado' });
    } catch (err: any) {
      toast({ title: 'Error al eliminar', description: err.message, variant: 'destructive' });
    }
  };

  // ── New project ─────────────────────────────────────────────────────────
  const startNewProject = () => {
    setActiveProjectId(null);
    setGeneratedSections({});
    setChatMessages([]);
    setInstructions('');
    setReferenceUrl('');
    setReferenceText('');
    setShowLinkInput(false);
    setIsInfoComplete(false);
    setChatInput('');
    // Re-select default DNAs
    if (dnas && dnas.length > 0) {
      const next: Record<DNAType, any | null> = { expert: null, audience: null, product: null };
      for (const type of ['expert', 'audience', 'product'] as DNAType[]) {
        next[type] = dnas.find(d => d.type === type && d.is_default) || dnas.find(d => d.type === type) || null;
      }
      setSelectedDnas(next);
    }
  };

  // Pre-select default DNAs
  useEffect(() => {
    if (!dnas || dnas.length === 0) return;
    setSelectedDnas(prev => {
      const next = { ...prev };
      for (const type of ['expert', 'audience', 'product'] as DNAType[]) {
        if (!next[type]) {
          next[type] = dnas.find(d => d.type === type && d.is_default) || dnas.find(d => d.type === type) || null;
        }
      }
      return next;
    });
  }, [dnas]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const currentSection = VSL_SECTIONS.find(s => s.id === selectedSection)!;
  const currentSectionIndex = VSL_SECTIONS.findIndex(s => s.id === selectedSection);
  const generatedCount = Object.keys(generatedSections).length;
  const hasAnyDna = selectedDnas.expert || selectedDnas.audience || selectedDnas.product;
  const isBusy = isGenerating || isValidating || !!generatingProgress;

  // ── Build DNA context ─────────────────────────────────────────────────────

  const buildDnaContext = () => {
    const ctx: Record<string, any> = {};
    if (selectedDnas.expert) {
      const d = selectedDnas.expert.data ?? {};
      ctx.personality = { name: selectedDnas.expert.name, about: d.about, voice: d.voice, credentials: d.credentials, forbidden_words: d.forbidden_words };
    }
    if (selectedDnas.audience) {
      const d = selectedDnas.audience.data ?? {};
      ctx.audience = { name: selectedDnas.audience.name, ideal_client: d.ideal_client, core_belief: d.core_belief, testimonials: d.testimonials, keywords: d.keywords };
    }
    if (selectedDnas.product) {
      const d = selectedDnas.product.data ?? {};
      ctx.product = { name: selectedDnas.product.name, main_problem: d.main_problem, solution_promise: d.solution_promise, irresistible_offer: d.irresistible_offer, keywords: d.keywords };
    }
    return ctx;
  };

  // ── Fetch YouTube/link transcript ─────────────────────────────────────────

  const handleFetchReference = async () => {
    if (!referenceUrl.trim()) return;
    setIsFetchingRef(true);
    setRefError('');
    try {
      let type = 'other';
      if (/youtube\.com|youtu\.be/i.test(referenceUrl)) type = 'youtube';
      else if (/tiktok\.com/i.test(referenceUrl)) type = 'tiktok';
      else if (/instagram\.com/i.test(referenceUrl)) type = 'reel';

      const result = await callEdge('fetch-transcript', { url: referenceUrl, type });
      if (result.success && result.transcript) {
        setReferenceText(result.transcript);
        toast({ title: 'Referencia cargada', description: `Transcripción obtenida (${Math.round(result.transcript.length / 1000)}k caracteres)` });
      } else {
        setRefError(result.error || 'No se pudo obtener la transcripción');
      }
    } catch (err: any) {
      setRefError(err.message);
    } finally {
      setIsFetchingRef(false);
    }
  };

  // ── Generate single section (section-by-section mode) ─────────────────────

  const handleGenerateSection = async () => {
    if (!hasAnyDna) {
      toast({ title: 'Selecciona al menos un DNA', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const previousSections = VSL_SECTIONS
        .slice(0, currentSectionIndex)
        .filter(s => generatedSections[s.id])
        .map(s => ({ name: s.name, content: generatedSections[s.id] }));

      const result = await callEdge('generate-vsl-section', {
        dna_context: buildDnaContext(),
        section_id: currentSection.id,
        section_name: currentSection.name,
        section_number: currentSectionIndex + 1,
        section_objective: currentSection.objective,
        user_instructions: instructions,
        reference_text: referenceText || undefined,
        previous_sections: previousSections.length > 0 ? previousSections : undefined,
      });

      if (result.success && result.content) {
        const updatedSections = { ...generatedSections, [currentSection.id]: result.content };
        setGeneratedSections(updatedSections);
        if (currentSectionIndex < VSL_SECTIONS.length - 1) {
          setSelectedSection(VSL_SECTIONS[currentSectionIndex + 1].id);
        }
        setTimeout(() => {
          documentRef.current?.scrollTo({ top: documentRef.current!.scrollHeight, behavior: 'smooth' });
        }, 100);
        // Auto-save project
        saveProject(updatedSections, chatMessages, activeProjectId);
      } else {
        throw new Error(result.error || 'Error al generar la sección');
      }
    } catch (err: any) {
      toast({ title: 'Error al generar', description: err.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Full VSL: Validate info ───────────────────────────────────────────────

  const getAllUserAnswers = () => {
    return chatMessages
      .filter(m => m.role === 'user')
      .map(m => m.text)
      .join('\n\n');
  };

  const handleValidate = async () => {
    if (!hasAnyDna) {
      toast({ title: 'Selecciona al menos un DNA', variant: 'destructive' });
      return;
    }
    setIsValidating(true);
    try {
      const result = await callEdge('validate-vsl-info', {
        dna_context: buildDnaContext(),
        user_instructions: instructions,
        reference_text: referenceText || undefined,
        user_answers: getAllUserAnswers() || undefined,
      });

      if (result.complete) {
        setIsInfoComplete(true);
        setChatMessages(prev => [...prev, {
          role: 'ai',
          text: 'Tengo toda la información necesaria. Haz clic en "Generar VSL Completo" para crear las 12 secciones.',
        }]);
      } else if (result.questions) {
        setIsInfoComplete(false);
        setChatMessages(prev => [...prev, { role: 'ai', text: result.questions }]);
      } else if (result.error) {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({ title: 'Error al validar', description: err.message, variant: 'destructive' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSendChatAnswer = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: chatInput.trim() }]);
    setChatInput('');
    // Auto-validate after user answers
    setTimeout(() => handleValidate(), 300);
  };

  // ── Full VSL: Generate all sections ───────────────────────────────────────

  const handleGenerateFullVsl = async () => {
    if (!hasAnyDna) return;

    const combinedInstructions = [
      instructions,
      getAllUserAnswers(),
    ].filter(Boolean).join('\n\n---\n\n');

    setGeneratingProgress({ current: 0, total: VSL_SECTIONS.length, name: '' });
    const newSections: Record<string, string> = {};

    for (let i = 0; i < VSL_SECTIONS.length; i++) {
      const section = VSL_SECTIONS[i];
      setGeneratingProgress({ current: i + 1, total: VSL_SECTIONS.length, name: section.name });

      try {
        const previousSections = VSL_SECTIONS
          .slice(0, i)
          .filter(s => newSections[s.id])
          .map(s => ({ name: s.name, content: newSections[s.id] }));

        const result = await callEdge('generate-vsl-section', {
          dna_context: buildDnaContext(),
          section_id: section.id,
          section_name: section.name,
          section_number: i + 1,
          section_objective: section.objective,
          user_instructions: combinedInstructions,
          reference_text: referenceText || undefined,
          previous_sections: previousSections.length > 0 ? previousSections : undefined,
        });

        if (result.success && result.content) {
          newSections[section.id] = result.content;
          setGeneratedSections(prev => ({ ...prev, [section.id]: result.content }));
          setTimeout(() => {
            documentRef.current?.scrollTo({ top: documentRef.current!.scrollHeight, behavior: 'smooth' });
          }, 100);
        } else {
          // Mark failed section but continue
          newSections[section.id] = `[Error al generar esta sección: ${result.error || 'Error desconocido'}]`;
          setGeneratedSections(prev => ({ ...prev, [section.id]: newSections[section.id] }));
        }
      } catch (err: any) {
        newSections[section.id] = `[Error: ${err.message}]`;
        setGeneratedSections(prev => ({ ...prev, [section.id]: newSections[section.id] }));
      }
    }

    setGeneratingProgress(null);
    toast({ title: 'VSL completo generado', description: 'Las 12 secciones han sido creadas. Revisa el documento.' });
    // Auto-save after full generation
    saveProject(newSections, chatMessages, activeProjectId);
  };

  // ── Copy helpers ──────────────────────────────────────────────────────────

  const copySection = (sectionId: string) => {
    const text = generatedSections[sectionId];
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const copyAll = () => {
    const fullText = VSL_SECTIONS
      .filter(s => generatedSections[s.id])
      .map(s => generatedSections[s.id])
      .join('\n\n');
    if (!fullText) return;
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const downloadAll = () => {
    const fullText = VSL_SECTIONS
      .filter(s => generatedSections[s.id])
      .map((s, i) => `=== SECCIÓN ${i + 1}: ${s.name.toUpperCase()} ===\n\n${generatedSections[s.id]}`)
      .join('\n\n\n');
    if (!fullText) return;
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vsl-script-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card shrink-0">
        <div className="flex items-center h-12 px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5 mr-3">
            <Home className="w-3.5 h-3.5" /> Inicio
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <h1 className="font-semibold text-sm">VSL Maker</h1>
          </div>
          {generatingProgress && (
            <div className="flex items-center gap-2 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
              <span className="text-violet-600 font-medium">
                Generando {generatingProgress.current}/{generatingProgress.total}: {generatingProgress.name}
              </span>
            </div>
          )}
          {!generatingProgress && generatedCount > 0 && (
            <span className="text-xs text-muted-foreground">{generatedCount}/12 secciones</span>
          )}
        </div>
      </header>

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left Panel ────────────────────────────────── */}
        <div className="w-[420px] shrink-0 border-r flex flex-col">
          {/* Mode tabs */}
          <div className="flex border-b shrink-0">
            <button
              onClick={() => setMode('full')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2',
                mode === 'full'
                  ? 'border-violet-500 text-violet-700 bg-violet-50/50'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Zap className="w-3.5 h-3.5" /> VSL Completo
            </button>
            <button
              onClick={() => setMode('section')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2',
                mode === 'section'
                  ? 'border-violet-500 text-violet-700 bg-violet-50/50'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <ListChecks className="w-3.5 h-3.5" /> Sección por sección
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ── Project History ──────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowProjects(!showProjects)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                >
                  <FolderOpen className="w-3 h-3" />
                  Proyectos VSL
                  <ChevronDown className={cn('w-3 h-3 transition-transform', !showProjects && '-rotate-90')} />
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startNewProject}
                  className="h-6 px-2 text-xs gap-1 text-violet-600 hover:text-violet-700"
                >
                  <Plus className="w-3 h-3" /> Nuevo
                </Button>
              </div>

              {showProjects && (
                <div className="space-y-1.5">
                  {isLoadingProjects ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> Cargando proyectos...
                    </div>
                  ) : projects.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-1">Sin proyectos guardados</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {projects.map(p => {
                        const sCount = Object.keys(p.generated_sections || {}).length;
                        const isActive = activeProjectId === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => loadProject(p)}
                            className={cn(
                              'group/card relative flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg border text-left text-xs transition-colors max-w-[200px]',
                              isActive
                                ? 'border-violet-300 bg-violet-50 text-violet-700'
                                : 'border-border hover:border-violet-200 hover:bg-muted/50',
                            )}
                          >
                            <span className="font-medium truncate w-full pr-4">{p.project_name}</span>
                            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(p.updated_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                              <span className="text-violet-500 font-medium">{sCount}/12</span>
                            </span>
                            <button
                              onClick={(e) => deleteProject(p.id, e)}
                              className="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover/card:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                              title="Eliminar proyecto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DNA Selection (shared) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Campaign DNA
              </label>
              <div className="space-y-2">
                {DNA_CONFIG.map(config => (
                  <DnaSelector
                    key={config.type}
                    dnaType={config.type}
                    config={config}
                    allDnas={dnas ?? []}
                    selected={selectedDnas[config.type]}
                    onSelect={(dna) => setSelectedDnas(prev => ({ ...prev, [config.type]: dna }))}
                  />
                ))}
              </div>
              {!hasAnyDna && !dnasLoading && (
                <button
                  onClick={() => navigate('/dnas')}
                  className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium mt-1"
                >
                  <AlertCircle className="w-3 h-3" /> Crea tus DNAs primero
                </button>
              )}
            </div>

            {/* Section selector (section mode only) */}
            {mode === 'section' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Sección del VSL <span className="text-destructive">*</span>
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background"
                >
                  {VSL_SECTIONS.map((section, i) => (
                    <option key={section.id} value={section.id}>
                      {generatedSections[section.id] ? '✅ ' : ''}Sección #{i + 1} — {section.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {currentSection.objective.slice(0, 120)}...
                </p>
              </div>
            )}

            {/* Instructions (shared) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Instrucciones del producto y oferta
              </label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={`Describe tu producto y oferta:\n\n- ¿Qué vendes? (curso, servicio, coaching...)\n- ¿Cuánto cuesta?\n- ¿Qué bonos incluye?\n- ¿Qué garantía ofreces?\n- ¿Urgencia o escasez real?`}
                rows={mode === 'full' ? 5 : 7}
                className="resize-none text-sm"
                disabled={isBusy}
              />
            </div>

            {/* Reference link (shared) */}
            <div className="space-y-2">
              {!showLinkInput ? (
                <button
                  onClick={() => setShowLinkInput(true)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-dashed rounded-lg px-3 py-2.5 w-full"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Importar desde link (YouTube, TikTok, Reels)
                </button>
              ) : (
                <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium flex items-center gap-1.5">
                      <Link className="w-3 h-3 text-violet-500" />
                      Material de referencia
                    </label>
                    <button onClick={() => { setShowLinkInput(false); setReferenceUrl(''); setReferenceText(''); setRefError(''); }} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={referenceUrl}
                      onChange={(e) => setReferenceUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetchReference(); } }}
                      placeholder="https://youtube.com/watch?v=..."
                      className="flex-1 h-8 px-2.5 text-xs rounded-md border border-input bg-background"
                    />
                    <Button size="sm" variant="outline" onClick={handleFetchReference} disabled={!referenceUrl.trim() || isFetchingRef} className="h-8 text-xs">
                      {isFetchingRef ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Obtener'}
                    </Button>
                  </div>
                  {referenceText && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1.5">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Transcripción cargada ({Math.round(referenceText.length / 1000)}k caracteres)</span>
                    </div>
                  )}
                  {refError && <p className="text-xs text-destructive">{refError}</p>}
                </div>
              )}
            </div>

            {/* ── Full mode: Chat area ──────────────────────── */}
            {mode === 'full' && chatMessages.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <MessageCircle className="w-3 h-3" /> Conversación con Hooq
                </label>
                <div className="border rounded-lg bg-card max-h-64 overflow-y-auto p-3 space-y-3">
                  {chatMessages.map((msg, i) => (
                    <ChatBubble key={i} msg={msg} />
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input (only if not yet complete and not generating) */}
                {!isInfoComplete && !generatingProgress && (
                  <div className="flex gap-2">
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChatAnswer(); }
                      }}
                      placeholder="Escribe tu respuesta..."
                      rows={2}
                      className="resize-none text-sm flex-1"
                      disabled={isValidating}
                    />
                    <Button
                      size="sm"
                      onClick={handleSendChatAnswer}
                      disabled={!chatInput.trim() || isValidating}
                      className="h-auto px-3 bg-violet-600 hover:bg-violet-700"
                    >
                      {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom action button */}
          <div className="p-4 border-t bg-card shrink-0">
            {mode === 'section' ? (
              /* Section-by-section: generate one */
              <>
                <Button
                  onClick={handleGenerateSection}
                  disabled={!hasAnyDna || isGenerating}
                  className="w-full h-10 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generando Sección #{currentSectionIndex + 1}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {generatedSections[selectedSection] ? 'Regenerar' : 'Generar'} Sección #{currentSectionIndex + 1}
                    </>
                  )}
                </Button>
                {isGenerating && (
                  <p className="text-[11px] text-center text-muted-foreground mt-2">
                    Esto puede tomar 15-30 segundos.
                  </p>
                )}
              </>
            ) : (
              /* Full VSL mode */
              <>
                {!isInfoComplete ? (
                  <Button
                    onClick={handleValidate}
                    disabled={!hasAnyDna || isValidating || !!generatingProgress}
                    className="w-full h-10 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold gap-2"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validando información...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Validar y generar
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerateFullVsl}
                    disabled={!hasAnyDna || !!generatingProgress}
                    className="w-full h-10 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold gap-2"
                  >
                    {generatingProgress ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generando {generatingProgress.current}/{generatingProgress.total}...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Generar VSL Completo (12 secciones)
                      </>
                    )}
                  </Button>
                )}
                {generatingProgress && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>{generatingProgress.name}</span>
                      <span>{generatingProgress.current}/{generatingProgress.total}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${(generatingProgress.current / generatingProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {!generatingProgress && !isInfoComplete && (
                  <p className="text-[11px] text-center text-muted-foreground mt-2">
                    Hooq verificará que tienes toda la info necesaria antes de generar.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right Panel: Document ──────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Document header */}
          <div className="flex items-center justify-between px-4 h-10 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Documento</span>
            </div>
            {generatedCount > 0 && (
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={copyAll} className="h-7 text-xs gap-1">
                  {copiedAll ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copiedAll ? 'Copiado' : 'Copiar todo'}
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadAll} className="h-7 text-xs gap-1">
                  <Download className="w-3 h-3" /> Descargar
                </Button>
              </div>
            )}
          </div>

          {/* Document content */}
          <div ref={documentRef} className="flex-1 overflow-y-auto">
            {generatedCount === 0 && !generatingProgress ? (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                  <div className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-violet-400" />
                  </div>
                  <p className="font-medium text-foreground mb-2">Tu VSL aparecerá aquí</p>
                  <p className="text-sm text-muted-foreground">
                    {mode === 'full'
                      ? 'Selecciona tus DNAs, escribe las instrucciones y haz clic en "Validar y generar" para crear el VSL completo.'
                      : 'Selecciona tus DNAs, elige una sección y haz clic en Generar.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6 max-w-3xl">
                {VSL_SECTIONS.map((section, i) => {
                  const content = generatedSections[section.id];
                  const isCurrentlyGenerating = generatingProgress?.current === i + 1 && !content;

                  if (!content && !isCurrentlyGenerating) return null;

                  return (
                    <div key={section.id} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Sección {i + 1}: {section.name}
                        </h3>
                        {content && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => copySection(section.id)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Copiar sección"
                            >
                              {copiedSection === section.id
                                ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                                : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => { setMode('section'); setSelectedSection(section.id); }}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Regenerar esta sección"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isCurrentlyGenerating ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                          <span>Generando...</span>
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
                          {content}
                        </div>
                      )}

                      {i < VSL_SECTIONS.filter(s => generatedSections[s.id]).length - 1 && (
                        <hr className="mt-6 border-border" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
