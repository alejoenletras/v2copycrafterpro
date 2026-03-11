import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReferentes } from '@/hooks/useReferentes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Home, Plus, Pencil, Trash2, Loader2, Users2, Instagram, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Referente, ReferenteIgStatus, ReferenteTikTokStatus } from '@/types';

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
  const { referentes, isLoading, createReferente, isCreating, updateReferente, isUpdating, deleteReferente } = useReferentes();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Referente | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Instagram</th>
                  <th className="px-4 py-3 font-medium">TikTok</th>
                  <th className="px-4 py-3 font-medium">Facebook</th>
                  <th className="px-4 py-3 font-medium w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {referentes.map((ref) => (
                  <tr key={ref.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{ref.name}</p>
                      {ref.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{ref.description}</p>
                      )}
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing(ref)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(ref.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
