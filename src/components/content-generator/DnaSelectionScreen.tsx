import { useEffect } from 'react';
import { useContentGeneratorStore } from '@/store/contentGeneratorStore';
import { useDNAs } from '@/hooks/useDNAs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Mic, Users, Package, Star, AlertCircle, Wand2, ExternalLink, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const DNA_SLOTS = [
  {
    key: 'personality' as const,
    type: 'expert' as const,
    label: 'Personalidad',
    description: 'Tu voz, historia y credenciales',
    icon: Mic,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  {
    key: 'audience' as const,
    type: 'audience' as const,
    label: 'Audiencia',
    description: 'Tu cliente ideal y sus dolores',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    key: 'product' as const,
    type: 'product' as const,
    label: 'Producto',
    description: 'Lo que vendes y tu promesa de transformación',
    icon: Package,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
] as const;

export default function DnaSelectionScreen() {
  const {
    selectedStructure,
    selectedDnas,
    extraContext,
    setSelectedDna,
    setExtraContext,
    startSessionWithDnas,
    setCurrentScreen,
  } = useContentGeneratorStore();

  const { dnas: allDnas } = useDNAs();
  const navigate = useNavigate();

  // Auto-select defaults on mount
  useEffect(() => {
    if (!allDnas) return;
    for (const slot of DNA_SLOTS) {
      if (!selectedDnas[slot.key]) {
        const defaultDna = allDnas.find(d => d.type === slot.type && d.is_default);
        if (defaultDna) {
          setSelectedDna(slot.key, defaultDna);
        }
      }
    }
  }, [allDnas]);

  if (!selectedStructure) return null;

  const canGenerate = selectedDnas.personality || selectedDnas.audience || selectedDnas.product;

  const handleGenerate = async () => {
    await startSessionWithDnas();
  };

  const getDnaOptions = (type: 'expert' | 'audience' | 'product') =>
    allDnas?.filter(d => d.type === type) ?? [];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <button onClick={() => setCurrentScreen(1)} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> {selectedStructure.name}
          </button>
        </div>
        <h2 className="text-2xl font-display font-bold mb-1">Selecciona tus DNAs</h2>
        <p className="text-muted-foreground text-sm">
          La IA usará estos perfiles para generar copy con tu voz, para tu audiencia, sobre tu producto — sin que tengas que llenar ningún campo adicional.
        </p>
      </div>

      {/* DNA slots */}
      <div className="space-y-4 mb-6">
        {DNA_SLOTS.map((slot) => {
          const Icon = slot.icon;
          const options = getDnaOptions(slot.type);
          const selected = selectedDnas[slot.key];
          const hasDefault = options.some(d => d.is_default);

          return (
            <Card key={slot.key} className={cn('p-4', selected && slot.border)}>
              <div className="flex items-start gap-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', slot.bg)}>
                  <Icon className={cn('w-4.5 h-4.5', slot.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm">{slot.label}</p>
                    {selected?.is_default && (
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 h-4 px-1 gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{slot.description}</p>

                  {options.length === 0 ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> No tienes perfiles de {slot.label.toLowerCase()}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={() => navigate('/dnas')}
                      >
                        <ExternalLink className="w-3 h-3" /> Crear
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={selected?.id ?? ''}
                      onValueChange={(id) => {
                        const dna = options.find(d => d.id === id) ?? null;
                        setSelectedDna(slot.key, dna);
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={`Seleccionar ${slot.label.toLowerCase()}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((dna) => (
                          <SelectItem key={dna.id} value={dna.id}>
                            <span className="flex items-center gap-1.5">
                              {dna.name}
                              {dna.is_default && <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Extra context */}
      <div className="mb-8 space-y-1.5">
        <label className="text-sm font-medium">Contexto adicional <span className="text-muted-foreground font-normal">(opcional)</span></label>
        <Textarea
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          placeholder="URL del evento, precio especial, fecha límite, campaña específica, nombre de la promo, instrucciones adicionales para esta generación..."
          rows={3}
          className="resize-none text-sm"
        />
        <p className="text-xs text-muted-foreground">Solo para esta generación — no se guarda en el DNA.</p>
      </div>

      {/* No DNA warning */}
      {!canGenerate && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Selecciona al menos un DNA para continuar. Puedes dejar algunos vacíos y la IA hará lo mejor posible.</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => setCurrentScreen(1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white h-11 text-base font-semibold gap-2"
        >
          <Wand2 className="w-4 h-4" />
          Generar {selectedStructure.blocks.length} bloques con IA
        </Button>
      </div>

      {canGenerate && (
        <p className="text-xs text-center text-muted-foreground mt-3">
          La IA generará todos los bloques de forma secuencial usando tus DNAs como contexto.
        </p>
      )}
    </div>
  );
}
