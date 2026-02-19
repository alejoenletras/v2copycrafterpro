import { useState } from 'react';
import { useContentGeneratorStore } from '@/store/contentGeneratorStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import DocumentUploader from './DocumentUploader';
import { cn } from '@/lib/utils';

// Human-readable labels for field keys
const FIELD_LABELS: Record<string, string> = {
  product_name: 'Nombre del producto',
  main_pain: 'Dolor principal de la audiencia',
  main_desire: 'Deseo principal de la audiencia',
  target_audience: 'Audiencia objetivo',
  unique_mechanism: 'Mecanismo único / método diferenciador',
  product_solution: 'Solución que ofrece el producto',
  product_description: 'Descripción del producto',
  product_components: 'Componentes, módulos o bonos',
  product_price: 'Precio del producto',
  expert_name: 'Nombre del experto',
  expert_results: 'Resultados del experto (logros propios)',
  expert_lowest_point: 'El punto más bajo del experto (historia)',
  expert_breakthrough: 'El descubrimiento que cambió todo',
  social_proof_numbers: 'Números de prueba social',
  testimonials: 'Testimonios de clientes',
  client_results: 'Resultados de clientes (con números)',
  guarantee_period: 'Período de garantía (días)',
  guarantee_description: 'Descripción de la garantía',
  bonuses: 'Bonos incluidos',
  payment_plan: 'Plan de pago (cuotas)',
  urgency_reason: 'Razón de urgencia',
  scarcity_reason: 'Razón de escasez',
  failed_solutions: 'Soluciones que ya intentaron y fallaron',
  pain_consequences: 'Consecuencias de no resolver el problema',
  cost_of_inaction: 'Costo de no actuar',
  value_comparison: 'Comparación de valor con alternativas',
  main_objection: 'Objeción principal de compra',
  main_objections: 'Objeciones principales (lista)',
  objection_responses: 'Respuestas a las objeciones',
  cta_action: 'Acción del CTA',
  cta_url_description: 'Descripción del botón/URL de compra',
  main_result: 'Resultado principal prometido',
  main_promise: 'Promesa principal',
  webinar_topic: 'Tema central del webinar',
  content_pillar_1: 'Primer pilar de contenido',
  content_pillar_2: 'Segundo pilar de contenido',
  content_pillar_3: 'Tercer pilar de contenido',
  case_study: 'Caso de estudio o ejemplo',
  common_misconception: 'Creencia falsa de la audiencia',
  common_mistake: 'Error más común',
  combined_result: 'Resultado al aplicar los pilares juntos',
  implementation_challenge: 'Desafío principal de implementación',
  next_steps: 'Próximos pasos después de comprar',
};

// Fields that benefit from multiline textarea
const TEXTAREA_FIELDS = new Set([
  'main_pain', 'main_desire', 'target_audience', 'unique_mechanism',
  'product_solution', 'product_description', 'product_components',
  'expert_results', 'expert_lowest_point', 'expert_breakthrough',
  'social_proof_numbers', 'testimonials', 'client_results',
  'guarantee_description', 'bonuses', 'failed_solutions',
  'pain_consequences', 'cost_of_inaction', 'value_comparison',
  'main_objections', 'objection_responses', 'cta_action',
  'content_pillar_1', 'content_pillar_2', 'content_pillar_3',
  'case_study', 'common_misconception', 'common_mistake',
  'combined_result', 'implementation_challenge', 'next_steps',
]);

