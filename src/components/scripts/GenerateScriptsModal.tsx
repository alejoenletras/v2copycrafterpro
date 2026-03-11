import { useState } from 'react';
import { useDNAs } from '@/hooks/useDNAs';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Sparkles } from 'lucide-react';
import type { ScriptFormat, ScriptTargetPlatform } from '@/types';

interface GenerateScriptsModalProps {
  open: boolean;
  onClose: () => void;
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function GenerateScriptsModal({ open, onClose }: GenerateScriptsModalProps) {
  const { toast } = useToast();
  const { dnas } = useDNAs();

  const expertDnas = dnas?.filter(d => d.type === 'expert') ?? [];
  const audienceDnas = dnas?.filter(d => d.type === 'audience') ?? [];
  const productDnas = dnas?.filter(d => d.type === 'product') ?? [];

  const defaultExpert = expertDnas.find(d => d.is_default)?.id ?? expertDnas[0]?.id ?? '';
  const defaultAudience = audienceDnas.find(d => d.is_default)?.id ?? audienceDnas[0]?.id ?? '';
  const defaultProduct = productDnas.find(d => d.is_default)?.id ?? productDnas[0]?.id ?? '';

  const [personalityDnaId, setPersonalityDnaId] = useState(defaultExpert);
  const [audienceDnaId, setAudienceDnaId] = useState(defaultAudience);
  const [productDnaId, setProductDnaId] = useState(defaultProduct);
  const [count, setCount] = useState(10);
  const [scriptFormat, setScriptFormat] = useState<ScriptFormat>('video_script');
  const [targetPlatform, setTargetPlatform] = useState<ScriptTargetPlatform>('multi');
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerate = personalityDnaId && audienceDnaId && productDnaId;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/trigger-script-generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify({
          personality_dna_id: personalityDnaId,
          audience_dna_id: audienceDnaId,
          product_dna_id: productDnaId,
          count,
          script_format: scriptFormat,
          target_platform: targetPlatform,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Generación iniciada',
          description: `Generando ${count} guiones. Aparecerán en la página de Guiones Modelados en unos minutos.`,
        });
        onClose();
      } else {
        toast({ title: 'Error', description: data.error ?? 'No se pudo iniciar la generación', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Generar guiones modelados
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* DNA selectors */}
          <div>
            <label className="text-sm font-medium">DNA de Personalidad *</label>
            <select
              className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-emerald-400"
              value={personalityDnaId}
              onChange={e => setPersonalityDnaId(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {expertDnas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">DNA de Audiencia *</label>
            <select
              className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-emerald-400"
              value={audienceDnaId}
              onChange={e => setAudienceDnaId(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {audienceDnas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">DNA de Producto *</label>
            <select
              className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-emerald-400"
              value={productDnaId}
              onChange={e => setProductDnaId(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {productDnas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Count */}
          <div>
            <label className="text-sm font-medium">Cantidad de guiones</label>
            <div className="flex gap-2 mt-1">
              {[5, 10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`flex-1 py-1.5 text-sm rounded-md border transition-colors ${
                    count === n ? 'bg-emerald-600 text-white border-emerald-600' : 'border-border hover:border-emerald-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="text-sm font-medium">Formato</label>
            <div className="flex gap-2 mt-1">
              {([
                { value: 'video_script', label: 'Video Script' },
                { value: 'written_ad', label: 'Ad Escrito' },
                { value: 'carousel_script', label: 'Carousel' },
              ] as { value: ScriptFormat; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setScriptFormat(opt.value)}
                  className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                    scriptFormat === opt.value ? 'bg-emerald-600 text-white border-emerald-600' : 'border-border hover:border-emerald-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="text-sm font-medium">Plataforma destino</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {([
                { value: 'multi', label: 'Multi' },
                { value: 'facebook', label: 'Facebook' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'tiktok', label: 'TikTok' },
              ] as { value: ScriptTargetPlatform; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTargetPlatform(opt.value)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    targetPlatform === opt.value ? 'bg-emerald-600 text-white border-emerald-600' : 'border-border hover:border-emerald-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {!canGenerate && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Selecciona los 3 DNAs para continuar. Si no tienes DNAs creados, ve primero a la sección DNAs.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generar {count} guiones</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
