import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Users, ShieldQuestion, Plus, X, MessageSquareWarning, Lightbulb, AlertCircle, Info, Eye } from 'lucide-react';
import { useState } from 'react';
import { RealObjection } from '@/types';
import { cn } from '@/lib/utils';

const ROOT_CAUSES = [
  { value: 'no-time', label: 'Falta de tiempo real' },
  { value: 'fear-failure', label: 'Miedo al fracaso' },
  { value: 'not-priority', label: 'No cree que sea prioridad' },
  { value: 'tried-before', label: 'Ya lo intentó antes y falló' },
  { value: 'no-money', label: 'Falta de dinero' },
  { value: 'no-trust', label: 'No confía en que funcione para él/ella' },
  { value: 'needs-permission', label: 'Necesita permiso de pareja/familia' },
  { value: 'not-qualified', label: 'No se siente calificado' },
  { value: 'other', label: 'Otro (especificar)' },
];

interface ObjectionFormState {
  exact_words: string;
  root_cause: string;
  destruction: string;
}

const initialFormState: ObjectionFormState = {
  exact_words: '',
  root_cause: '',
  destruction: '',
};

export default function AvatarObjectionsStep() {
  const { project, updateAvatarObjections } = useWizardStore();
  const objections = project.avatarProfile?.objections || [];
  const hiddenObjection = (project.avatarProfile as any)?.hiddenObjection || '';
  const [newObjection, setNewObjection] = useState<ObjectionFormState>(initialFormState);

  const handleAddObjection = () => {
    if (!newObjection.exact_words.trim() || !newObjection.root_cause || !newObjection.destruction.trim()) {
      return;
    }

    if (objections.length >= 8) return;

    const objectionToAdd: RealObjection = {
      exact_words: newObjection.exact_words.trim(),
      root_cause: ROOT_CAUSES.find(r => r.value === newObjection.root_cause)?.label || newObjection.root_cause,
      destruction: newObjection.destruction.trim(),
    };

    updateAvatarObjections([...objections, objectionToAdd]);
    setNewObjection(initialFormState);
  };

  const handleRemoveObjection = (index: number) => {
    updateAvatarObjections(objections.filter((_, i) => i !== index));
  };

  const handleUpdateHiddenObjection = (value: string) => {
    // Store hidden objection in avatarProfile
    const { project, updateProject } = useWizardStore.getState();
    updateProject({
      avatarProfile: {
        ...project.avatarProfile,
        hiddenObjection: value,
      } as any,
    });
  };

  const hasMinimum = objections.length >= 3;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 rounded-full text-accent text-sm font-medium mb-4">
          <Users className="w-4 h-4" />
          Pilar 2: El Avatar
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          🚧 Objeciones REALES de tu Avatar
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Estas NO son objeciones que TÚ crees que tienen. Son objeciones que <strong className="text-foreground">ELLOS han expresado</strong>.
        </p>
      </div>

      {/* Info Box */}
      <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>
            <strong>📊 Fuente recomendada:</strong> Llamadas de venta, emails de prospectos, comentarios en redes, encuestas
          </span>
        </p>
      </div>

      {/* Existing Objections */}
      {objections.length > 0 && (
        <div className="mb-8">
          <Label className="text-sm text-muted-foreground mb-3 block">
            Objeciones registradas ({objections.length}/8) - Mínimo 3 requeridas
          </Label>
          <Accordion type="single" collapsible className="space-y-3">
            {objections.map((objection, index) => (
              <AccordionItem
                key={index}
                value={`objection-${index}`}
                className="border rounded-lg overflow-hidden bg-card"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-3 text-left flex-1">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquareWarning className="w-4 h-4 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate text-sm">
                        "{objection.exact_words}"
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Raíz: {objection.root_cause}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="p-3 bg-emerald-500/10 rounded-lg mb-3">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">💥 Destrucción:</p>
                    <p className="text-sm text-foreground">{objection.destruction}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveObjection(index)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Eliminar objeción
                  </Button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* Add New Objection Form */}
      {objections.length < 8 && (
        <Card className="p-6 border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldQuestion className="w-5 h-5 text-primary" />
            </div>
            <div>
              <Label className="text-lg font-semibold text-foreground">
                Agregar nueva objeción
              </Label>
              <p className="text-sm text-muted-foreground">
                Mínimo 3, máximo 8 objeciones
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Exact Words */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                1. Palabras exactas de la objeción
              </Label>
              <Input
                placeholder='Ej: "No tengo tiempo, ya trabajo 10 horas al día"'
                value={newObjection.exact_words}
                onChange={(e) => setNewObjection(prev => ({ ...prev, exact_words: e.target.value }))}
              />
            </div>

            {/* Root Cause */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                2. ¿Cuál es la RAÍZ de esta objeción?
              </Label>
              <Select
                value={newObjection.root_cause}
                onValueChange={(value) => setNewObjection(prev => ({ ...prev, root_cause: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona la verdadera razón detrás..." />
                </SelectTrigger>
                <SelectContent>
                  {ROOT_CAUSES.map((cause) => (
                    <SelectItem key={cause.value} value={cause.value}>
                      {cause.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destruction */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                3. Tu respuesta/destrucción de objeción
              </Label>
              <Textarea
                placeholder='Ej: "El problema ES trabajar tanto. Mis clientes reducen horas y aumentan ingresos. Carlos trabajaba 12h, ahora 4h y gana más."'
                value={newObjection.destruction}
                onChange={(e) => setNewObjection(prev => ({ ...prev, destruction: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleAddObjection}
              disabled={!newObjection.exact_words.trim() || !newObjection.root_cause || !newObjection.destruction.trim()}
              className="w-full"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Nueva Objeción
            </Button>
          </div>
        </Card>
      )}

      {/* Hidden Objection Card */}
      <Card className="p-6 border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Eye className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <Label className="text-lg font-bold text-foreground">
              💡 OBJECIÓN OCULTA (La que NO dicen)
            </Label>
            <p className="text-sm text-muted-foreground">
              ¿Cuál es la objeción que <strong>NO expresan</strong> pero que realmente les detiene?
            </p>
          </div>
        </div>
        
        <div className="mb-3 p-3 bg-background/60 rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground italic">
            <strong>Ejemplo:</strong> Dicen "no tengo dinero" pero realmente es "no confío en que esto funcione para mí"
          </p>
        </div>

        <Textarea
          placeholder='Ej: "Tienen miedo de intentarlo y fracasar otra vez, de ser juzgados por su familia si no funciona..."'
          value={hiddenObjection}
          onChange={(e) => handleUpdateHiddenObjection(e.target.value)}
          rows={3}
          className="resize-none bg-background/80"
        />
      </Card>

      {/* Validation & Tips */}
      <div className="mt-6 text-center space-y-3">
        {!hasMinimum ? (
          <p className="text-sm text-destructive flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Necesitas al menos {3 - objections.length} objeción(es) más para continuar
          </p>
        ) : (
          <p className="text-sm text-green-600 dark:text-green-400">
            ✅ Tienes {objections.length} objeciones registradas
          </p>
        )}

        <div className="p-3 bg-muted/50 rounded-lg inline-block">
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Tip:</strong> Las objeciones más comunes son: tiempo, dinero, "no es para mí",
              "lo intenté y no funcionó". Prepara respuestas poderosas para cada una.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
