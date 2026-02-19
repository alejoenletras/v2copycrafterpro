import { useEffect } from 'react';
import { useWizardStore } from '@/store/wizardStore';
import { useDNAs } from '@/hooks/useDNAs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mic, Users, Package, Loader2, Sparkles } from 'lucide-react';
import type { ExpertProfile, AvatarProfile, ProductInfo } from '@/types';

const MANUAL_VALUE = '__manual__';

export default function DNASelectionStep() {
  const { dnas, isLoading } = useDNAs();
  const {
    selectedDNAs,
    selectExpertDNA,
    selectAudienceDNA,
    selectProductDNA,
  } = useWizardStore();

  const expertDNAs = dnas?.filter(d => d.type === 'expert') || [];
  const audienceDNAs = dnas?.filter(d => d.type === 'audience') || [];
  const productDNAs = dnas?.filter(d => d.type === 'product') || [];

  const hasDNAs = expertDNAs.length > 0 || audienceDNAs.length > 0 || productDNAs.length > 0;

  const handleExpertChange = (value: string) => {
    if (value === MANUAL_VALUE) {
      selectExpertDNA(null);
      return;
    }
    const dna = expertDNAs.find(d => d.id === value);
    if (dna) selectExpertDNA(dna);
  };

  const handleAudienceChange = (value: string) => {
    if (value === MANUAL_VALUE) {
      selectAudienceDNA(null);
      return;
    }
    const dna = audienceDNAs.find(d => d.id === value);
    if (dna) selectAudienceDNA(dna);
  };

  const handleProductChange = (value: string) => {
    if (value === MANUAL_VALUE) {
      selectProductDNA(null);
      return;
    }
    const dna = productDNAs.find(d => d.id === value);
    if (dna) selectProductDNA(dna);
  };

  const selectedCount = [selectedDNAs.expert, selectedDNAs.audience, selectedDNAs.product].filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">DNAs de Campana</h2>
        <p className="text-muted-foreground mt-1">
          Selecciona perfiles guardados o elige "Crear manualmente" para llenar el brief paso a paso
        </p>
        {selectedCount > 0 && (
          <Badge variant="default" className="mt-2">
            <Sparkles className="h-3 w-3 mr-1" />
            {selectedCount} DNA{selectedCount > 1 ? 's' : ''} seleccionado{selectedCount > 1 ? 's' : ''} — {
              selectedCount === 3 ? 'Irás directo a Gatillos Mentales' : 'Se omitirán los pasos correspondientes'
            }
          </Badge>
        )}
      </div>

      {!hasDNAs && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground">
              No tienes DNAs guardados aún. Puedes crearlos desde la página de{' '}
              <a href="/dnas" className="text-primary underline">DNAs</a>{' '}
              o continuar con el brief manual.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {/* Experto */}
        <Card className={selectedDNAs.expert ? 'border-primary/50 bg-primary/5' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mic className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Personalidad (Experto)</CardTitle>
                <CardDescription className="text-xs">Voz, historia y creencias del experto</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedDNAs.expert || MANUAL_VALUE}
              onValueChange={handleExpertChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MANUAL_VALUE}>Crear manualmente (brief completo)</SelectItem>
                {expertDNAs.map(dna => (
                  <SelectItem key={dna.id} value={dna.id}>
                    {dna.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDNAs.expert && (
              <div className="mt-2 text-xs text-muted-foreground">
                Se omitirán: Voz del Experto, Historia, Creencias
              </div>
            )}
          </CardContent>
        </Card>

        {/* Público */}
        <Card className={selectedDNAs.audience ? 'border-accent/50 bg-accent/5' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-accent" />
              </div>
              <div>
                <CardTitle className="text-base">Público (Avatar)</CardTitle>
                <CardDescription className="text-xs">Consciencia, dolores, deseos y objeciones</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedDNAs.audience || MANUAL_VALUE}
              onValueChange={handleAudienceChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MANUAL_VALUE}>Crear manualmente (brief completo)</SelectItem>
                {audienceDNAs.map(dna => (
                  <SelectItem key={dna.id} value={dna.id}>
                    {dna.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDNAs.audience && (
              <div className="mt-2 text-xs text-muted-foreground">
                Se omitirán: Consciencia, Dolores, Deseos, Objeciones
              </div>
            )}
          </CardContent>
        </Card>

        {/* Producto */}
        <Card className={selectedDNAs.product ? 'border-emerald-500/50 bg-emerald-500/5' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Producto / Servicio</CardTitle>
                <CardDescription className="text-xs">Nombre, precio, garantía y bonos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedDNAs.product || MANUAL_VALUE}
              onValueChange={handleProductChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MANUAL_VALUE}>Crear manualmente (brief completo)</SelectItem>
                {productDNAs.map(dna => (
                  <SelectItem key={dna.id} value={dna.id}>
                    {dna.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDNAs.product && (
              <div className="mt-2 text-xs text-muted-foreground">
                Se omitirá: Información del Producto
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
