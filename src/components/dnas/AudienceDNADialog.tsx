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
import { CONSCIOUSNESS_LEVELS } from '@/lib/constants';
import type { AvatarProfile } from '@/types';

interface AudienceDNADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, data: Partial<AvatarProfile>) => Promise<void>;
  initialName?: string;
  initialData?: Partial<AvatarProfile>;
  isLoading?: boolean;
}

export default function AudienceDNADialog({
  open, onOpenChange, onSave, initialName = '', initialData, isLoading,
}: AudienceDNADialogProps) {
  const [name, setName] = useState(initialName);
  const [consciousness, setConsciousness] = useState<number | undefined>(undefined);
  const [pains, setPains] = useState({
    economic: [] as string[],
    emotional: [] as string[],
    social: [] as string[],
    identity: [] as string[],
    primary: '',
  });
  const [desires, setDesires] = useState({
    identityTransformation: '',
    tangibleResults: { economic: '', lifestyle: '', relationships: '' },
    timeframe: '',
  });
  const [objections, setObjections] = useState<Array<{ exact_words: string; root_cause: string; destruction: string }>>([]);
  const [painInputs, setPainInputs] = useState({ economic: '', emotional: '', social: '', identity: '' });

  useEffect(() => {
    if (open) {
      setName(initialName);
      if (initialData) {
        setConsciousness(initialData.consciousnessLevel);
        setPains({
          economic: initialData.pains?.economic || [],
          emotional: initialData.pains?.emotional || [],
          social: initialData.pains?.social || [],
          identity: initialData.pains?.identity || [],
          primary: initialData.pains?.primary || '',
        });
        setDesires({
          identityTransformation: initialData.desires?.identityTransformation || '',
          tangibleResults: {
            economic: initialData.desires?.tangibleResults?.economic || '',
            lifestyle: initialData.desires?.tangibleResults?.lifestyle || '',
            relationships: initialData.desires?.tangibleResults?.relationships || '',
          },
          timeframe: initialData.desires?.timeframe || '',
        });
        setObjections(initialData.objections || []);
      } else {
        setConsciousness(undefined);
        setPains({ economic: [], emotional: [], social: [], identity: [], primary: '' });
        setDesires({ identityTransformation: '', tangibleResults: { economic: '', lifestyle: '', relationships: '' }, timeframe: '' });
        setObjections([]);
      }
      setPainInputs({ economic: '', emotional: '', social: '', identity: '' });
    }
  }, [open, initialName, initialData]);

  const addPain = (category: 'economic' | 'emotional' | 'social' | 'identity') => {
    const value = painInputs[category].trim();
    if (value) {
      setPains(prev => ({ ...prev, [category]: [...prev[category], value] }));
      setPainInputs(prev => ({ ...prev, [category]: '' }));
    }
  };

  const removePain = (category: 'economic' | 'emotional' | 'social' | 'identity', index: number) => {
    setPains(prev => ({ ...prev, [category]: prev[category].filter((_, i) => i !== index) }));
  };

  const addObjection = () => {
    setObjections(prev => [...prev, { exact_words: '', root_cause: '', destruction: '' }]);
  };

  const updateObjection = (index: number, field: string, value: string) => {
    setObjections(prev => prev.map((obj, i) => i === index ? { ...obj, [field]: value } : obj));
  };

  const removeObjection = (index: number) => {
    setObjections(prev => prev.filter((_, i) => i !== index));
  };

  const canSave = name.trim() && consciousness !== undefined;

  const handleSave = async () => {
    const data: Partial<AvatarProfile> = {
      consciousnessLevel: consciousness as any,
      pains: {
        economic: pains.economic,
        emotional: pains.emotional,
        social: pains.social,
        identity: pains.identity,
        primary: pains.primary,
      },
      desires: {
        identityTransformation: desires.identityTransformation,
        tangibleResults: desires.tangibleResults,
        timeframe: desires.timeframe,
      },
      objections: objections.filter(o => o.exact_words.trim()),
    };
    await onSave(name.trim(), data);
  };

  const PainSection = ({ category, label, emoji }: { category: 'economic' | 'emotional' | 'social' | 'identity'; label: string; emoji: string }) => (
    <div>
      <Label>{emoji} {label}</Label>
      <div className="flex gap-2 mt-1">
        <Input
          placeholder={`Dolor ${label.toLowerCase()}...`}
          value={painInputs[category]}
          onChange={e => setPainInputs(prev => ({ ...prev, [category]: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPain(category))}
        />
        <Button type="button" size="sm" variant="outline" onClick={() => addPain(category)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        {pains[category].map((p, i) => (
          <Badge key={i} variant="secondary" className="gap-1">
            {p}
            <X className="h-3 w-3 cursor-pointer" onClick={() => removePain(category, i)} />
          </Badge>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar' : 'Nuevo'} Público</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nombre del público *</Label>
            <Input
              placeholder="Ej: Emprendedores digitales, Dueños de startups..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <Accordion type="multiple" defaultValue={['consciousness', 'pains', 'desires', 'objections']}>
            {/* CONSCIENCIA */}
            <AccordionItem value="consciousness">
              <AccordionTrigger>Nivel de Consciencia *</AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                {CONSCIOUSNESS_LEVELS.map(level => (
                  <div
                    key={level.level}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      consciousness === level.level
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                    onClick={() => setConsciousness(level.level)}
                  >
                    <div className="font-medium">Nivel {level.level}: {level.name}</div>
                    <div className="text-sm text-muted-foreground">{level.description}</div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* DOLORES */}
            <AccordionItem value="pains">
              <AccordionTrigger>Dolores del Avatar</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <PainSection category="economic" label="Económicos" emoji="" />
                <PainSection category="emotional" label="Emocionales" emoji="" />
                <PainSection category="social" label="Sociales" emoji="" />
                <PainSection category="identity" label="Identidad" emoji="" />
                <div>
                  <Label>Dolor primario (el más importante)</Label>
                  <Input
                    placeholder="El dolor principal que los mueve a actuar"
                    value={pains.primary}
                    onChange={e => setPains(prev => ({ ...prev, primary: e.target.value }))}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* DESEOS */}
            <AccordionItem value="desires">
              <AccordionTrigger>Deseos del Avatar</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div>
                  <Label>Transformación de identidad</Label>
                  <Textarea
                    placeholder="¿En quién quieren convertirse?"
                    value={desires.identityTransformation}
                    onChange={e => setDesires(prev => ({ ...prev, identityTransformation: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Resultado económico</Label>
                    <Input
                      placeholder="Meta financiera"
                      value={desires.tangibleResults.economic}
                      onChange={e => setDesires(prev => ({
                        ...prev,
                        tangibleResults: { ...prev.tangibleResults, economic: e.target.value },
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Estilo de vida</Label>
                    <Input
                      placeholder="Meta lifestyle"
                      value={desires.tangibleResults.lifestyle}
                      onChange={e => setDesires(prev => ({
                        ...prev,
                        tangibleResults: { ...prev.tangibleResults, lifestyle: e.target.value },
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Relaciones</Label>
                    <Input
                      placeholder="Meta relaciones"
                      value={desires.tangibleResults.relationships}
                      onChange={e => setDesires(prev => ({
                        ...prev,
                        tangibleResults: { ...prev.tangibleResults, relationships: e.target.value },
                      }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Marco temporal</Label>
                  <Select value={desires.timeframe} onValueChange={v => setDesires(prev => ({ ...prev, timeframe: v }))}>
                    <SelectTrigger><SelectValue placeholder="¿En cuánto tiempo?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Inmediato (días)</SelectItem>
                      <SelectItem value="short">Corto plazo (semanas)</SelectItem>
                      <SelectItem value="medium">Mediano plazo (meses)</SelectItem>
                      <SelectItem value="long">Largo plazo (año+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* OBJECIONES */}
            <AccordionItem value="objections">
              <AccordionTrigger>Objeciones Reales</AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                {objections.map((obj, i) => (
                  <div key={i} className="p-3 border rounded-lg space-y-2 relative">
                    <Button
                      type="button" size="sm" variant="ghost"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => removeObjection(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Palabras exactas del avatar"
                      value={obj.exact_words}
                      onChange={e => updateObjection(i, 'exact_words', e.target.value)}
                    />
                    <Input
                      placeholder="Causa raíz de la objeción"
                      value={obj.root_cause}
                      onChange={e => updateObjection(i, 'root_cause', e.target.value)}
                    />
                    <Input
                      placeholder="Cómo destruyes esta objeción"
                      value={obj.destruction}
                      onChange={e => updateObjection(i, 'destruction', e.target.value)}
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addObjection} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Agregar objeción
                </Button>
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
