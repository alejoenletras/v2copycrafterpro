import { useState } from 'react';
import { ChevronDown, Mic, Users, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DnaBarProps {
  dnas: Array<{ id: string; name: string; type: string }>;
  personalityId: string;
  audienceId: string;
  productId: string;
  onPersonalityChange: (id: string) => void;
  onAudienceChange: (id: string) => void;
  onProductChange: (id: string) => void;
}

function MiniSelector({
  type,
  label,
  Icon,
  color,
  dnas,
  selectedId,
  onSelect,
}: {
  type: string;
  label: string;
  Icon: React.ElementType;
  color: string;
  dnas: Array<{ id: string; name: string; type: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const filtered = dnas.filter(d => d.type === type);
  const selected = filtered.find(d => d.id === selectedId);

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
      <div className="relative min-w-0 flex-1">
        <select
          value={selectedId}
          onChange={e => onSelect(e.target.value)}
          className="w-full text-xs border border-input rounded-md pl-2 pr-6 py-1.5 bg-background appearance-none truncate focus:outline-none focus:ring-1 focus:ring-violet-400"
          title={selected?.name || label}
        >
          <option value="">— {label} —</option>
          {filtered.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

export default function DnaBar({
  dnas,
  personalityId,
  audienceId,
  productId,
  onPersonalityChange,
  onAudienceChange,
  onProductChange,
}: DnaBarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border-b border-border bg-card">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-2 flex items-center justify-between text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
      >
        <span className="font-medium">DNA del Experto</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', collapsed && '-rotate-90')} />
      </button>
      {!collapsed && (
        <div className="px-4 pb-3 grid grid-cols-3 gap-3">
          <MiniSelector
            type="expert" label="Personalidad" Icon={Mic} color="text-violet-600"
            dnas={dnas} selectedId={personalityId} onSelect={onPersonalityChange}
          />
          <MiniSelector
            type="audience" label="Audiencia" Icon={Users} color="text-blue-600"
            dnas={dnas} selectedId={audienceId} onSelect={onAudienceChange}
          />
          <MiniSelector
            type="product" label="Producto" Icon={Package} color="text-emerald-600"
            dnas={dnas} selectedId={productId} onSelect={onProductChange}
          />
        </div>
      )}
    </div>
  );
}
