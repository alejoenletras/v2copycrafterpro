import { useContentGeneratorStore } from '@/store/contentGeneratorStore';
import StructureSelectionScreen from '@/components/content-generator/StructureSelectionScreen';
import DnaSelectionScreen from '@/components/content-generator/DnaSelectionScreen';
import BlockGenerationScreen from '@/components/content-generator/BlockGenerationScreen';
import FinalDocumentScreen from '@/components/content-generator/FinalDocumentScreen';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Tv, FileText, Wand2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, label: 'Estructura',  icon: Tv },
  { id: 2, label: 'DNAs', icon: FileText },
  { id: 3, label: 'Generación',  icon: Wand2 },
  { id: 4, label: 'Documento',   icon: CheckCircle2 },
] as const;

export default function ContentGeneratorPage() {
  const { currentScreen } = useContentGeneratorStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Inicio
          </Button>
          <h1 className="font-display font-bold text-lg hidden sm:block">Generador de Contenido IA</h1>

          {/* Step indicators */}
          <div className="flex items-center gap-1 ml-auto">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = currentScreen === step.id;
              const isDone = currentScreen > step.id;
              return (
                <div key={step.id} className="flex items-center">
                  <div className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    isActive && 'bg-violet-100 text-violet-700',
                    isDone && 'text-emerald-600',
                    !isActive && !isDone && 'text-muted-foreground',
                  )}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn('w-4 h-px mx-0.5', isDone ? 'bg-emerald-400' : 'bg-muted-foreground/20')} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {currentScreen === 1 && <StructureSelectionScreen />}
        {currentScreen === 2 && <DnaSelectionScreen />}
        {currentScreen === 3 && <BlockGenerationScreen />}
        {currentScreen === 4 && <FinalDocumentScreen />}
      </div>
    </div>
  );
}
