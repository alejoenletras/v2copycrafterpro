import { useState } from 'react';
import { useContentGeneratorStore } from '@/store/contentGeneratorStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, RotateCcw, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function FinalDocumentScreen() {
  const { selectedStructure, session, resetSession, setCurrentScreen } = useContentGeneratorStore();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!selectedStructure || !session) return null;

  // Build full document in block order
  const fullDocument = selectedStructure.blocks
    .map((block) => {
      const generated = session.generatedBlocks[block.id];
      if (!generated?.content) return null;
      return `## ${block.name}\n\n${generated.content}`;
    })
    .filter(Boolean)
    .join('\n\n---\n\n');

  const completedBlocks = selectedStructure.blocks.filter(
    (b) => session.generatedBlocks[b.id]?.status === 'completed'
  ).length;
  const reviewNeeded = selectedStructure.blocks.filter(
    (b) => session.generatedBlocks[b.id]?.status === 'review-needed'
  ).length;
  const wordCount = fullDocument.split(/\s+/).filter(Boolean).length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullDocument);
    setCopied(true);
    toast({ title: 'Copiado al portapapeles' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullDocument], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedStructure.name.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold mb-1">{selectedStructure.name}</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> {wordCount.toLocaleString()} palabras
            </span>
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> {completedBlocks}/{selectedStructure.blocks.length} bloques
            </span>
            {reviewNeeded > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="w-3.5 h-3.5" /> {reviewNeeded} requieren revisión
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? 'Copiado' : 'Copiar todo'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" /> Descargar .txt
          </Button>
        </div>
      </div>

      {/* Document preview by blocks */}
      <div className="space-y-4 mb-8">
        {selectedStructure.blocks.map((block, i) => {
          const generated = session.generatedBlocks[block.id];
          const hasContent = !!generated?.content;
          const needsReview = generated?.status === 'review-needed';

          return (
            <Card
              key={block.id}
              className={cn(
                'p-5',
                needsReview && 'border-amber-300 bg-amber-50/30',
                !hasContent && 'opacity-50',
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs font-mono">{String(i + 1).padStart(2, '0')}</Badge>
                <h3 className="font-semibold text-sm">{block.name}</h3>
                {needsReview && (
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 ml-auto">
                    <AlertCircle className="w-3 h-3 mr-1" /> Revisar
                  </Badge>
                )}
              </div>
              {hasContent ? (
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {generated!.content}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No generado</p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="flex gap-3 border-t pt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentScreen(3)}
          className="flex items-center gap-2"
        >
          Volver a bloques
        </Button>
        <Button
          variant="outline"
          onClick={resetSession}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Nuevo proyecto
        </Button>
        <Button
          onClick={handleCopy}
          className="ml-auto bg-gradient-to-r from-violet-500 to-purple-600 text-white"
        >
          <Copy className="w-4 h-4 mr-2" />
          {copied ? 'Copiado' : 'Copiar documento completo'}
        </Button>
      </div>
    </div>
  );
}