export default function InfoCollectionScreen() {
  const {
    selectedStructure, session, isExtracting, extractedFields,
    updateCollectedInfo, extractFromDocument, setCurrentScreen,
    generateAll,
  } = useContentGeneratorStore();

  const [showOptional, setShowOptional] = useState(false);

  if (!selectedStructure || !session) return null;

  // Get all required fields across all blocks (deduplicated)
  const allFields = Array.from(
    new Set(selectedStructure.blocks.flatMap((b) => b.required_inputs))
  );

  // Split into essential (used in first 3 blocks) vs optional
  const firstBlockFields = new Set(
    selectedStructure.blocks.slice(0, 4).flatMap((b) => b.required_inputs)
  );
  const essentialFields = allFields.filter((f) => firstBlockFields.has(f));
  const optionalFields = allFields.filter((f) => !firstBlockFields.has(f));

  const filledCount = allFields.filter((f) => session.collectedInfo[f]?.trim()).length;
  const essentialFilled = essentialFields.filter((f) => session.collectedInfo[f]?.trim()).length;
  const canProceed = essentialFilled >= Math.min(3, essentialFields.length);

  const renderField = (field: string) => {
    const label = FIELD_LABELS[field] ?? field.replace(/_/g, ' ');
    const value = session.collectedInfo[field] ?? '';
    const extracted = extractedFields[field];
    const isAutoFilled = extracted?.confidence === 'high' && extracted.value && value === extracted.value;
    const needsConfirm = extracted?.confidence === 'low' && extracted.value;

    return (
      <div key={field} className="space-y-1.5">
        <Label className="text-sm font-medium flex items-center gap-2">
          {label}
          {isAutoFilled && (
            <Badge variant="secondary" className="text-xs gap-1 text-emerald-700 bg-emerald-50">
              <CheckCircle2 className="w-3 h-3" /> Auto-extraído
            </Badge>
          )}
          {needsConfirm && !value && (
            <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300">
              <AlertCircle className="w-3 h-3" /> Verificar
            </Badge>
          )}
        </Label>

        {/* Suggestion from extraction with low confidence */}
        {needsConfirm && !value && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            Sugerencia: "{extracted.value}"
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-5 text-xs text-amber-700 px-2"
              onClick={() => updateCollectedInfo(field, extracted.value)}
            >
              Usar
            </Button>
          </div>
        )}

        {TEXTAREA_FIELDS.has(field) ? (
          <Textarea
            placeholder={`Describe ${label.toLowerCase()}...`}
            value={value}
            onChange={(e) => updateCollectedInfo(field, e.target.value)}
            rows={3}
            className={cn('resize-none text-sm', isAutoFilled && 'border-emerald-300 bg-emerald-50/30')}
          />
        ) : (
          <Input
            placeholder={label}
            value={value}
            onChange={(e) => updateCollectedInfo(field, e.target.value)}
            className={cn('text-sm', isAutoFilled && 'border-emerald-300 bg-emerald-50/30')}
          />
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-display font-bold">
            Información para "{selectedStructure.name}"
          </h2>
          <Badge variant="outline" className="text-sm">
            {filledCount}/{allFields.length} campos
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Sube un documento y la IA extraerá la información automáticamente. Completa o corrige los campos que necesiten ajuste.
        </p>
      </div>

      <div className="space-y-6">
        {/* Document uploader */}
        <Card className="p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            Subir documento de referencia
            <Badge variant="secondary" className="text-xs font-normal">Opcional pero recomendado</Badge>
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Pega el texto de tu página de ventas, PDF copiado, historia del experto, testimonios, etc.
            La IA extraerá toda la información posible automáticamente.
          </p>
          <DocumentUploader onExtract={extractFromDocument} isExtracting={isExtracting} />
        </Card>

        {/* Essential fields */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Información esencial</h3>
          <div className="space-y-4">
            {essentialFields.map(renderField)}
          </div>
        </Card>

        {/* Optional fields toggle */}
        {optionalFields.length > 0 && (
          <Card className="p-5">
            <button
              className="w-full flex items-center justify-between text-left"
              onClick={() => setShowOptional((v) => !v)}
            >
              <div>
                <h3 className="font-semibold">Información adicional</h3>
                <p className="text-sm text-muted-foreground">
                  {optionalFields.filter((f) => session.collectedInfo[f]?.trim()).length}/{optionalFields.length} completados — más detalle = mejor copy
                </p>
              </div>
              {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showOptional && (
              <div className="mt-4 space-y-4">
                {optionalFields.map(renderField)}
              </div>
            )}
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentScreen(1)}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> Cambiar estructura
          </Button>
          <Button
            onClick={() => { setCurrentScreen(3); generateAll(); }}
            disabled={!canProceed}
            className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white h-12"
          >
            Generar copy bloque a bloque
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
