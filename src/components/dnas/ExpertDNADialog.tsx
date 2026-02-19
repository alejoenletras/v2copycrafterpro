import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Loader2 } from 'lucide-react';
import type { ExpertProfile } from '@/types';

const ADJECTIVE_OPTIONS = [
  'Directo', 'Cercano', 'Profesional', 'Inspirador', 'Provocador',
  'Empático', 'Enérgico', 'Calmado', 'Humorístico', 'Autoritario',
  'Casual', 'Formal', 'Motivador', 'Técnico', 'Narrativo',
];

interface ExpertDNADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, data: Partial<ExpertProfile>) => Promise<void>;
  initialName?: string;
  initialData?: Partial<ExpertProfile>;
  isLoading?: boolean;
}

export default function ExpertDNADialog({
  open, onOpenChange, onSave, initialName = '', initialData, isLoading,
}: ExpertDNADialogProps) {
  const [name, setName] = useState(initialName);
  const [voice, setVoice] = useState({
    name: '',
    adjectives: [] as string[],
    description: '',
    humorLevel: '' as string,
    sentenceLength: '' as string,
    useProfanity: '' as string,
  });
  const [story, setStory] = useState({
    lowestPoint: '',
    breakthrough: '',
    current: '',
    credentials: [] as string[],
  });
  const [beliefs, setBeliefs] = useState({
    beliefs: [] as string[],
    commonEnemy: '',
    centralPromise: '',
  });
  const [newCredential, setNewCredential] = useState('');
  const [newBelief, setNewBelief] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialName);
      if (initialData) {
        setVoice({
          name: initialData.voice?.name || '',
          adjectives: initialData.voice?.adjectives || [],
          description: initialData.voice?.description || '',
          humorLevel: initialData.voice?.humorLevel || '',
          sentenceLength: initialData.voice?.sentenceLength || '',
          useProfanity: initialData.voice?.useProfanity || '',
        });
        setStory({
          lowestPoint: initialData.story?.lowestPoint || '',
          breakthrough: initialData.story?.breakthrough || '',
          current: initialData.story?.current || '',
          credentials: initialData.story?.credentials || [],
        });
        setBeliefs({
          beliefs: initialData.beliefs?.beliefs || [],
          commonEnemy: initialData.beliefs?.commonEnemy || '',
          centralPromise: initialData.beliefs?.centralPromise || '',
        });
      } else {
        setVoice({ name: '', adjectives: [], description: '', humorLevel: '', sentenceLength: '', useProfanity: '' });
        setStory({ lowestPoint: '', breakthrough: '', current: '', credentials: [] });
        setBeliefs({ beliefs: [], commonEnemy: '', centralPromise: '' });
      }
    }
  }, [open, initialName, initialData]);

  const toggleAdjective = (adj: string) => {
    setVoice(prev => ({
      ...prev,
      adjectives: prev.adjectives.includes(adj)
        ? prev.adjectives.filter(a => a !== adj)
        : prev.adjectives.length < 5 ? [...prev.adjectives, adj] : prev.adjectives,
    }));
  };

  const addCredential = () => {
    if (newCredential.trim()) {
      setStory(prev => ({ ...prev, credentials: [...prev.credentials, newCredential.trim()] }));
      setNewCredential('');
    }
  };

  const addBelief = () => {
    if (newBelief.trim()) {
      setBeliefs(prev => ({ ...prev, beliefs: [...prev.beliefs, newBelief.trim()] }));
      setNewBelief('');
    }
  };

  const canSave = name.trim() && voice.name.trim() && voice.adjectives.length >= 3;

  const handleSave = async () => {
    const data: Partial<ExpertProfile> = {
      voice: {
        name: voice.name,
        adjectives: voice.adjectives,
        description: voice.description,
        humorLevel: (voice.humorLevel || 'medium') as any,
        sentenceLength: (voice.sentenceLength || 'mixed') as any,
        useProfanity: (voice.useProfanity || 'never') as any,
      },
      story: {
        lowestPoint: story.lowestPoint,
        breakthrough: story.breakthrough,
        current: story.current,
        credentials: story.credentials,
      },
      beliefs: {
        beliefs: beliefs.beliefs,
        commonEnemy: beliefs.commonEnemy,
        centralPromise: beliefs.centralPromise,
      },
    };
    await onSave(name.trim(), data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar' : 'Nueva'} Personalidad</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nombre del perfil *</Label>
            <Input
              placeholder="Ej: Carlos Jiménez, Mi Marca..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <Accordion type="multiple" defaultValue={['voice', 'story', 'beliefs']}>
            {/* VOZ */}
            <AccordionItem value="voice">
              <AccordionTrigger>Voz del Experto</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div>
                  <Label>Nombre del experto *</Label>
                  <Input
                    placeholder="Nombre completo"
                    value={voice.name}
                    onChange={e => setVoice(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Adjetivos de tono (3-5) *</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ADJECTIVE_OPTIONS.map(adj => (
                      <Badge
                        key={adj}
                        variant={voice.adjectives.includes(adj) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleAdjective(adj)}
                      >
                        {adj}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Humor</Label>
                    <Select value={voice.humorLevel} onValueChange={v => setVoice(p => ({ ...p, humorLevel: v }))}>
                      <SelectTrigger><SelectValue placeholder="Nivel" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin humor</SelectItem>
                        <SelectItem value="low">Bajo</SelectItem>
                        <SelectItem value="medium">Medio</SelectItem>
                        <SelectItem value="high">Alto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Oraciones</Label>
                    <Select value={voice.sentenceLength} onValueChange={v => setVoice(p => ({ ...p, sentenceLength: v }))}>
                      <SelectTrigger><SelectValue placeholder="Longitud" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Cortas</SelectItem>
                        <SelectItem value="medium">Medias</SelectItem>
                        <SelectItem value="long">Largas</SelectItem>
                        <SelectItem value="mixed">Mixtas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lenguaje</Label>
                    <Select value={voice.useProfanity} onValueChange={v => setVoice(p => ({ ...p, useProfanity: v }))}>
                      <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Formal</SelectItem>
                        <SelectItem value="rarely">Casual</SelectItem>
                        <SelectItem value="sometimes">Coloquial</SelectItem>
                        <SelectItem value="often">Callejero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* HISTORIA */}
            <AccordionItem value="story">
              <AccordionTrigger>Historia de Transformación</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div>
                  <Label>Punto más bajo</Label>
                  <Textarea
                    placeholder="¿Cuál fue tu peor momento antes del cambio?"
                    value={story.lowestPoint}
                    onChange={e => setStory(prev => ({ ...prev, lowestPoint: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Descubrimiento / Punto de quiebre</Label>
                  <Textarea
                    placeholder="¿Qué descubriste que cambió todo?"
                    value={story.breakthrough}
                    onChange={e => setStory(prev => ({ ...prev, breakthrough: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Situación actual</Label>
                  <Textarea
                    placeholder="¿Dónde estás hoy gracias a ese cambio?"
                    value={story.current}
                    onChange={e => setStory(prev => ({ ...prev, current: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Credenciales</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: +12,000 alumnos"
                      value={newCredential}
                      onChange={e => setNewCredential(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCredential())}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={addCredential}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {story.credentials.map((c, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {c}
                        <X className="h-3 w-3 cursor-pointer" onClick={() =>
                          setStory(prev => ({ ...prev, credentials: prev.credentials.filter((_, j) => j !== i) }))
                        } />
                      </Badge>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* CREENCIAS */}
            <AccordionItem value="beliefs">
              <AccordionTrigger>Creencias y Promesa</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div>
                  <Label>Creencias centrales</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: Cualquiera puede aprender a vender online"
                      value={newBelief}
                      onChange={e => setNewBelief(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBelief())}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={addBelief}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {beliefs.beliefs.map((b, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {b}
                        <X className="h-3 w-3 cursor-pointer" onClick={() =>
                          setBeliefs(prev => ({ ...prev, beliefs: prev.beliefs.filter((_, j) => j !== i) }))
                        } />
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Enemigo común</Label>
                  <Input
                    placeholder="¿Contra qué luchas? Ej: Los gurús que venden humo"
                    value={beliefs.commonEnemy}
                    onChange={e => setBeliefs(prev => ({ ...prev, commonEnemy: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Promesa central</Label>
                  <Textarea
                    placeholder="Tu promesa principal en una oración"
                    value={beliefs.centralPromise}
                    onChange={e => setBeliefs(prev => ({ ...prev, centralPromise: e.target.value }))}
                    rows={2}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
