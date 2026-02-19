import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Heart, Target, Sword, Plus, X, Lightbulb } from 'lucide-react';
import { useState } from 'react';

const COMMON_ENEMIES = [
  { value: 'traditional-systems', label: 'Sistemas tradicionales que no funcionan' },
  { value: 'fake-gurus', label: '"Gurús" que venden humo' },
  { value: 'victim-mentality', label: 'Mentalidad de víctima/excusas' },
  { value: 'quick-fixes', label: 'Soluciones rápidas/píldoras mágicas' },
  { value: 'other', label: 'Otro (especificar)' },
];

export default function ExpertBeliefsStep() {
  const { project, updateExpertBeliefs } = useWizardStore();
  const beliefs = project.expertProfile?.beliefs;
  const [newBelief, setNewBelief] = useState('');
  const [customEnemy, setCustomEnemy] = useState('');

  const beliefsList = beliefs?.beliefs || [];

  const handleAddBelief = () => {
    if (newBelief.trim()) {
      updateExpertBeliefs({ beliefs: [...beliefsList, newBelief.trim()] });
      setNewBelief('');
    }
  };

  const handleRemoveBelief = (index: number) => {
    updateExpertBeliefs({ beliefs: beliefsList.filter((_, i) => i !== index) });
  };

  const handleEnemyChange = (value: string) => {
    if (value === 'other') {
      updateExpertBeliefs({ commonEnemy: customEnemy || '' });
    } else {
      const enemy = COMMON_ENEMIES.find(e => e.value === value);
      updateExpertBeliefs({ commonEnemy: enemy?.label || value });
    }
  };

  const getCurrentEnemyValue = () => {
    const currentEnemy = beliefs?.commonEnemy;
    const predefined = COMMON_ENEMIES.find(e => e.label === currentEnemy);
    if (predefined) return predefined.value;
    if (currentEnemy && !predefined) return 'other';
    return '';
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
          <User className="w-4 h-4" />
          Pilar 1: El Experto
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Creencias y valores
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Tus creencias fundamentales dan contexto y convicción a tu mensaje.
        </p>
      </div>

      <div className="space-y-6">
        {/* Beliefs */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <Label className="text-lg font-semibold text-foreground">
                Tus creencias principales
              </Label>
              <p className="text-sm text-muted-foreground">
                Las convicciones que guían tu trabajo y mensaje. Mínimo 3.
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {beliefsList.map((belief, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border group"
              >
                <span className="flex-1 text-sm text-foreground">{belief}</span>
                <button
                  onClick={() => handleRemoveBelief(index)}
                  className="p-1 hover:bg-destructive/10 rounded transition-all"
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder='Ej: Creo que trabajar 12 horas NO es una medalla de honor'
              value={newBelief}
              onChange={(e) => setNewBelief(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddBelief();
                }
              }}
            />
            <Button onClick={handleAddBelief} variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-3">
            {beliefsList.length}/3 mínimo {beliefsList.length < 3 && `(faltan ${3 - beliefsList.length})`}
          </p>
        </Card>

        {/* Common Enemy */}
        <Card className="p-6 bg-gradient-to-br from-destructive/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <Sword className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <Label className="text-lg font-semibold text-foreground">
                Tu enemigo común
              </Label>
              <p className="text-sm text-muted-foreground">
                ¿Contra qué luchas junto con tu audiencia?
              </p>
            </div>
          </div>

          <Select
            value={getCurrentEnemyValue()}
            onValueChange={handleEnemyChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un enemigo común..." />
            </SelectTrigger>
            <SelectContent>
              {COMMON_ENEMIES.map((enemy) => (
                <SelectItem key={enemy.value} value={enemy.value}>
                  {enemy.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {getCurrentEnemyValue() === 'other' && (
            <Input
              className="mt-3"
              placeholder="Especifica tu enemigo común..."
              value={customEnemy}
              onChange={(e) => {
                setCustomEnemy(e.target.value);
                updateExpertBeliefs({ commonEnemy: e.target.value });
              }}
            />
          )}
        </Card>

        {/* Central Promise */}
        <Card className="p-6 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <Label className="text-lg font-semibold text-foreground">
                Tu promesa central
              </Label>
              <p className="text-sm text-muted-foreground">
                Si tuvieras que resumir en UNA frase lo que ofreces...
              </p>
            </div>
          </div>

          <Textarea
            placeholder="Ej: Te ayudo a generar $10K/mes sin depender de un jefe, en 90 días"
            value={beliefs?.centralPromise || ''}
            onChange={(e) => updateExpertBeliefs({ centralPromise: e.target.value })}
            rows={3}
            className="resize-none"
          />

          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Ejemplo:</strong> "Te ayudo a generar $10K/mes sin depender de un jefe, en 90 días"
              </span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
