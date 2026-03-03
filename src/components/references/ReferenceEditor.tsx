import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, Trash2, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReferenceScript, ReferenceCategory } from '@/types';

const CATEGORIES: { value: ReferenceCategory; label: string }[] = [
  { value: 'ad', label: 'Anuncio' },
  { value: 'vsl', label: 'VSL' },
  { value: 'email', label: 'Email' },
  { value: 'landing', label: 'Landing' },
  { value: 'other', label: 'Otro' },
];

interface ReferenceEditorProps {
  reference?: ReferenceScript;
  onSave: (data: {
    name: string;
    category: ReferenceCategory;
    content: string;
    source_url?: string;
    source_author?: string;
    tags?: string[];
    notes?: string;
  }) => void;
  onUpdate?: (id: string, updates: Record<string, any>) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
  onClose: () => void;
  isNew?: boolean;
}

export default function ReferenceEditor({
  reference,
  onSave,
  onUpdate,
  onDelete,
  onToggleFavorite,
  onClose,
  isNew = false,
}: ReferenceEditorProps) {
  const [name, setName] = useState(reference?.name || '');
  const [category, setCategory] = useState<ReferenceCategory>(reference?.category || 'ad');
  const [content, setContent] = useState(reference?.content || '');
  const [sourceUrl, setSourceUrl] = useState(reference?.source_url || '');
  const [sourceAuthor, setSourceAuthor] = useState(reference?.source_author || '');
  const [notes, setNotes] = useState(reference?.notes || '');
  const [tags, setTags] = useState<string[]>(reference?.tags || []);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (reference) {
      setName(reference.name);
      setCategory(reference.category);
      setContent(reference.content);
      setSourceUrl(reference.source_url || '');
      setSourceAuthor(reference.source_author || '');
      setNotes(reference.notes || '');
      setTags(reference.tags || []);
    }
  }, [reference?.id]);

  const handleSave = () => {
    if (!name.trim() || !content.trim()) return;

    if (isNew) {
      onSave({
        name: name.trim(),
        category,
        content: content.trim(),
        source_url: sourceUrl.trim() || undefined,
        source_author: sourceAuthor.trim() || undefined,
        tags,
        notes: notes.trim() || undefined,
      });
    } else if (reference && onUpdate) {
      onUpdate(reference.id, {
        name: name.trim(),
        category,
        content: content.trim(),
        source_url: sourceUrl.trim() || null,
        source_author: sourceAuthor.trim() || null,
        tags,
        notes: notes.trim() || null,
      });
    }
    onClose();
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setNewTag('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">
          {isNew ? 'Nueva referencia' : 'Editar referencia'}
        </h3>
        <div className="flex items-center gap-1">
          {reference && onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(reference.id, !reference.is_favorite)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <Star className={cn('w-4 h-4', reference.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
            </button>
          )}
          {reference && onDelete && (
            <button
              onClick={() => { onDelete(reference.id); onClose(); }}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Nombre</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del script de referencia" className="text-sm" />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Categoría</label>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md border font-medium transition-all',
                  category === c.value
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'border-border text-muted-foreground hover:border-violet-300'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Contenido del script</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Pega aquí el texto completo del guión o anuncio de referencia..."
            className="text-sm min-h-[200px] resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">URL origen</label>
            <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." className="text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Autor</label>
            <Input value={sourceAuthor} onChange={(e) => setSourceAuthor(e.target.value)} placeholder="Nombre del creador" className="text-xs" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                {tag}
                <button
                  onClick={() => setTags(tags.filter(t => t !== tag))}
                  className="hover:text-destructive"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Agregar tag..."
              className="text-xs h-7 flex-1"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button onClick={addTag} size="sm" variant="outline" className="h-7 px-2 text-xs">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Notas</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="¿Por qué es una buena referencia? ¿Qué técnica usa?"
            className="text-xs min-h-[60px]"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
        <Button onClick={onClose} variant="ghost" size="sm" className="text-xs">
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || !content.trim()}
          size="sm"
          className="bg-violet-600 hover:bg-violet-700 text-white text-xs"
        >
          {isNew ? 'Crear referencia' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}
