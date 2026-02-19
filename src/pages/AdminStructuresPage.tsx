import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContentGeneratorStore } from '@/store/contentGeneratorStore';
import { ContentStructure, ContentType } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Plus, Edit2, Trash2, Eye, EyeOff, Save, X, Loader2, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const BASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

const TYPE_LABELS: Record<ContentType, string> = {
  'vsl': 'VSL',
  'webinar': 'Webinar',
  'facebook-ad': 'Anuncio Meta',
  'youtube-ad': 'Anuncio YouTube',
  'email': 'Email',
};

export default function AdminStructuresPage() {
  const navigate = useNavigate();
  const { structures, loadStructures, isLoadingStructures } = useContentGeneratorStore();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ContentStructure>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => { loadStructures(); }, []);

  const handleEdit = (s: ContentStructure) => {
    setEditingId(s.id);
    setEditForm({ ...s });
  };

  const handleCancel = () => { setEditingId(null); setEditForm({}); };

  const handleSave = async () => {
    if (!editingId || !editForm.name || !editForm.type) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('content_structures')
        .update({
          name: editForm.name,
          type: editForm.type,
          description: editForm.description,
          target_audiences: editForm.targetAudiences ?? [],
          blocks: editForm.blocks ?? [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);
      if (error) throw error;
      toast({ title: 'Estructura actualizada' });
      setEditingId(null);
      loadStructures();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (s: ContentStructure) => {
    const { error } = await supabase
      .from('content_structures')
      .update({ is_active: !s.isActive, updated_at: new Date().toISOString() })
      .eq('id', s.id);
    if (!error) loadStructures();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta estructura permanentemente?')) return;
    const { error } = await supabase.from('content_structures').delete().eq('id', id);
    if (!error) { toast({ title: 'Estructura eliminada' }); loadStructures(); }
  };

  const handleReseed = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch(`${BASE_URL}/functions/v1/fetch-structures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}`, 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ action: 'seed' }),
      });
      const data = await res.json();
      if (data.success) { toast({ title: 'Estructuras iniciales restauradas' }); loadStructures(); }
      else toast({ title: 'Error', description: data.error, variant: 'destructive' });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Inicio
          </Button>
          <h1 className="font-bold text-lg">Admin — Estructuras de Contenido</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReseed} disabled={isSeeding}>
              {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              Restaurar iniciales
            </Button>
            <Button size="sm" onClick={loadStructures} variant="outline">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {isLoadingStructures && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        )}

        {structures.map((s) => (
          <Card key={s.id} className="p-5">
            {editingId === s.id ? (
              // Edit form
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nombre</Label>
                    <Input value={editForm.name ?? ''} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select value={editForm.type} onValueChange={(v) => setEditForm(f => ({ ...f, type: v as ContentType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Descripción</Label>
                  <Textarea
                    value={editForm.description ?? ''}
                    onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Audiencias objetivo (separadas por coma)</Label>
                  <Input
                    value={(editForm.targetAudiences ?? []).join(', ')}
                    onChange={(e) => setEditForm(f => ({ ...f, targetAudiences: e.target.value.split(',').map(a => a.trim()).filter(Boolean) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bloques (JSON)</Label>
                  <Textarea
                    value={JSON.stringify(editForm.blocks ?? [], null, 2)}
                    onChange={(e) => { try { setEditForm(f => ({ ...f, blocks: JSON.parse(e.target.value) })); } catch {} }}
                    rows={10}
                    className="resize-none font-mono text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Guardar
                  </Button>
                </div>
              </div>
            ) : (
              // View mode
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{s.name}</h3>
                    <Badge variant="secondary" className="text-xs">{TYPE_LABELS[s.type] ?? s.type}</Badge>
                    <Badge variant="outline" className="text-xs">{s.blocks.length} bloques</Badge>
                    {!s.isActive && <Badge variant="destructive" className="text-xs">Inactiva</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
                  {s.targetAudiences?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.targetAudiences.map((a) => (
                        <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleToggleActive(s)} title={s.isActive ? 'Desactivar' : 'Activar'}>
                    {s.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(s)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}

        {structures.length === 0 && !isLoadingStructures && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="mb-4">No hay estructuras. Restaura las iniciales para empezar.</p>
            <Button onClick={handleReseed} disabled={isSeeding}>
              {isSeeding ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Cargar estructuras iniciales
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
