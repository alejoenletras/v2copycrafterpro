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
import { Plus, Trash2, Pencil, Loader2, Users2, Link } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DnaReferenteRule } from '@/types';

// ─── Rule Form Dialog ─────────────────────────────────────────
interface RuleFormDialogProps {
  open: boolean;
  onClose: () => void;
  personalityDnaId: string;
  editing?: DnaReferenteRule | null;
  onSave: (data: { referente_id: string; what_to_model: string; what_to_filter: string; priority: number }) => Promise<void>;
  isSaving: boolean;
}

function RuleFormDialog({ open, onClose, personalityDnaId, editing, onSave, isSaving }: RuleFormDialogProps) {
  const { referentes } = useReferentes();
  const [referenteId, setReferenteId] = useState(editing?.referente_id ?? '');
  const [whatToModel, setWhatToModel] = useState(editing?.what_to_model ?? '');
  const [whatToFilter, setWhatToFilter] = useState(editing?.what_to_filter ?? '');
  const [priority, setPriority] = useState(editing?.priority ?? 5);

  const canSave = referenteId && whatToModel.trim() && whatToFilter.trim();

  const handleSave = async () => {
    if (!canSave) return;
    await onSave({ referente_id: referenteId, what_to_model: whatToModel, what_to_filter: whatToFilter, priority });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar regla de modelado' : 'Asignar referente'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">Referente *</label>
            {editing ? (
              <p className="text-sm mt-1 font-medium text-violet-700">{editing.referentes?.name}</p>
            ) : (
              <select
                className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-violet-400"
                value={referenteId}
                onChange={e => setReferenteId(e.target.value)}
              >
                <option value="">Seleccionar referente...</option>
                {referentes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">¿Qué MODELAR de este referente? *</label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1">
              Estructuras, frameworks, ángulos, ritmo, técnicas de persuasión que quieres tomar.
            </p>
            <Textarea
              rows={3}
              value={whatToModel}
              onChange={e => setWhatToModel(e.target.value)}
              placeholder="Modelar: estructura de diagnóstico rojo/verde, contraste visual entre el error y la solución, ritmo directo y confrontacional..."
              className="text-sm resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium">¿Qué FILTRAR de este referente? *</label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1">
              Qué NO tomar: tono, referencias culturales, claims que no aplican, etc.
            </p>
            <Textarea
              rows={3}
              value={whatToFilter}
              onChange={e => setWhatToFilter(e.target.value)}
              placeholder="Filtrar: tono agresivo tipo reality show, referencias a TV americana, lenguaje de confrontación directa con el cliente..."
              className="text-sm resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium flex items-center justify-between">
              Prioridad
              <span className="font-bold text-violet-700">{priority}/10</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={priority}
              onChange={e => setPriority(Number(e.target.value))}
              className="w-full mt-1 accent-violet-600"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Baja prioridad</span>
              <span>Alta prioridad</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {editing ? 'Guardar cambios' : 'Asignar referente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────
interface ReferentesTabProps {
  personalityDnaId: string;
}

export default function ReferentesTab({ personalityDnaId }: ReferentesTabProps) {
  const navigate = useNavigate();
  const { rules, isLoading, createRule, isCreating, updateRule, isUpdating, deleteRule } = useDnaReferenteRules(personalityDnaId);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<DnaReferenteRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async (data: { referente_id: string; what_to_model: string; what_to_filter: string; priority: number }) => {
    await createRule({ personality_dna_id: personalityDnaId, ...data });
  };

  const handleUpdate = async (data: { referente_id: string; what_to_model: string; what_to_filter: string; priority: number }) => {
    if (!editing) return;
    await updateRule({ id: editing.id, updates: { what_to_model: data.what_to_model, what_to_filter: data.what_to_filter, priority: data.priority } });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Referentes asignados a este DNA de personalidad. La IA modelará su contenido para generar guiones con tu voz.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/referentes')} className="gap-1.5 text-xs">
            <Link className="w-3.5 h-3.5" /> Gestionar referentes
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
            <Plus className="w-4 h-4" /> Asignar referente
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
          <Users2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground text-sm">Sin referentes asignados</p>
          <p className="text-xs mt-1 mb-4 max-w-xs mx-auto">
            Asigna referentes para que la IA sepa qué estructuras y frameworks modelar cuando genere guiones con este DNA.
          </p>
          <Button size="sm" onClick={() => setShowCreate(true)} variant="outline" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Asignar primer referente
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className="border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{rule.referentes?.name ?? '—'}</p>
                  <Badge variant="outline" className="text-xs">Prioridad {rule.priority}/10</Badge>
                  {!rule.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactivo</Badge>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing(rule)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(rule.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-emerald-700 mb-1">Modelar</p>
                  <p className="text-xs text-muted-foreground">{rule.what_to_model}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-red-600 mb-1">Filtrar</p>
                  <p className="text-xs text-muted-foreground">{rule.what_to_filter}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <RuleFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          personalityDnaId={personalityDnaId}
          onSave={handleCreate}
          isSaving={isCreating}
        />
      )}

      {/* Edit dialog */}
      {editing && (
        <RuleFormDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          personalityDnaId={personalityDnaId}
          editing={editing}
          onSave={handleUpdate}
          isSaving={isUpdating}
        />
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desasignar referente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la regla de modelado para este referente. El contenido scrapeado del referente permanecerá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) deleteRule(deleteId); setDeleteId(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desasignar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
