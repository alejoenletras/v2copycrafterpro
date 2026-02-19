import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Wand2, Pencil, TrendingUp } from 'lucide-react';
import { AutoAnalysis } from '@/types';

interface BriefSection {
  key: keyof AutoAnalysis;
  label: string;
  description: string;
  rows: number;
  highlight?: boolean;
}

const BRIEF_SECTIONS: BriefSection[] = [
  {
    key: 'offerCore',
    label: '1. Core de la Oferta',
    description: 'Esencia central de lo que se está vendiendo y su propuesta de valor.',
    rows: 4,
  },
  {
    key: 'mainPainPoints',
    label: '2. Pain Points Principales',
    description: 'Dolores, problemas y frustraciones del avatar detectados en el contenido.',
    rows: 5,
  },
  {
    key: 'promisedTransformation',
    label: '3. Transformación Prometida',
    description: 'El estado "después" prometido: cómo luce la vida del cliente cuando logra resultados.',
    rows: 4,
  },
  {
    key: 'targetAudience',
    label: '4. Audiencia Objetivo',
    description: 'Perfil detallado del cliente ideal: quién es, qué hace, qué nivel de experiencia tiene.',
    rows: 4,
  },
  {
    key: 'authority',
    label: '5. Autoridad',
    description: 'Credenciales, resultados demostrados, testimonios y métricas que establecen autoridad.',
    rows: 4,
  },
  {
    key: 'uniqueProblemMechanism',
    label: '6. Mecanismo Único del Problema',
    description: 'Cómo el experto encuadra el problema de forma única. La causa raíz que otros ignoran.',
    rows: 4,
  },
  {
    key: 'uniqueSolutionMechanism',
    label: '7. Mecanismo Único de la Solución',
    description: 'Qué hace diferente a esta solución. El método o sistema único que justifica por qué funcionará.',
    rows: 4,
  },
  {
    key: 'voiceAndCommunication',
    label: '8. Voz y Comunicación',
    description: 'Tono detectado, palabras características, nivel de formalidad y estilo narrativo del experto.',
    rows: 4,
  },
  {
    key: 'expertRole',
    label: '9. Rol del Experto y Conexión con la Audiencia',
    description: 'Cómo se posiciona el experto y qué tipo de relación construye emocionalmente con su audiencia.',
    rows: 4,
  },
  {
    key: 'offerStructure',
    label: '10. Oferta Completa',
    description: 'Precio, componentes del producto/servicio, bonos, garantía y formas de pago detectadas.',
    rows: 5,
  },
  {
    key: 'vslStructure',
    label: '11. Estructura del VSL Sugerida',
    description: 'Secciones y orden recomendado para el VSL, con tiempos y contenido específico.',
    rows: 7,
  },
  {
    key: 'offerStructurePreview',
    label: '12. Preview de la Estructura de la Oferta',
    description: 'Stack de valor con valores estimados por componente, valor total y precio final.',
    rows: 5,
  },
  {
    key: 'conversionProjection',
    label: '13. Proyección de Conversión',
    description: 'Estimación de conversión esperada y razones basadas en la fortaleza de la oferta.',
    rows: 3,
    highlight: true,
  },
];

export default function ExtractedBriefStep() {
  const { project, updateAutoAnalysis, setCurrentStep } = useWizardStore();
  const analysis = project.autoAnalysis;

  if (!analysis) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <Wand2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">
          Aún no se ha realizado el análisis. Regresa al paso anterior para agregar URLs y analizar.
        </p>
        <Button variant="outline" onClick={() => setCurrentStep('url-input')}>
          Ir a agregar URLs
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 rounded-full text-violet-600 text-sm font-medium mb-4">
          <FileText className="w-4 h-4" />
          Brief Extraído por IA
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Revisa y ajusta el brief
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          La IA extrajo estos 13 puntos clave de tu contenido. Edita cualquier campo antes de generar el VSL.
        </p>
      </div>

      <div className="space-y-4">
        {BRIEF_SECTIONS.map((section) => (
          <Card
            key={section.key}
            className={section.highlight ? 'p-5 ring-1 ring-emerald-200 bg-emerald-50/30' : 'p-5'}
          >
            <div className="flex items-start justify-between mb-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                {section.highlight && <TrendingUp className="w-4 h-4 text-emerald-600" />}
                {section.label}
              </Label>
              <Badge variant="outline" className="text-xs shrink-0 ml-2 gap-1">
                <Pencil className="w-3 h-3" />
                Editable
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{section.description}</p>
            <Textarea
              value={analysis[section.key] || ''}
              onChange={(e) => updateAutoAnalysis({ [section.key]: e.target.value })}
              rows={section.rows}
              className="resize-none text-sm"
              placeholder={`${section.label}...`}
            />
          </Card>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8 mb-2">
        Cuando estés conforme con el brief, haz clic en <strong>Siguiente</strong> para revisar y generar tu VSL.
      </p>
    </div>
  );
}
