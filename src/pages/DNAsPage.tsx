import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDNAs } from '@/hooks/useDNAs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Home, Loader2, Mic, Users, Package, Star, Copy, Trash2,
  Pencil, Check, X, Sparkles, ChevronRight, AlertCircle,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { DNAType, DnaFieldStatus } from '@/types';

// ─── Field definitions per DNA type ──────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  rows: number;
}

const FIELDS: Record<DNAType, FieldDef[]> = {
  expert: [
    { key: 'about', label: '¿Quién eres?', placeholder: 'Tu historia, transformación personal, por qué haces lo que haces...', rows: 4 },
    { key: 'voice', label: 'Tu voz y estilo', placeholder: 'Tono (agresivo, cercano, técnico...), ritmo, palabras características, nivel de humor...', rows: 3 },
    { key: 'credentials', label: 'Credenciales y resultados', placeholder: 'Resultados obtenidos, certificaciones, casos de éxito concretos, números reales...', rows: 3 },
    { key: 'forbidden_words', label: 'Palabras prohibidas', placeholder: 'Palabras, frases y expresiones que NUNCA debes usar en tu comunicación...', rows: 2 },
  ],
  audience: [
    { key: 'ideal_client', label: '¿Quién es tu cliente ideal?', placeholder: 'Situación actual, perfil, nivel de consciencia, dónde está en su vida...', rows: 4 },
    { key: 'core_belief', label: 'Creencia o frustración central', placeholder: 'La creencia que los frena, la frustración que más les duele, el deseo que los mueve...', rows: 3 },
    { key: 'testimonials', label: 'Testimonios y prueba social', placeholder: 'Frases reales de clientes, historias de éxito específicas, resultados con nombres...', rows: 3 },
    { key: 'keywords', label: 'Palabras que ellos usan', placeholder: 'Jerga, expresiones y frases que tu audiencia usa naturalmente en conversaciones...', rows: 2 },
  ],
  product: [
    { key: 'main_problem', label: 'El problema que resuelves', placeholder: 'El problema específico y doloroso que tu producto o servicio resuelve...', rows: 4 },
    { key: 'solution_promise', label: 'La promesa de solución', placeholder: 'La transformación o resultado concreto que prometes al cliente, con tiempo estimado...', rows: 3 },
    { key: 'irresistible_offer', label: 'La oferta irresistible', placeholder: 'Precio, bonos, garantías, planes de pago, urgencia, escasez, todo lo que incluye...', rows: 3 },
    { key: 'keywords', label: 'Keywords del producto', placeholder: 'Términos del nicho, palabras de posicionamiento, keywords de marketing que usas...', rows: 2 },
  ],
};

