import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, Sparkles, Target, Lightbulb, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIMEFRAME_OPTIONS = [
  { value: 'immediate', label: 'Resultados inmediatos (7-30 días)' },
  { value: 'short', label: 'Corto plazo (1-3 meses)' },
  { value: 'medium', label: 'Mediano plazo (3-6 meses)' },
  { value: 'long', label: 'Largo plazo (6-12 meses)' },
];

export default function AvatarDesiresStep() {
  const { project, updateAvatarDesires } = useWizardStore();
  const desires = project.avatarProfile?.desires;

  const hasIdentityTransformation = !!desires?.identityTransformation?.trim();
  const hasAtLeastOneResult = !!(
    desires?.tangibleResults?.economic?.trim() ||
    desires?.tangibleResults?.lifestyle?.trim() ||
    desires?.tangibleResults?.relationships?.trim()
  );
  const hasTimeframe = !!desires?.timeframe;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 rounded-full text-accent text-sm font-medium mb-4">
          <Users className="w-4 h-4" />
          Pilar 2: El Avatar
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          ✨ El Futuro Soñado de tu Avatar
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          No solo vendemos ausencia de dolor. Vendemos un <strong className="text-foreground">FUTURO MEJOR</strong>.
        </p>
      </div>

      <div className="space-y-6">
        {/* Section 1: Identity Transformation - Highlighted */}
        <Card className="p-6 border-2 border-primary/30 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <Label className="text-lg font-bold text-foreground flex items-center gap-2">
                🎯 ¿En QUIÉN quiere convertirse tu avatar?
                {hasIdentityTransformation && <span className="text-green-500 text-sm">✓</span>}
              </Label>
              <p className="text-sm text-muted-foreground">
                (No qué quiere tener, sino quién quiere <strong>SER</strong>)
              </p>
            </div>
          </div>
          <Textarea
            placeholder='Ej: Quiero ser el tipo de persona que tiene control de su vida, es admirado por su familia, e inspira a otros'
            value={desires?.identityTransformation || ''}
            onChange={(e) => updateAvatarDesires({ identityTransformation: e.target.value })}
            rows={6}
            className="resize-none bg-background/80"
          />
          <div className="mt-3 p-3 bg-background/60 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Tip:</strong> La gente no compra productos, compra versiones mejoradas de sí mismos.
                "Quiero ser alguien que..." es más poderoso que "Quiero tener..."
              </span>
            </p>
          </div>
        </Card>

        {/* Section 2: Tangible Results */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-primary" />
            <div>
              <Label className="text-lg font-semibold text-foreground">
                Resultados Tangibles Deseados
                {hasAtLeastOneResult && <span className="text-green-500 text-sm ml-2">✓</span>}
              </Label>
              <p className="text-sm text-muted-foreground">
                Resultados concretos y medibles (al menos 1 requerido)
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            {/* Economic */}
            <div className="p-4 rounded-lg border border-border bg-gradient-to-r from-emerald-500/10 to-transparent">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">💰</span>
                <div>
                  <Label className="font-medium text-foreground">Económicos</Label>
                  <p className="text-xs text-muted-foreground">Metas financieras concretas</p>
                </div>
              </div>
              <Input
                placeholder="Ej: $5,000/mes de ingresos pasivos"
                value={desires?.tangibleResults?.economic || ''}
                onChange={(e) => updateAvatarDesires({ 
                  tangibleResults: { 
                    ...desires?.tangibleResults, 
                    economic: e.target.value,
                    lifestyle: desires?.tangibleResults?.lifestyle || '',
                    relationships: desires?.tangibleResults?.relationships || ''
                  } 
                })}
              />
            </div>

            {/* Lifestyle */}
            <div className="p-4 rounded-lg border border-border bg-gradient-to-r from-blue-500/10 to-transparent">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🏖️</span>
                <div>
                  <Label className="font-medium text-foreground">Estilo de vida</Label>
                  <p className="text-xs text-muted-foreground">Cómo quiere vivir día a día</p>
                </div>
              </div>
              <Input
                placeholder="Ej: Trabajar desde cualquier lugar, tener tardes libres"
                value={desires?.tangibleResults?.lifestyle || ''}
                onChange={(e) => updateAvatarDesires({ 
                  tangibleResults: { 
                    ...desires?.tangibleResults, 
                    lifestyle: e.target.value,
                    economic: desires?.tangibleResults?.economic || '',
                    relationships: desires?.tangibleResults?.relationships || ''
                  } 
                })}
              />
            </div>

            {/* Relationships */}
            <div className="p-4 rounded-lg border border-border bg-gradient-to-r from-pink-500/10 to-transparent">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">❤️</span>
                <div>
                  <Label className="font-medium text-foreground">Relaciones</Label>
                  <p className="text-xs text-muted-foreground">Cómo quiere conectar con otros</p>
                </div>
              </div>
              <Input
                placeholder="Ej: Que mi familia esté orgullosa, reconectar con pareja"
                value={desires?.tangibleResults?.relationships || ''}
                onChange={(e) => updateAvatarDesires({ 
                  tangibleResults: { 
                    ...desires?.tangibleResults, 
                    relationships: e.target.value,
                    economic: desires?.tangibleResults?.economic || '',
                    lifestyle: desires?.tangibleResults?.lifestyle || ''
                  } 
                })}
              />
            </div>
          </div>
        </Card>

        {/* Section 3: Timeframe */}
        <Card className="p-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <Label className="text-lg font-semibold text-foreground flex items-center gap-2">
                ⏰ ¿En cuánto tiempo quiere ver resultados?
                {hasTimeframe && <span className="text-green-500 text-sm">✓</span>}
              </Label>
              <p className="text-sm text-muted-foreground">
                Esto determina cómo presentas tu promesa y garantía
              </p>
            </div>
          </div>

          <RadioGroup
            value={desires?.timeframe || ''}
            onValueChange={(value) => updateAvatarDesires({ timeframe: value })}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {TIMEFRAME_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                  desires?.timeframe === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border"
                )}
              >
                <RadioGroupItem value={option.value} />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </RadioGroup>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              💡 Esto afectará cómo presentas tu oferta y promesa en el copy
            </p>
          </div>
        </Card>
      </div>

      {/* Validation Status */}
      <div className="mt-6 text-center">
        {!hasIdentityTransformation || !hasAtLeastOneResult || !hasTimeframe ? (
          <p className="text-sm text-muted-foreground">
            Completa la transformación de identidad, al menos 1 resultado tangible y el marco temporal
          </p>
        ) : (
          <p className="text-sm text-green-600 dark:text-green-400">
            ✅ Sección completada correctamente
          </p>
        )}
      </div>
    </div>
  );
}
