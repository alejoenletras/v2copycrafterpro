import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReferences } from '@/hooks/useReferences';
import ReferenceEditor from '@/components/references/ReferenceEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Home, BookOpen, Plus, Star, Search, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReferenceCategory, ReferenceScript } from '@/types';

const CATEGORIES: { value: ReferenceCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'ad', label: 'Anuncios' },
  { value: 'vsl', label: 'VSL' },
  { value: 'email', label: 'Email' },
  { value: 'landing', label: 'Landing' },
  { value: 'other', label: 'Otro' },
];

export default function ReferencesPage() {
  const navigate = useNavigate();
  const { references, isLoading, createReference, updateReference, deleteReference, toggleFavorite } = useReferences();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterCategory, setFilterCategory] = useState<ReferenceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = (references || []).filter((ref: any) => {
    if (filterCategory !== 'all' && ref.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ref.name.toLowerCase().includes(q) ||
        ref.content.toLowerCase().includes(q) ||
        ref.tags?.some((t: string) => t.toLowerCase().includes(q)) ||
        ref.source_author?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedRef = references?.find((r: any) => r.id === selectedId) as ReferenceScript | undefined;

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
            <BookOpen className="w-4 h-4 text-violet-600" />
            <span className="font-semibold text-sm text-foreground">Biblioteca de Referencias</span>
          </div>
          <Badge variant="secondary" className="ml-2 text-xs">{filtered.length} refs</Badge>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: List */}
        <aside className="w-80 shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar referencias..."
                className="pl-8 text-xs h-8"
              />
            </div>

            {/* Category filter */}
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setFilterCategory(c.value)}
                  className={cn(
                    'text-xs px-2 py-1 rounded-md border transition-all',
                    filterCategory === c.value
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-border text-muted-foreground hover:border-violet-300'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* New button */}
            <Button
              onClick={() => { setIsCreating(true); setSelectedId(null); }}
              size="sm"
              className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1"
            >
              <Plus className="w-3 h-3" /> Nueva referencia
            </Button>

            {/* List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? 'Sin resultados' : 'No hay referencias aún'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((ref: any) => (
                  <button
                    key={ref.id}
                    onClick={() => { setSelectedId(ref.id); setIsCreating(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg border transition-all',
                      selectedId === ref.id
                        ? 'bg-violet-50 border-violet-300'
                        : 'border-transparent hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium truncate">{ref.name}</span>
                      {ref.is_favorite && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {ref.category}
                      </Badge>
                      {ref.source_author && (
                        <span className="text-[10px] text-muted-foreground truncate">{ref.source_author}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                      {ref.content.substring(0, 100)}...
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Right panel: Editor */}
        <main className="flex-1 overflow-hidden">
          {isCreating ? (
            <ReferenceEditor
              isNew
              onSave={(data) => createReference(data)}
              onClose={() => setIsCreating(false)}
            />
          ) : selectedRef ? (
            <ReferenceEditor
              reference={selectedRef}
              onSave={(data) => createReference(data)}
              onUpdate={(id, updates) => updateReference({ id, updates })}
              onDelete={(id) => { deleteReference(id); setSelectedId(null); }}
              onToggleFavorite={(id, isFavorite) => toggleFavorite({ id, isFavorite })}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="font-semibold text-lg text-foreground mb-2">Biblioteca de Referencias</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Guarda guiones propios y anuncios ganadores como referencia.
                La IA usará estos ejemplos para mejorar la calidad de los scripts generados.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
