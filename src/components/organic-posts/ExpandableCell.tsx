import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExpandableCellProps {
  text: string | null;
  maxLength?: number;
  copyable?: boolean;
}

export function ExpandableCell({ text, maxLength = 100, copyable = false }: ExpandableCellProps) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  if (!text) return <span className="text-muted-foreground">—</span>;

  const needsTruncate = text.length > maxLength;
  const displayText = !expanded && needsTruncate ? text.slice(0, maxLength) + '...' : text;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado al portapapeles' });
  };

  return (
    <div className="space-y-1">
      <p className="text-sm whitespace-pre-wrap">{displayText}</p>
      <div className="flex gap-1">
        {needsTruncate && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {expanded ? 'Menos' : 'Más'}
          </Button>
        )}
        {copyable && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleCopy}>
            <Copy className="w-3 h-3 mr-1" />
            Copiar
          </Button>
        )}
      </div>
    </div>
  );
}
