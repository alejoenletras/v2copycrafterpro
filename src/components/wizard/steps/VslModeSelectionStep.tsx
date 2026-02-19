import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Wand2, ClipboardList, Check, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VslMode } from '@/types';

const MODES = [
  {
    mode: 'auto' as VslMode,
    title: 'Automático',
    subtitle: 'IA extrae todo por ti',
    description: 'Pega URLs de tus videos, redes sociales o páginas de venta. La IA analiza y extrae toda la información necesaria para construir tu VSL.',
    icon: Wand2,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    features: ['URLs de YouTube, TikTok, Reels', 'Landing pages y documentos', 'Extrae 13 puntos clave del brief'],
    ideal: 'Tienes contenido existente',
    time: '5-10 minutos',
  },
  {
    mode: 'manual' as VslMode,
    title: 'Manual',
    subtitle: 'Control total paso a paso',
    description: 'Completa el wizard guiado con los 3 pilares: Experto, Avatar y Persuasión. Máximo control sobre cada elemento de tu VSL.',
    icon: ClipboardList,
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    features: ['Control total del copy', 'DNAs reutilizables', 'Gatillos mentales personalizados'],
    ideal: 'Quieres control total',
    time: '15-20 minutos',
  },
];

export default function VslModeSelectionStep() {
  const { project, updateVslMode, markStepCompleted, setCurrentStep } = useWizardStore();

  const handleSelectMode = (mode: VslMode) => {
    updateVslMode(mode);
    markStepCompleted('vsl-mode-selection');

    if (mode === 'auto') {
      setTimeout(() => setCurrentStep('url-input'), 300);
    } else {
      // Manual: respect vslType routing
      if (project.vslType === 'high-ticket') {
        setTimeout(() => setCurrentStep('high-ticket-info'), 300);
      } else {
        setTimeout(() => setCurrentStep('dna-selection'), 300);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          ¿Cómo quieres generar tu VSL?
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Elige el modo que mejor se adapte a tu situación actual.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isSelected = project.vslMode === m.mode;

          return (
            <Card
              key={m.mode}
              className={cn(
                "relative p-6 cursor-pointer transition-all duration-300 hover:shadow-card-hover group overflow-hidden",
                isSelected
                  ? "ring-2 ring-primary shadow-card-hover"
                  : "hover:-translate-y-1"
              )}
              onClick={() => handleSelectMode(m.mode)}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-scale-in">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}

              <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110", m.bgLight)}>
                <div className={cn("w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center", m.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>

              <h3 className="text-xl font-display font-bold text-foreground mb-1">{m.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{m.subtitle}</p>
              <p className="text-foreground/80 mb-5">{m.description}</p>

              <div className="flex flex-wrap gap-2 mb-5">
                {m.features.map((f) => (
                  <span key={f} className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">{f}</span>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Ideal para
                  </span>
                  <span className="font-medium text-foreground">{m.ideal}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Tiempo estimado
                  </span>
                  <span className="font-semibold text-emerald-600">{m.time}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
