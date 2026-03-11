import { useState } from 'react';
import { useDnaReferenteRules } from '@/hooks/useDnaReferenteRules';
import { useReferentes } from '@/hooks/useReferentes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Pencil, Loader2, Users2, Link, RefreshCw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DnaReferenteRule } from '@/types';

// ─── Alignment Score Badge ─────────────────────────────────────
function AlignmentBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  if (score >= 8) return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">Alta {score}/10</Badge>;
  if (score >= 5) return <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Media {score}/10</Badge>;
  return <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Baja {score}/10</Badge>;
}

// ─── Assign Dialog ─────────────────────────────────────────────
function AssignDialog({ open, onClose, onAssign, isAssigning, existingReferenteIds }: {
  open: boolean; onClose: () => void;
  onAssign: (referenteId: string) => Promise<void>;
  isAssigning: boolean; existingReferenteIds: string[];
}) {
  const { referentes } = useReferentes();
  const [referenteId, setReferenteId] = useState('');
  const available = referentes.filter(r => !existingReferenteIds.includes(r.id));

  const handleAssign = async () => {
    if (!referenteId) return;
    await onAssign(referenteId);
    setReferenteId('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" /> Asignar referente
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-700">
            La IA analizará la alineación con tu DNA y generará automáticamente las reglas de modelado.
          </div>
          <div>
            <label className="text-sm font-medium">Referente *</label>
            <select
              className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-violet-400"
              value={referenteId} onChange={e => setReferenteId(e.target.value)}
            >
              <option value="">Seleccionar referente...</option>
              {available.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {available.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Todos los referentes ya están asignados o no hay ninguno.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAssigning}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={!referenteId || isAssigning} className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
            {isAssigning ? <><Loader2 className="w-4 h-4 animate-spin" /> Analizando...</> : <><Sparkles className="w-4 h-4" /> Asignar con IA</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Rule Dialog ──────────────────────────────────────────
function EditDialog({ open, onClose, rule, onSave, isSaving }: {
  open: boolean; onClose: () => void; rule: DnaReferenteRule;
  onSave: (data: { what_to_model: string; what_to_filter: string; priority: number }) => Promise<void>;
  isSaving: boolean;
}) {
  const [whatToModel, setWhatToModel] = useState(rule.what_to_model ?? '');
  const [whatToFilter, setWhatToFilter] = useState(rule.what_to_filter ?? '');
  const [priority, setPriority] = useState(rule.priority ?? 5);
  const canSave = whatToModel.trim() && whatToFilter.trim();

  const handleSave = async () => {
    if (!canSave) return;
    await onSave({ what_to_model: whatToModel, what_to_filter: whatToFilter, priority });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar reglas — {rule.referentes?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">¿Qué MODELAR? *</label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1">Estructuras, frameworks, ángulos, ritmo, técnicas de persuasión.</p>
            <Textarea rows={4} value={whatToModel} onChange={e => setWhatToModel(e.target.value)} className="text-sm resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium">¿Qué FILTRAR? *</label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1">Qué NO tomar: tono, referencias, claims que no aplican.</p>
            <Textarea rows={4} value={whatToFilter} onChange={e => setWhatToFilter(e.target.value)} className="text-sm resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium flex items-center justify-between">
              Prioridad <span className="font-bold text-violet-700">{priority}/10</span>
            </label>
            <input type="range" min={1} max={10} value={priority} onChange={e => setPriority(Number(e.target.value))} className="w-full mt-1 accent-violet-600" />
            <div className="flex justify-between text-xs text-muted-foreground"><span>Baja</span><span>Alta</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving} className="bg-violet-600 hover:bg-violet-700 text-white">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Rule Card ─────────────────────────────────────────────────
function RuleCard({ rule, onEdit, onDelete, onRegenerate, isRegenerating }: {
  rule: DnaReferenteRule; onEdit: () => void; onDelete: () => void;
  onRegenerate: () => void; isRegenerating: boolean;
}) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm">{rule.referentes?.name ?? '—'}</p>
          <AlignmentBadge score={rule.alignment_score} />
          <Badge variant="outline" className="text-xs">P{rule.priority}/10</Badge>
          {!rule.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactivo</Badge>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={onRegenerate} disabled={isRegenerating} title="Regenerar con IA">
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {rule.alignment_analysis && (
        <div>
          <button onClick={() => setShowAnalysis(s => !s)} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium">
            {showAnalysis ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Análisis de alineación
          </button>
          {showAnalysis && <p className="text-xs text-muted-foreground mt-1 pl-4">{rule.alignment_analysis}</p>}
        </div>
      )}

      {(rule.what_to_model || rule.what_to_filter) ? (
        <div className="grid grid-cols-2 gap-3">
          {rule.what_to_model && <div><p className="text-xs font-medium text-emerald-700 mb-1">Modelar</p><p className="text-xs text-muted-foreground line-clamp-3">{rule.what_to_model}</p></div>}
          {rule.what_to_filter && <div><p className="text-xs font-medium text-red-600 mb-1">Filtrar</p><p className="text-xs text-muted-foreground line-clamp-3">{rule.what_to_filter}</p></div>}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando reglas con IA...
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export default function ReferentesTab({ personalityDnaId }: { personalityDnaId: string }) {
  const navigate = useNavigate();
  const { rules, isLoading, generateRules, isGenerating, updateRule, isUpdating, deleteRule, regenerateRules, isRegenerating } = useDnaReferenteRules(personalityDnaId);

  const [showAssign, setShowAssign] = useState(false);
  const [editing, setEditing] = useState<DnaReferenteRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const existingReferenteIds = rules.map(r => r.referente_id);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Referentes asignados. La IA genera las reglas de modelado automáticamente.</p>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/referentes')} className="gap-1.5 text-xs">
            <Link className="w-3.5 h-3.5" /> Gestionar referentes
          </Button>
          <Button size="sm" onClick={() => setShowAssign(true)} className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5" disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Asignar referente
          </Button>
        </div>
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-700">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          Analizando alineación con IA... esto puede tardar unos segundos.
        </div>
      )}

      {rules.length === 0 && !isGenerating ? (
        <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
          <Users2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground text-sm">Sin referentes asignados</p>
          <p className="text-xs mt-1 mb-4 max-w-xs mx-auto">Asigna referentes y la IA generará automáticamente las reglas de modelado.</p>
          <Button size="sm" onClick={() => setShowAssign(true)} variant="outline" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Asignar primer referente
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <RuleCard key={rule.id} rule={rule} onEdit={() => setEditing(rule)} onDelete={() => setDeleteId(rule.id)} onRegenerate={() => regenerateRules(rule)} isRegenerating={isRegenerating} />
          ))}
        </div>
      )}

      <AssignDialog open={showAssign} onClose={() => setShowAssign(false)} onAssign={r => generateRules({ personality_dna_id: personalityDnaId, referente_id: r })} isAssigning={isGenerating} existingReferenteIds={existingReferenteIds} />

      {editing && (
        <EditDialog open={!!editing} onClose={() => setEditing(null)} rule={editing}
          onSave={data => updateRule({ id: editing.id, updates: data })} isSaving={isUpdating} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desasignar referente?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará la regla de modelado. El contenido scrapeado permanecerá.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteRule(deleteId); setDeleteId(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desasignar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
