import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConsciousnessLevel } from '@/types';

const CONSCIOUSNESS_LEVELS = [
  {
    level: 0 as ConsciousnessLevel,
    title: 'No sabe que tiene un problema',
    badge: 'Completamente inconsciente',
    description: 'Tu avatar NO sabe que tiene un problema. Necesitas crear consciencia desde cero.',
    example: 'Nunca ha pensado en su salud financiera',
    strategy: 'Educar sobre el problema usando historias externas',
    bgColor: 'bg-slate-100 dark:bg-slate-800/50',
    borderColor: 'border-slate-300 dark:border-slate-600',
    ringColor: 'ring-slate-400',
    badgeColor: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  },
  {
    level: 1 as ConsciousnessLevel,
    title: 'Sabe que tiene un problema',
    badge: 'Problem Aware',
    description: 'Tu avatar SABE que tiene un problema, pero no sabe que existen soluciones.',
    example: 'Me siento cansado siempre pero no sé qué hacer',
    strategy: 'Agitar el dolor. Mostrar consecuencias. Introducir que hay soluciones.',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-300 dark:border-yellow-700',
    ringColor: 'ring-yellow-400',
    badgeColor: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200',
  },
  {
    level: 2 as ConsciousnessLevel,
    title: 'Sabe que existe una solución',
    badge: 'Solution Aware',
    description: 'Tu avatar sabe que HAY soluciones, pero no conoce TU solución específica.',
    example: 'Sé que el ejercicio ayuda, pero no sé cuál',
    strategy: 'Presentar TU método único. Diferenciarte de otras soluciones.',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-300 dark:border-blue-700',
    ringColor: 'ring-blue-400',
    badgeColor: 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200',
  },
  {
    level: 3 as ConsciousnessLevel,
    title: 'Sabe que TU producto existe',
    badge: 'Product Aware',
    description: 'Tu avatar conoce TU producto/servicio, pero aún tiene objeciones.',
    example: 'He visto tu programa pero tengo dudas',
    strategy: 'Destruir objeciones. Mostrar prueba social masiva. Presentar oferta.',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-300 dark:border-purple-700',
    ringColor: 'ring-purple-400',
    badgeColor: 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200',
  },
  {
    level: 4 as ConsciousnessLevel,
    title: 'Está listo para comprar',
    badge: 'Most Aware',
    description: 'Tu avatar está LISTO para comprar, solo necesita un último empujón.',
    example: 'Solo necesito decidir si es el momento correcto',
    strategy: 'Crear urgencia real. Facilitar la acción. Cerrar la venta.',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-300 dark:border-green-700',
    ringColor: 'ring-green-400',
    badgeColor: 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200',
  },
];

export default function AvatarConsciousnessStep() {
  const { project, updateAvatarConsciousness } = useWizardStore();
  const currentLevel = project.avatarProfile?.consciousnessLevel;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 rounded-full text-accent text-sm font-medium mb-4">
          <Users className="w-4 h-4" />
          Pilar 2: El Avatar
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3 flex items-center justify-center gap-3">
          <Brain className="w-8 h-8 text-primary" />
          Nivel de Conciencia de tu Avatar
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Este es el factor <strong className="text-foreground">MÁS importante</strong> para determinar CÓMO escribir tu copy
        </p>
      </div>

      <RadioGroup
        value={currentLevel?.toString() || ''}
        onValueChange={(value) => updateAvatarConsciousness(parseInt(value) as ConsciousnessLevel)}
        className="space-y-4"
      >
        {CONSCIOUSNESS_LEVELS.map((level) => {
          const isSelected = currentLevel === level.level;

          return (
            <label
              key={level.level}
              className="block cursor-pointer transition-all"
            >
              <Card
                className={cn(
                  "p-6 transition-all hover:shadow-lg border-2",
                  level.bgColor,
                  level.borderColor,
                  isSelected && `ring-2 ring-offset-2 ${level.ringColor}`
                )}
              >
                <div className="flex items-start gap-4">
                  <RadioGroupItem 
                    value={level.level.toString()} 
                    className="mt-1.5"
                  />
                  
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                        "bg-foreground/10 text-foreground"
                      )}>
                        {level.level}
                      </span>
                      <h3 className="font-semibold text-lg text-foreground">
                        NIVEL {level.level} - {level.title.toUpperCase()}
                      </h3>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-medium",
                        level.badgeColor
                      )}>
                        {level.badge}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-foreground/80 mb-4">
                      {level.description}
                    </p>

                    {/* Example & Strategy Grid */}
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="p-3 bg-background/60 rounded-lg border border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-1">💬 Ejemplo:</p>
                        <p className="text-sm text-foreground/80 italic">"{level.example}"</p>
                      </div>
                      <div className="p-3 bg-background/60 rounded-lg border border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-1">🎯 Estrategia:</p>
                        <p className="text-sm text-foreground/80">{level.strategy}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </label>
          );
        })}
      </RadioGroup>

      <p className="text-center text-sm text-muted-foreground mt-8">
        💡 <strong>Tip:</strong> La mayoría de embudos funcionan mejor con audiencias en niveles 1-3. 
        El nivel 0 requiere más educación y el nivel 4 solo necesita ofertas.
      </p>
    </div>
  );
}