const DNA_SECTIONS = [
  { type: 'expert' as DNAType, label: 'Personalidad', icon: Mic, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  { type: 'audience' as DNAType, label: 'Audiencia', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { type: 'product' as DNAType, label: 'Producto', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
];

// ─── Status indicator ─────────────────────────────────────────────────────────

function FieldStatusDot({ status }: { status: DnaFieldStatus }) {
  if (status === 'validated') return <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Validado" />;
  if (status === 'ai_suggested') return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Sugerencia IA — edita para validar" />;
  return <span className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" title="Vacío" />;
}

// ─── DNA Field with AI button ────────────────────────────────────────────────

interface DnaFieldProps {
  fieldDef: FieldDef;
  value: string;
  status: DnaFieldStatus;
  isImproving: boolean;
  onChangeValue: (v: string) => void;
  onImprove: () => void;
}

function DnaField({ fieldDef, value, status, isImproving, onChangeValue, onImprove }: DnaFieldProps) {
  const handleChange = (v: string) => {
    onChangeValue(v);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <FieldStatusDot status={status} />
        <label className="text-sm font-medium text-foreground">{fieldDef.label}</label>
        {status === 'ai_suggested' && (
          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 h-4 px-1">IA</Badge>
        )}
      </div>
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={fieldDef.placeholder}
          rows={fieldDef.rows}
          className={cn(
            'resize-none text-sm pr-10',
            status === 'validated' && 'border-blue-300 focus-visible:ring-blue-300',
            status === 'ai_suggested' && 'border-amber-300 focus-visible:ring-amber-300 bg-amber-50/30',
          )}
        />
        <button
          type="button"
          onClick={onImprove}
          disabled={isImproving}
          className="absolute right-2 top-2 p-1 rounded text-muted-foreground hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-50"
          title={value.trim() ? 'Mejorar con IA' : 'Crear con IA'}
        >
          {isImproving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DNAsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { dnas, isLoading, createDNAAsync, updateDNAAsync, deleteDNA, isDeleting, setDefault, unsetDefault, duplicateDNA } = useDNAs();

  const [selectedDna, setSelectedDna] = useState<any | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [fieldStatus, setFieldStatus] = useState<Record<string, DnaFieldStatus>>({});
  const [improvingField, setImprovingField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const BASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  // Load DNA into form when selected
  useEffect(() => {
    if (!selectedDna) return;
    const data = selectedDna.data ?? {};
    const status = data._status ?? {};
    const fields: Record<string, string> = {};
    const statuses: Record<string, DnaFieldStatus> = {};
    const defs = FIELDS[selectedDna.type as DNAType] ?? [];
    for (const f of defs) {
      fields[f.key] = data[f.key] ?? '';
      statuses[f.key] = status[f.key] ?? (data[f.key]?.trim() ? 'validated' : 'empty');
    }
    setFormData(fields);
    setFieldStatus(statuses);
  }, [selectedDna?.id]);

  // Auto-save with debounce
  const scheduleAutoSave = (newData: Record<string, string>, newStatus: Record<string, DnaFieldStatus>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveToDb(newData, newStatus), 1500);
  };

  const saveToDb = async (data: Record<string, string>, status: Record<string, DnaFieldStatus>) => {
    if (!selectedDna) return;
    setIsSaving(true);
    try {
      await updateDNAAsync({
        id: selectedDna.id,
        updates: { data: { ...data, _status: status } },
      });
    } catch (_) {
      // toast shown by hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    const newData = { ...formData, [key]: value };
    const newStatus = {
      ...fieldStatus,
      [key]: value.trim()
        ? (fieldStatus[key] === 'ai_suggested' ? 'validated' : fieldStatus[key] || 'validated')
        : 'empty',
    } as Record<string, DnaFieldStatus>;
    // If editing an ai_suggested field → mark as validated
    if (fieldStatus[key] === 'ai_suggested' && value.trim()) {
      newStatus[key] = 'validated';
    }
    setFormData(newData);
    setFieldStatus(newStatus);
    scheduleAutoSave(newData, newStatus);
  };

  const handleImproveField = async (fieldKey: string, fieldLabel: string) => {
    if (!selectedDna) return;
    setImprovingField(fieldKey);
    try {
      const otherFields: Record<string, string> = {};
      for (const [k, v] of Object.entries(formData)) {
        if (k !== fieldKey && v?.trim()) otherFields[k] = v;
      }

      const res = await fetch(`${BASE_URL}/functions/v1/improve-dna-field`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify({
          dna_type: selectedDna.type,
          field_key: fieldKey,
          field_label: fieldLabel,
          current_value: formData[fieldKey] ?? '',
          other_fields: otherFields,
        }),
      });

      const data = await res.json();
      if (data.success && data.suggested_content) {
        const newData = { ...formData, [fieldKey]: data.suggested_content };
        const newStatus = { ...fieldStatus, [fieldKey]: 'ai_suggested' as DnaFieldStatus };
        setFormData(newData);
        setFieldStatus(newStatus);
        scheduleAutoSave(newData, newStatus);
      } else {
        toast({ title: 'Error', description: data.error ?? 'No se pudo generar sugerencia', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setImprovingField(null);
    }
  };

  const handleCreateDna = async (type: DNAType) => {
    const typeLabel = DNA_SECTIONS.find(s => s.type === type)?.label ?? type;
    try {
      const created = await createDNAAsync({
        type,
        name: `${typeLabel} Sin título`,
        data: {},
      });
      setSelectedDna(created);
    } catch (_) { /* hook shows toast */ }
  };

  const handleRenameConfirm = async () => {
    if (!selectedDna || !tempName.trim()) return;
    setEditingName(false);
    try {
      await updateDNAAsync({ id: selectedDna.id, updates: { name: tempName.trim() } });
      setSelectedDna((prev: any) => ({ ...prev, name: tempName.trim() }));
    } catch (_) { /* hook shows toast */ }
  };

  const handleToggleDefault = () => {
    if (!selectedDna) return;
    if (selectedDna.is_default) {
      unsetDefault(selectedDna.id);
      setSelectedDna((prev: any) => ({ ...prev, is_default: false }));
    } else {
      setDefault({ id: selectedDna.id, dnaType: selectedDna.type });
      setSelectedDna((prev: any) => ({ ...prev, is_default: true }));
    }
  };

  const handleDuplicate = () => {
    if (!selectedDna) return;
    duplicateDNA(selectedDna.id);
  };

  const handleDelete = () => {
    if (!selectedDna) return;
    setDeleteId(selectedDna.id);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteDNA(deleteId);
    setDeleteId(null);
    setSelectedDna(null);
  };

  const expertDnas = dnas?.filter(d => d.type === 'expert') ?? [];
  const audienceDnas = dnas?.filter(d => d.type === 'audience') ?? [];
  const productDnas = dnas?.filter(d => d.type === 'product') ?? [];
  const dnaBySectionType: Record<DNAType, any[]> = { expert: expertDnas, audience: audienceDnas, product: productDnas };

  const completedCount = selectedDna
    ? Object.values(fieldStatus).filter(s => s === 'validated' || s === 'ai_suggested').length
    : 0;
  const totalFields = selectedDna ? (FIELDS[selectedDna.type as DNAType]?.length ?? 0) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-1" /> Inicio
          </Button>
          <h1 className="font-display font-bold text-lg">DNAs de Campana</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Define Personalidad, Audiencia y Producto para usarlos en el generador</p>
        </div>
      </header>

      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 py-6 gap-6">
        {/* ── Sidebar ────────────────────────────────── */}
        <aside className="w-64 shrink-0 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            DNA_SECTIONS.map((section) => {
              const Icon = section.icon;
              const list = dnaBySectionType[section.type];
              return (
                <div key={section.type}>
                  <div className={cn('flex items-center gap-2 px-2 py-1.5 rounded-t-lg text-xs font-semibold uppercase tracking-wide', section.color, section.bg)}>
                    <Icon className="w-3.5 h-3.5" />
                    {section.label}
                  </div>
                  <div className={cn('border rounded-b-lg overflow-hidden', section.border)}>
                    {list.map((dna) => (
                      <button
                        key={dna.id}
                        onClick={() => setSelectedDna(dna)}
                        className={cn(
                          'w-full text-left flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/60',
                          selectedDna?.id === dna.id && 'bg-muted font-medium',
                        )}
                      >
                        <span className="flex-1 truncate">{dna.name}</span>
                        {dna.is_default && <Star className="w-3 h-3 text-amber-500 shrink-0 fill-amber-400" />}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                      </button>
                    ))}
                    {list.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground italic">Sin perfiles</p>
                    )}
                    <button
                      onClick={() => handleCreateDna(section.type)}
                      className={cn(
                        'w-full flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border-t',
                        section.border,
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" /> Nuevo {section.label}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </aside>

        {/* ── Main panel ─────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {!selectedDna ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Mic className="w-7 h-7" />
              </div>
              <p className="font-semibold text-foreground mb-1">Selecciona o crea un DNA</p>
              <p className="text-sm max-w-xs">
                Cada DNA captura la esencia de tu personalidad, audiencia y producto para que la IA genere copy con tu voz.
              </p>
              <div className="flex gap-2 mt-6">
                {DNA_SECTIONS.map(s => (
                  <Button key={s.type} variant="outline" size="sm" onClick={() => handleCreateDna(s.type)} className="gap-1">
                    <Plus className="w-3.5 h-3.5" /> {s.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Panel header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setEditingName(false); }}
                        className="text-xl font-bold bg-transparent border-b-2 border-violet-400 outline-none flex-1 min-w-0"
                      />
                      <Button size="sm" variant="ghost" onClick={handleRenameConfirm}><Check className="w-4 h-4 text-emerald-600" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}><X className="w-4 h-4" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold truncate">{selectedDna.name}</h2>
                      <button onClick={() => { setTempName(selectedDna.name); setEditingName(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{DNA_SECTIONS.find(s => s.type === selectedDna.type)?.label}</span>
                    <span>·</span>
                    <span>{completedCount}/{totalFields} campos completados</span>
                    {isSaving && <span className="text-violet-500">Guardando...</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant={selectedDna.is_default ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleToggleDefault}
                    className={cn('gap-1.5', selectedDna.is_default && 'bg-amber-500 hover:bg-amber-600 border-amber-500')}
                  >
                    <Star className={cn('w-3.5 h-3.5', selectedDna.is_default && 'fill-white')} />
                    {selectedDna.is_default ? 'Predeterminado' : 'Marcar default'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDuplicate} title="Duplicar"><Copy className="w-3.5 h-3.5" /></Button>
                  <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Validado</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Sugerencia IA (edita para validar)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Vacío</span>
                <span className="flex items-center gap-1.5 ml-auto"><Sparkles className="w-3 h-3 text-violet-500" /> Ícono = generar/mejorar con IA</span>
              </div>

              {/* ai_suggested warning if any */}
              {Object.values(fieldStatus).some(s => s === 'ai_suggested') && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Hay campos con sugerencias de IA (en amarillo). Edítalos y personalízalos para que sean turos — se marcarán en azul automáticamente.</span>
                </div>
              )}

              {/* Fields */}
              <div className="space-y-5">
                {(FIELDS[selectedDna.type as DNAType] ?? []).map((field) => (
                  <DnaField
                    key={field.key}
                    fieldDef={field}
                    value={formData[field.key] ?? ''}
                    status={fieldStatus[field.key] ?? 'empty'}
                    isImproving={improvingField === field.key}
                    onChangeValue={(v) => handleFieldChange(field.key, v)}
                    onImprove={() => handleImproveField(field.key, field.label)}
                  />
                ))}
              </div>

              {/* Save button (manual fallback) */}
              <div className="pt-2 border-t flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Los cambios se guardan automáticamente.</p>
                <Button
                  size="sm"
                  onClick={() => saveToDb(formData, fieldStatus)}
                  disabled={isSaving}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                  Guardar ahora
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar DNA?</AlertDialogTitle>
            <AlertDialogDescription>
              Este perfil se eliminará permanentemente. Los proyectos que lo usaron no se verán afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
