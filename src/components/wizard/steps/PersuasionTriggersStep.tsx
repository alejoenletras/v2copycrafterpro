import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Brain, Lightbulb, Check, Zap, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentalTrigger } from '@/types';
import { useEffect } from 'react';

type TriggerCategory = 'Cialdini' | 'Libro Negro';

interface TriggerData {
  name: string;
  category: TriggerCategory;
  description: string;
  application: string;
  timing: string;
  warning: boolean;
  warningText?: string;
  defaultEnabled?: boolean;
}

const MENTAL_TRIGGERS_DATA: TriggerData[] = [
  { 
    name: 'Reciprocidad', 
    category: 'Cialdini',
    description: 'Dar para recibir',
    application: 'Entregar valor MASIVO antes de vender',
    timing: 'Primeros 5-10 minutos del embudo',
    warning: false,
  },
  { 
    name: 'Compromiso y Coherencia', 
    category: 'Cialdini',
    description: 'Micro-compromisos que llevan a la venta',
    application: 'Hacer que digan "sí" a cosas pequeñas primero',
    timing: 'Durante la educación (min 5-15)',
    warning: false,
  },
  { 
    name: 'Prueba Social', 
    category: 'Cialdini',
    description: 'Si otros lo hicieron, yo también puedo',
    application: 'Testimonios estratégicos del país del avatar',
    timing: 'Después de presentar solución (min 15-18)',
    warning: false,
    defaultEnabled: true,
  },
  { 
    name: 'Autoridad', 
    category: 'Cialdini',
    description: 'Confío en expertos',
    application: 'Mostrar credenciales y logros del experto',
    timing: 'Al inicio, durante historia (min 2-5)',
    warning: false,
    defaultEnabled: true,
  },
  { 
    name: 'Simpatía', 
    category: 'Cialdini',
    description: 'Compro a quienes me caen bien',
    application: 'Historia personal relatable',
    timing: 'Durante historia de transformación',
    warning: false,
  },
  { 
    name: 'Escasez', 
    category: 'Cialdini',
    description: 'Lo que es raro es valioso',
    application: 'Solo si tienes escasez REAL (cupos limitados)',
    timing: 'Al presentar oferta (min 20-25)',
    warning: true,
    warningText: 'Solo activa si tienes escasez REAL',
  },
  { 
    name: 'Urgencia', 
    category: 'Cialdini',
    description: 'Actuar ahora vs después',
    application: 'Solo si tienes deadline REAL',
    timing: 'Cierre final (últimos 3-5 min)',
    warning: true,
    warningText: 'Solo activa si tienes urgencia REAL',
  },
  { 
    name: 'Contraste', 
    category: 'Libro Negro',
    description: 'Esto vs aquello',
    application: 'Comparar con alternativas caras o ineficientes',
    timing: 'Al presentar solución y precio',
    warning: false,
  },
  { 
    name: 'Anclaje', 
    category: 'Libro Negro',
    description: 'Primer precio define percepción',
    application: 'Mostrar valor total ANTES del precio real',
    timing: 'Durante stack de valor (min 18-22)',
    warning: false,
    defaultEnabled: true,
  },
  { 
    name: 'Aversión a la Pérdida', 
    category: 'Libro Negro',
    description: 'Miedo a perderse algo > Deseo de ganar',
    application: 'Costo de NO actuar (años perdidos, oportunidades)',
    timing: 'Durante agitación del problema (min 5-8)',
    warning: false,
  },
];

const CATEGORY_COLORS: Record<TriggerCategory, string> = {
  'Cialdini': 'bg-blue-100 text-blue-800',
  'Libro Negro': 'bg-purple-100 text-purple-800',
};

export default function PersuasionTriggersStep() {
  const { project, updateMentalTriggers } = useWizardStore();
  const triggers = project.persuasionStrategy?.mentalTriggers || [];

  useEffect(() => {
    if (triggers.length === 0) {
      const initialTriggers: MentalTrigger[] = MENTAL_TRIGGERS_DATA.map((t) => ({
        name: t.name,
        enabled: t.defaultEnabled || false,
        application: '',
        timing: t.timing,
      }));
      updateMentalTriggers(initialTriggers);
    }
  }, []);

  const handleToggle = (name: string) => {
    const updated = triggers.map((t) =>
      t.name === name ? { ...t, enabled: !t.enabled } : t
    );
    updateMentalTriggers(updated);
  };

  const handleApplicationChange = (name: string, value: string) => {
    const updated = triggers.map((t) =>
      t.name === name ? { ...t, application: value } : t
    );
    updateMentalTriggers(updated);
  };

  const enabledCount = triggers.filter((t) => t.enabled).length;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full text-emerald-600 text-sm font-medium mb-4">
          <Brain className="w-4 h-4" />
          Pilar 3: Persuasión
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          🧠 Gatillos Mentales Validados
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Basado en Cialdini + El Libro Negro de la Persuasión. Activa solo los que aplicarás.
        </p>
      </div>

      {/* Info Box */}
      <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>
            <strong>💡 RECOMENDACIÓN:</strong> Basado en tu avatar (nivel de conciencia y dolores), 
            estos son los más efectivos para tu caso. Recomendamos activar al menos 5-7 gatillos.
          </span>
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
          enabledCount >= 5 ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
        )}>
          {enabledCount >= 5 ? (
            <Check className="w-5 h-5" />
          ) : (
            <Zap className="w-5 h-5" />
          )}
          <span className="font-medium">
            {enabledCount} de 10 gatillos activados
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {MENTAL_TRIGGERS_DATA.map((trigger) => {
          const currentTrigger = triggers.find((t) => t.name === trigger.name);
          const isEnabled = currentTrigger?.enabled || false;

          return (
            <Card
              key={trigger.name}
              className={cn(
                "p-5 transition-all cursor-pointer hover:shadow-lg",
                isEnabled
                  ? "ring-2 ring-green-500 bg-green-500/5"
                  : "hover:border-green-500/50"
              )}
              onClick={() => handleToggle(trigger.name)}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground">{trigger.name}</h3>
                    <Badge variant="secondary" className={cn("text-xs", CATEGORY_COLORS[trigger.category])}>
                      {trigger.category}
                    </Badge>
                    {trigger.defaultEnabled && (
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                        Siempre activo
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {trigger.description}
                  </p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleToggle(trigger.name)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div className="space-y-2 mb-3">
                <div className="p-2.5 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-start gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Aplicación:</strong> {trigger.application}</span>
                  </p>
                </div>
                <div className="p-2.5 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Momento:</strong> {trigger.timing}
                  </p>
                </div>
              </div>

              {trigger.warning && (
                <div className="p-2.5 bg-amber-500/10 rounded-lg mb-3 border border-amber-500/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>⚠️ {trigger.warningText}</span>
                  </p>
                </div>
              )}

              {isEnabled && (
                <div className="animate-fade-in pt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    ¿Cómo lo aplicarás específicamente?
                  </Label>
                  <Input
                    placeholder="Ej: Ofreceremos solo 50 cupos con precio especial..."
                    value={currentTrigger?.application || ''}
                    onChange={(e) => handleApplicationChange(trigger.name, e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        💡 <strong>Tip:</strong> Menos es más. Es mejor usar 5-7 gatillos de forma potente que 10 de forma superficial.
      </p>
    </div>
  );
}