import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useReferents } from '@/hooks/useReferents';
import {
  Plus, X, UserCheck, UserX, ChevronDown, ChevronRight, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReferentPlatform } from '@/types';

const PLATFORMS: { value: ReferentPlatform; label: string; color: string }[] = [
  { value: 'facebook', label: 'Facebook', color: 'bg-blue-100 text-blue-700' },
  { value: 'instagram', label: 'Instagram', color: 'bg-fuchsia-100 text-fuchsia-700' },
  { value: 'tiktok', label: 'TikTok', color: 'bg-pink-100 text-pink-700' },
  { value: 'youtube', label: 'YouTube', color: 'bg-red-100 text-red-700' },
];

interface ReferentProfilesProps {
  onReferentsChange?: (names: string[]) => void;
}

export default function ReferentProfiles({ onReferentsChange }: ReferentProfilesProps) {
  const { referents, isLoading, createReferent, deleteReferent, toggleActive, isCreating } = useReferents();
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState<ReferentPlatform>('facebook');

  const activeCount = referents?.filter(r => r.is_active).length || 0;

  const handleAdd = () => {
    if (!newName.trim()) return;
    createReferent({
      name: newName.trim(),
      platform: newPlatform,
    });
    setNewName('');
    setAdding(false);

    // Notify parent of updated referent names
    if (onReferentsChange && referents) {
      const names = [...referents.filter(r => r.is_active).map(r => r.name), newName.trim()];
      onReferentsChange(names);
    }
  };

  const handleToggle = (id: string, isActive: boolean) => {
    toggleActive({ id, isActive });
    if (onReferentsChange && referents) {
      const updated = referents.map(r =>
        r.id === id ? { ...r, is_active: isActive } : r
      );
      onReferentsChange(updated.filter(r => r.is_active).map(r => r.name));
    }
  };

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 hover:text-foreground transition-colors"
      >
        <span>Referentes ({activeCount})</span>
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
            </div>
          ) : (
            <>
              {referents && referents.length > 0 ? (
                <div className="space-y-1.5">
                  {referents.map((ref) => (
                    <div
                      key={ref.id}
                      className={cn(
                        'flex items-center justify-between py-1.5 px-2 rounded-md text-xs transition-colors',
                        ref.is_active ? 'bg-violet-50 border border-violet-200' : 'bg-muted/50 border border-transparent opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => handleToggle(ref.id, !ref.is_active)}
                          className="shrink-0"
                        >
                          {ref.is_active
                            ? <UserCheck className="w-3.5 h-3.5 text-violet-600" />
                            : <UserX className="w-3.5 h-3.5 text-muted-foreground" />
                          }
                        </button>
                        <span className="truncate font-medium">{ref.name}</span>
                        <Badge className={cn('text-[10px] px-1 py-0',
                          PLATFORMS.find(p => p.value === ref.platform)?.color || 'bg-gray-100 text-gray-600'
                        )}>
                          {ref.platform}
                        </Badge>
                      </div>
                      <button
                        onClick={() => deleteReferent(ref.id)}
                        className="shrink-0 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-1">
                  No hay referentes. Agrega creadores cuyo estilo quieras estudiar.
                </p>
              )}

              {adding ? (
                <div className="space-y-2 pt-1">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nombre del referente"
                    className="text-xs h-8"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    autoFocus
                  />
                  <div className="flex gap-1 flex-wrap">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setNewPlatform(p.value)}
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded border transition-all',
                          newPlatform === p.value
                            ? `${p.color} border-current font-medium`
                            : 'border-border text-muted-foreground'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button onClick={handleAdd} size="sm" disabled={!newName.trim() || isCreating} className="text-xs h-7 px-2 bg-violet-600 hover:bg-violet-700 text-white">
                      Agregar
                    </Button>
                    <Button onClick={() => { setAdding(false); setNewName(''); }} size="sm" variant="ghost" className="text-xs h-7 px-2">
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium py-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Agregar referente
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
