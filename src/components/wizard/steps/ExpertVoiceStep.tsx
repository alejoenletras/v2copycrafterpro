import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONE_ADJECTIVES = [
  { id: 'directo', label: 'Directo/a' },
  { id: 'cercano', label: 'Cercano/a' },
  { id: 'profesional', label: 'Profesional' },
  { id: 'inspirador', label: 'Inspirador/a' },
  { id: 'provocador', label: 'Provocador/a' },
  { id: 'empatico', label: 'Empático/a' },
  { id: 'serio', label: 'Serio/a' },
  { id: 'divertido', label: 'Divertido/a' },
  { id: 'irreverente', label: 'Irreverente' },
  { id: 'motivacional', label: 'Motivacional' },
  { id: 'tecnico', label: 'Técnico/a' },
  { id: 'desafiante', label: 'Desafiante' },
  { id: 'protector', label: 'Protector/a' },
  { id: 'mentor', label: 'Mentor/a' },
];

const HUMOR_OPTIONS = [
  { value: 'high', label: 'Sí, frecuentemente' },
  { value: 'medium', label: 'A veces, controlado' },
  { value: 'low', label: 'Raramente' },
  { value: 'none', label: 'Nunca, soy más serio/a' },
];

const SENTENCE_OPTIONS = [
  { value: 'long', label: 'Textos largos y detallados' },
  { value: 'medium', label: 'Medio, balance entre detalle y brevedad' },
  { value: 'short', label: 'Corto y al punto' },
  { value: 'mixed', label: 'Muy breve, estilo Twitter' },
];

const PROFANITY_OPTIONS = [
  { value: 'often', label: 'Sí, son parte de mi marca' },
  { value: 'sometimes', label: 'Solo cuando enfatizo algo importante' },
  { value: 'rarely', label: 'Muy raramente' },
  { value: 'never', label: 'Nunca' },
];

export default function ExpertVoiceStep() {
  const { project, updateExpertVoice } = useWizardStore();
  const voice = project.expertProfile?.voice;

  const adjectives = voice?.adjectives || [];

  const handleToggleAdjective = (adj: string, checked: boolean) => {
    if (checked && adjectives.length < 5) {
      updateExpertVoice({ adjectives: [...adjectives, adj] });
    } else if (!checked) {
      updateExpertVoice({ adjectives: adjectives.filter((a) => a !== adj) });
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
          <User className="w-4 h-4" />
          Pilar 1: El Experto
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Define la voz de tu marca
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Tu voz única es lo que te diferencia. Capturemos tu esencia para que el copy suene auténticamente a ti.
        </p>
      </div>

      <Card className="p-8 space-y-10">
        {/* Name */}
        <div>
          <Label htmlFor="expert-name" className="text-lg font-semibold mb-2 block">
            Nombre del experto o marca
          </Label>
          <p className="text-sm text-muted-foreground mb-3">
            Cómo quieres que te llamen en el copy
          </p>
          <Input
            id="expert-name"
            placeholder="Ej: Juan Carlos, Coach María, Dr. Ramírez..."
            value={voice?.name || ''}
            onChange={(e) => updateExpertVoice({ name: e.target.value })}
            className="text-lg"
          />
        </div>

        {/* Tone Adjectives */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-5 h-5 text-primary" />
            <Label className="text-lg font-semibold">
              Tono de voz
            </Label>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Selecciona 3-5 adjetivos que definen tu estilo de comunicación
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TONE_ADJECTIVES.map((adj) => {
              const isSelected = adjectives.includes(adj.label);
              const isDisabled = !isSelected && adjectives.length >= 5;

              return (
                <label
                  key={adj.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleToggleAdjective(adj.label, !!checked)}
                    disabled={isDisabled}
                  />
                  <span className="font-medium text-foreground">{adj.label}</span>
                </label>
              );
            })}
          </div>

          <p className="text-sm text-muted-foreground mt-3">
            {adjectives.length}/5 seleccionados {adjectives.length < 3 && "(mínimo 3)"}
          </p>
        </div>

        {/* Humor Level */}
        <div>
          <Label className="text-lg font-semibold mb-4 block">
            ¿Usas humor?
          </Label>
          <RadioGroup
            value={voice?.humorLevel || ''}
            onValueChange={(value) => updateExpertVoice({ humorLevel: value as any })}
            className="space-y-3"
          >
            {HUMOR_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                  voice?.humorLevel === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={option.value} />
                <span className="font-medium text-foreground">{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Sentence Length */}
        <div>
          <Label className="text-lg font-semibold mb-4 block">
            Longitud de escritura
          </Label>
          <RadioGroup
            value={voice?.sentenceLength || ''}
            onValueChange={(value) => updateExpertVoice({ sentenceLength: value as any })}
            className="space-y-3"
          >
            {SENTENCE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                  voice?.sentenceLength === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={option.value} />
                <span className="font-medium text-foreground">{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Profanity Usage */}
        <div>
          <Label className="text-lg font-semibold mb-4 block">
            ¿Usas groserías/palabras fuertes?
          </Label>
          <RadioGroup
            value={voice?.useProfanity || ''}
            onValueChange={(value) => updateExpertVoice({ useProfanity: value as any })}
            className="space-y-3"
          >
            {PROFANITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                  voice?.useProfanity === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={option.value} />
                <span className="font-medium text-foreground">{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
      </Card>
    </div>
  );
}
