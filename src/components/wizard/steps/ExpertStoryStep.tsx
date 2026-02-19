import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, ArrowDown, Zap, Trophy, Plus, X, Lightbulb } from 'lucide-react';
import { useState } from 'react';

export default function ExpertStoryStep() {
  const { project, updateExpertStory } = useWizardStore();
  const story = project.expertProfile?.story;
  const [newCredential, setNewCredential] = useState('');

  const credentials = story?.credentials || [];

  const handleAddCredential = () => {
    if (newCredential.trim()) {
      updateExpertStory({ credentials: [...credentials, newCredential.trim()] });
      setNewCredential('');
    }
  };

  const handleRemoveCredential = (index: number) => {
    updateExpertStory({ credentials: credentials.filter((_, i) => i !== index) });
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
          <User className="w-4 h-4" />
          Pilar 1: El Experto
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Tu historia de transformación
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Las historias venden. Cuéntanos tu viaje desde el fondo hasta donde estás hoy.
        </p>
      </div>

      {/* Story Arc Visual */}
      <div className="hidden md:flex items-center justify-center gap-2 mb-8">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ArrowDown className="w-6 h-6 text-destructive" />
          </div>
          <span className="text-xs text-muted-foreground mt-2">Fondo</span>
        </div>
        <div className="w-20 h-0.5 bg-gradient-to-r from-destructive to-amber-500" />
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-amber-500" />
          </div>
          <span className="text-xs text-muted-foreground mt-2">Quiebre</span>
        </div>
        <div className="w-20 h-0.5 bg-gradient-to-r from-amber-500 to-emerald-500" />
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-emerald-500" />
          </div>
          <span className="text-xs text-muted-foreground mt-2">Hoy</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Lowest Point */}
        <Card className="p-6 border-l-4 border-l-destructive bg-gradient-to-r from-destructive/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <ArrowDown className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <Label className="text-base font-semibold text-foreground">
                Tu momento más bajo
              </Label>
              <p className="text-sm text-muted-foreground">
                El punto de tu vida donde todo parecía perdido. Sé vulnerable.
              </p>
            </div>
          </div>
          <Textarea
            placeholder="Describe tu situación ANTES de dominar tu método. Sé específico: emociones, situación económica, relaciones..."
            value={story?.lowestPoint || ''}
            onChange={(e) => updateExpertStory({ lowestPoint: e.target.value })}
            rows={6}
            className="resize-none"
          />
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Tip:</strong> Incluye detalles sensoriales y emociones. 
                "Sentía un nudo en el estómago cada vez que sonaba el teléfono, porque sabía que eran cobradores..."
              </span>
            </p>
          </div>
        </Card>

        {/* Breakthrough */}
        <Card className="p-6 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <Label className="text-base font-semibold text-foreground">
                El descubrimiento
              </Label>
              <p className="text-sm text-muted-foreground">
                El momento exacto donde todo cambió. La revelación, el descubrimiento.
              </p>
            </div>
          </div>
          <Textarea
            placeholder="¿Qué pasó que cambió TODO? El momento, la revelación, el encuentro..."
            value={story?.breakthrough || ''}
            onChange={(e) => updateExpertStory({ breakthrough: e.target.value })}
            rows={6}
            className="resize-none"
          />
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Tip:</strong> Este es tu "momento eureka". Hazlo memorable y específico.
                ¿Qué descubriste? ¿Qué te hizo click?
              </span>
            </p>
          </div>
        </Card>

        {/* Current State */}
        <Card className="p-6 border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <Label className="text-base font-semibold text-foreground">
                La transformación
              </Label>
              <p className="text-sm text-muted-foreground">
                Dónde estás hoy gracias a ese descubrimiento. Resultados tangibles.
              </p>
            </div>
          </div>
          <Textarea
            placeholder="¿Dónde estás HOY gracias a tu método? Resultados concretos..."
            value={story?.current || ''}
            onChange={(e) => updateExpertStory({ current: e.target.value })}
            rows={6}
            className="resize-none"
          />
        </Card>

        {/* Credentials */}
        <Card className="p-6 bg-gradient-to-br from-background to-muted/30">
          <Label className="text-lg font-semibold mb-2 block">
            Credenciales y logros
          </Label>
          <p className="text-sm text-muted-foreground mb-4">
            Títulos, certificaciones, menciones en medios, resultados comprobables.
          </p>

          <div className="space-y-3 mb-4">
            {credentials.map((cred, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border group"
              >
                <span className="flex-1 text-sm text-foreground">{cred}</span>
                <button
                  onClick={() => handleRemoveCredential(index)}
                  className="p-1 hover:bg-destructive/10 rounded transition-all"
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Ej: Ayudé a 500+ personas a lograr X"
              value={newCredential}
              onChange={(e) => setNewCredential(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCredential();
                }
              }}
            />
            <Button onClick={handleAddCredential} variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
