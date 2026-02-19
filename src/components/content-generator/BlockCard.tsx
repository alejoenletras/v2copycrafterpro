import { useState } from 'react';
import { GeneratedBlock, BlockStatus } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Clock, AlertCircle, RefreshCw, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlockCardProps {
  blockId: string;
  blockName: string;
  blockObjective: string;
  generatedBlock?: GeneratedBlock;
  isCurrentlyGenerating: boolean;
  onRegenerate: (blockId: string, extraInstructions?: string) => void;
}

const STATUS_META: Record<BlockStatus, { icon: React.ReactNode; label: string; color: string }> = {
  pending:        { icon: <Clock className="w-3.5 h-3.5" />,               label: 'Pendiente',       color: 'text-muted-foreground' },
  generating:     { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: 'Generando...',    color: 'text-violet-600' },
  completed:      { icon: <CheckCircle2 className="w-3.5 h-3.5" />,        label: 'Completado',      color: 'text-emerald-600' },
  'review-needed':{ icon: <AlertCircle className="w-3.5 h-3.5" />,         label: 'Revisar',         color: 'text-amber-600' },
};

export default function BlockCard({
  blockId, blockName, blockObjective, generatedBlock, isCurrentlyGenerating, onRegenerate,
}: BlockCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRegenForm, setShowRegenForm] = useState(false);
  const [extraInstructions, setExtraInstructions] = useState('');

  const status: BlockStatus = isCurrentlyGenerating
    ? 'generating'
    : generatedBlock?.status ?? 'pending';

  const meta = STATUS_META[status];
  const hasContent = !!generatedBlock?.content;

  const handleRegenerate = () => {
    onRegenerate(blockId, extraInstructions || undefined);
    setShowRegenForm(false);
    setExtraInstructions('');
  };

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      status === 'generating' && 'border-violet-300 bg-violet-50/30',
      status === 'completed' && 'border-emerald-200',
      status === 'review-needed' && 'border-amber-300',
    )}>
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => hasContent && setIsExpanded((v) => !v)}
      >
        <div className={cn('flex items-center gap-1.5 text-xs font-medium shrink-0', meta.color)}>
          {meta.icon}
          {meta.label}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{blockName}</p>
          <p className="text-xs text-muted-foreground truncate">{blockObjective}</p>
        </div>
        {hasContent && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); setShowRegenForm((v) => !v); }}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Regenerar
            </Button>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </div>

      {/* Generating skeleton */}
      {status === 'generating' && (
        <div className="px-4 pb-4">
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={cn('h-3 bg-violet-200/50 rounded animate-pulse', i === 3 && 'w-2/3')} />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {hasContent && isExpanded && (
        <div className="px-4 pb-4 border-t border-dashed">
          <div className="mt-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {generatedBlock!.content}
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground"
              onClick={() => navigator.clipboard.writeText(generatedBlock!.content)}
            >
              <Edit2 className="w-3 h-3 mr-1" /> Copiar bloque
            </Button>
          </div>
        </div>
      )}

      {/* Regenerate form */}
      {showRegenForm && (
        <div className="px-4 pb-4 border-t" onClick={(e) => e.stopPropagation()}>
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              Instrucciones adicionales (opcional): indica qué cambiar, qué tono usar, o qué información agregar.
            </p>
            <Textarea
              placeholder="Ej: Hazlo más agresivo. Agrega la historia de María. Acorta a la mitad..."
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowRegenForm(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-violet-600 text-white hover:bg-violet-700"
                onClick={handleRegenerate}
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Regenerar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
