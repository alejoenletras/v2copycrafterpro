import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Users, Plus, X, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const PAIN_CATEGORIES = [
  {
    key: 'economic',
    title: 'Dolores Económicos',
    emoji: '💰',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    placeholder: 'Ej: No llego a fin de mes, Tengo deudas que no puedo pagar',
  },
  {
    key: 'emotional',
    title: 'Dolores Emocionales',
    emoji: '😔',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    placeholder: 'Ej: Frustrado, Ansioso todo el tiempo, Me siento atrapado',
  },
  {
    key: 'social',
    title: 'Dolores Sociales',
    emoji: '👥',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    placeholder: 'Ej: Mi familia no me apoya, Perdí contacto con amigos',
  },
  {
    key: 'identity',
    title: 'Dolores de Identidad',
    emoji: '🪞',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    placeholder: 'Ej: No soy suficiente, Soy un fracaso',
  },
];

export default function AvatarPainsStep() {
  const { project, updateAvatarPains } = useWizardStore();
  const pains = project.avatarProfile?.pains;
  const [newPains, setNewPains] = useState<Record<string, string>>({
    economic: '',
    emotional: '',
    social: '',
    identity: '',
  });

  const getPainList = (key: string): string[] => {
    switch (key) {
      case 'economic': return pains?.economic || [];
      case 'emotional': return pains?.emotional || [];
      case 'social': return pains?.social || [];
      case 'identity': return pains?.identity || [];
      default: return [];
    }
  };

  const handleAddPain = (key: string) => {
    const value = newPains[key].trim();
    if (!value) return;
    
    const currentList = getPainList(key);
    if (currentList.length >= 5) return;

    updateAvatarPains({ [key]: [...currentList, value] });
    setNewPains(prev => ({ ...prev, [key]: '' }));
  };

  const handleRemovePain = (key: string, pain: string) => {
    const currentList = getPainList(key);
    updateAvatarPains({ [key]: currentList.filter(p => p !== pain) });
  };

  const allCategoriesHaveMinimum = PAIN_CATEGORIES.every(
    cat => getPainList(cat.key).length >= 2
  );

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 rounded-full text-accent text-sm font-medium mb-4">
          <Users className="w-4 h-4" />
          Pilar 2: El Avatar
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          💔 Dolores Profundos del Avatar
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Mapea los dolores en 4 dimensiones. Usa las <strong className="text-foreground">palabras EXACTAS</strong> de tus clientes.
        </p>
      </div>

      {/* Pain Categories Grid 2x2 */}
      <div className="grid md:grid-cols-2 gap-5 mb-8">
        {PAIN_CATEGORIES.map((category) => {
          const painList = getPainList(category.key);
          const hasMinimum = painList.length >= 2;

          return (
            <Card 
              key={category.key} 
              className={cn(
                "p-5 border-2 transition-all",
                category.bgColor,
                category.borderColor
              )}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{category.emoji}</span>
                <div className="flex-1">
                  <Label className="text-base font-semibold text-foreground">
                    {category.title}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {painList.length}/5 dolores 
                    {!hasMinimum && (
                      <span className="text-destructive ml-1">(mínimo 2)</span>
                    )}
                  </p>
                </div>
                {hasMinimum && (
                  <span className="text-green-500 text-sm">✓</span>
                )}
              </div>

              {/* Pain List */}
              <div className="space-y-2 mb-3 min-h-[60px]">
                {painList.map((pain, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2.5 bg-background/70 rounded-lg group text-sm border border-border/50"
                  >
                    <span className="flex-1 text-foreground/90">"{pain}"</span>
                    <button
                      onClick={() => handleRemovePain(category.key, pain)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-all"
                    >
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Input */}
              {painList.length < 5 && (
                <div className="flex gap-2">
                  <Input
                    placeholder={category.placeholder}
                    value={newPains[category.key]}
                    onChange={(e) => setNewPains(prev => ({ ...prev, [category.key]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPain(category.key);
                      }
                    }}
                    className="text-sm bg-background"
                  />
                  <Button 
                    onClick={() => handleAddPain(category.key)} 
                    variant="secondary" 
                    size="icon"
                    className="shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Primary Pain - Gradient Card */}
      <Card className="p-6 border-0 bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <Label className="text-xl font-bold text-white">
              🔥 DOLOR PRIMARIO
            </Label>
            <p className="text-sm text-white/90">
              De TODOS los dolores mencionados, ¿cuál es el que <strong>MÁS LE QUITA EL SUEÑO</strong>?
            </p>
          </div>
        </div>
        <Textarea
          placeholder='Ej: Trabajo 14 horas al día pero siento que no avanzo, estoy agotado y mi familia está sufriendo'
          value={pains?.primary || ''}
          onChange={(e) => updateAvatarPains({ primary: e.target.value })}
          rows={4}
          className="resize-none bg-white/95 text-foreground border-0 placeholder:text-muted-foreground"
        />
      </Card>

      {/* Validation Status */}
      <div className="mt-6 text-center">
        {!allCategoriesHaveMinimum || !pains?.primary?.trim() ? (
          <p className="text-sm text-destructive flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Completa mínimo 2 dolores por categoría y el dolor primario para continuar
          </p>
        ) : (
          <p className="text-sm text-green-600 dark:text-green-400">
            ✅ Sección completada correctamente
          </p>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-4">
        💡 <strong>Tip:</strong> Usa las palabras exactas que usa tu cliente. "Me siento gordo" es mejor que "tiene sobrepeso".
      </p>
    </div>
  );
}
