import { cn } from '@/lib/utils';
import type { AdObjective } from '@/types';

interface ObjectiveSelectorProps {
  onSelect: (objective: AdObjective) => void;
  selected?: AdObjective;
  disabled?: boolean;
}

const OBJECTIVES: Array<{ value: AdObjective; label: string; icon: string; color: string }> = [
  { value: 'captacion', label: 'Captacion', icon: '🎯', color: 'hover:border-blue-400 hover:bg-blue-50' },
  { value: 'agitacion', label: 'Agitacion', icon: '🔥', color: 'hover:border-orange-400 hover:bg-orange-50' },
  { value: 'remarketing', label: 'Remarketing', icon: '🔄', color: 'hover:border-purple-400 hover:bg-purple-50' },
  { value: 'compra', label: 'Compra', icon: '💰', color: 'hover:border-emerald-400 hover:bg-emerald-50' },
  { value: 'reconocimiento', label: 'Reconocimiento', icon: '👁️', color: 'hover:border-violet-400 hover:bg-violet-50' },
];

export default function ObjectiveSelector({ onSelect, selected, disabled }: ObjectiveSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {OBJECTIVES.map((obj) => (
        <button
          key={obj.value}
          onClick={() => onSelect(obj.value)}
          disabled={disabled}
          className={cn(
            'text-sm px-3.5 py-1.5 rounded-full border font-medium transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            selected === obj.value
              ? 'bg-violet-600 text-white border-violet-600'
              : `border-border text-foreground bg-white ${obj.color}`,
          )}
        >
          {obj.icon} {obj.label}
        </button>
      ))}
    </div>
  );
}
