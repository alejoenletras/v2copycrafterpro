import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScoredAd } from '@/types';

interface ScoredAdCardProps {
  ad: ScoredAd;
  index: number;
  selected: boolean;
  onToggle: () => void;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-700 bg-emerald-100';
  if (score >= 60) return 'text-amber-700 bg-amber-100';
  return 'text-red-700 bg-red-100';
}

export default function ScoredAdCard({ ad, index, selected, onToggle }: ScoredAdCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      'rounded-lg border transition-all',
      selected ? 'border-amber-300 bg-amber-50/50' : 'border-border hover:border-muted-foreground/30'
    )}>
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 shrink-0 accent-amber-600"
        />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
            <Badge className={cn('text-xs', scoreColor(ad.similarity_score))}>
              {ad.similarity_score}%
            </Badge>
            <span className="text-xs text-muted-foreground truncate">{ad.advertiser_name}</span>
            {ad.days_running && (
              <span className="text-[10px] text-muted-foreground">{ad.days_running}d</span>
            )}
            {ad.recommended && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                Recomendado
              </Badge>
            )}
          </div>

          {/* Headline */}
          {ad.headline && (
            <p className="text-sm font-medium mb-1 line-clamp-1">{ad.headline}</p>
          )}

          {/* Reasoning */}
          <p className="text-xs text-muted-foreground mb-1.5">{ad.reasoning}</p>

          {/* Techniques */}
          {ad.technique_match && ad.technique_match.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {ad.technique_match.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
              ))}
            </div>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {expanded ? 'Ocultar texto' : 'Ver texto completo'}
          </button>

          {/* Full text */}
          {expanded && (
            <div className="mt-2 p-2 rounded bg-muted/50 text-xs whitespace-pre-wrap max-h-60 overflow-y-auto">
              {ad.ad_text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
