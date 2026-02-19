import { useContentGeneratorStore } from '@/store/contentGeneratorStore';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Wand2 } from 'lucide-react';
import BlockCard from './BlockCard';

export default function BlockGenerationScreen() {
  const {
    selectedStructure, session, isGenerating, generatingBlockId,
    generateBlock, setCurrentScreen,
  } = useContentGeneratorStore();

  if (!selectedStructure || !session) return null;

  const completedCount = selectedStructure.blocks.filter(
    (b) => session.generatedBlocks[b.id]?.status === 'completed'
  ).length;
  const totalBlocks = selectedStructure.blocks.length;
  const progressPct = Math.round((completedCount / totalBlocks) * 100);
  const allDone = completedCount === totalBlocks;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-violet-500" />
            Generando tu copy
          </h2>
          <span className="text-sm text-muted-foreground">{completedCount}/{totalBlocks} bloques</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {isGenerating && (
          <p className="text-sm text-violet-600 mt-2 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Generando bloque a bloque... No cierres esta ventana.
          </p>
        )}
      </div>

      {/* Block cards */}
      <div className="space-y-3">
        {selectedStructure.blocks.map((block) => (
          <BlockCard
            key={block.id}
            blockId={block.id}
            blockName={block.name}
            blockObjective={block.objective}
            generatedBlock={session.generatedBlocks[block.id]}
            isCurrentlyGenerating={generatingBlockId === block.id}
            onRegenerate={(id, extra) => generateBlock(id, extra)}
          />
        ))}
      </div>

      {/* Footer actions */}
      {allDone && !isGenerating && (
        <div className="mt-8">
          <Button
            onClick={() => setCurrentScreen(4)}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white h-12 text-base"
          >
            Ver documento final completo
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
