import { useState } from 'react';
import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Video, Rocket, Presentation, Check, Clock, TrendingUp, Target, DollarSign, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FunnelType, VslType } from '@/types';

const FUNNELS = [
  {
    type: 'vsl' as FunnelType,
    title: 'VSL',
    subtitle: 'Video Sales Letter',
    description: 'Video de venta de 20-30 minutos que convierte fríos en compradores',
    icon: Video,
    ideal: 'Productos $197-$997',
    conversion: '1.5-3%',
    duration: '20-30 min',
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    features: ['Alto ticket', 'Automatizable', 'Evergreen'],
    hasSubTypes: true,
  },
  {
    type: 'launch' as FunnelType,
    title: 'LANZAMIENTO',
    subtitle: 'Secuencia de 21 días',
    description: 'Pre-calentamiento → Captación → Videos → Carrito abierto',
    icon: Rocket,
    ideal: 'Lanzamientos grandes',
    conversion: '2-5%',
    duration: '21 días',
    color: 'from-purple-500 to-purple-600',
    bgLight: 'bg-purple-50',
    features: ['Máximo impacto', 'Comunidad', 'Escalable'],
    hasSubTypes: false,
  },
  {
    type: 'autowebinar' as FunnelType,
    title: 'AUTOWEBINAR',
    subtitle: 'Webinar Evergreen',
    description: 'Webinar grabado de 60-90 min que vende 24/7 mientras duermes',
    icon: Presentation,
    ideal: 'Cursos y coaching',
    conversion: '3-8%',
    duration: '60-90 min',
    color: 'from-emerald-500 to-emerald-600',
    bgLight: 'bg-emerald-50',
    features: ['Educativo', 'Alta confianza', 'Automatizado'],
    hasSubTypes: false,
  },
  {
    type: 'vsl-saleads' as FunnelType,
    title: 'VSL SALEADS.AI',
    subtitle: 'Producción Masiva',
    description: 'Genera VSLs optimizados para SaleADS.ai con diferentes ángulos de comunicación',
    icon: Zap,
    ideal: 'Testing masivo de mensajes',
    conversion: 'Variable por ángulo',
    duration: '15-30 min',
    color: 'from-purple-600 to-orange-500',
    bgLight: 'bg-gradient-to-br from-purple-50 to-orange-50',
    features: ['Multi-ángulo', 'SaaS $59/mes', '1 mes gratis'],
    hasSubTypes: false,
  },
];

const VSL_SUBTYPES = [
  {
    type: 'direct-sale' as VslType,
    title: 'Venta Directa',
    description: 'VSL tradicional que vende un producto digital ($197-$997)',
    icon: DollarSign,
    ideal: 'Cursos, membresías, productos digitales',
    conversion: '1.5-3%',
    color: 'from-blue-500 to-cyan-500',
    features: ['Compra inmediata', 'Checkout en caliente', 'Automatizable'],
  },
  {
    type: 'high-ticket' as VslType,
    title: 'High Ticket',
    description: 'VSL que filtra y califica para llamada estratégica ($2,000+)',
    icon: Target,
    ideal: 'Coaching, consultoría, servicios premium',
    conversion: '5-15%',
    color: 'from-amber-500 to-orange-500',
    features: ['3 hooks diferentes', 'Calificación desde hook', 'CTA a aplicación'],
  },
];

export default function FunnelTypeStep() {
  const { project, updateProject, updateVslType, updateSaleADSConfig, markStepCompleted, setCurrentStep } = useWizardStore();
  const [showVslSubtypes, setShowVslSubtypes] = useState(project.funnelType === 'vsl');

  const handleSelectFunnel = (type: FunnelType) => {
    updateProject({ funnelType: type });

    if (type === 'vsl') {
      setShowVslSubtypes(true);
      // Keep existing vslType selection if any
      return;
    }

    setShowVslSubtypes(false);
    updateVslType(undefined);

    if (type === 'vsl-saleads') {
      // Asegura defaults en store para que canProceed() no quede bloqueado
      if (!project.saleadsConfig?.expert?.expertType) {
        updateSaleADSConfig({
          expert: {
            expertType: 'founder',
            name: 'Juan Osorio',
            credentials: '+$20M USD invertidos en publicidad, 319K seguidores',
            transformationStory: '',
            whyUseSaleADS: '',
            toneOfVoice: 'Directo, anti-agencia, motivador',
          },
          angle: {
            angleName: '',
            mainEnemy: '',
            bigIdea: '',
            mainPromise: '',
            hook30sec: '',
          },
          avatar: { isSpecific: false },
          targetDuration: 20,
          ctaType: 'free-trial',
          targetCountry: 'multiple',
        });
      }

      markStepCompleted('funnel-type');
      setCurrentStep('saleads-config');
      return;
    }

    markStepCompleted('funnel-type');
    setCurrentStep('dna-selection');
  };

  const handleSelectVslSubtype = (vslType: VslType) => {
    updateVslType(vslType);
    markStepCompleted('funnel-type');
    // Always go to mode selection first — VSL mode selection handles the rest
    setTimeout(() => setCurrentStep('vsl-mode-selection'), 300);
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          ¿Qué tipo de embudo vas a crear?
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Cada formato tiene su propia estructura y psicología. Selecciona el que mejor se adapte a tu estrategia.
        </p>
      </div>

      {/* Main Funnel Types */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {FUNNELS.map((funnel) => {
          const Icon = funnel.icon;
          const isSelected = project.funnelType === funnel.type;

          return (
            <Card
              key={funnel.type}
              className={cn(
                "relative p-6 cursor-pointer transition-all duration-300 hover:shadow-card-hover group overflow-hidden",
                isSelected 
                  ? "ring-2 ring-primary shadow-card-hover" 
                  : "hover:-translate-y-1"
              )}
              onClick={() => handleSelectFunnel(funnel.type)}
            >
              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-scale-in">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}

              {/* Icon */}
              <div className={cn(
                "w-16 h-16 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110",
                funnel.bgLight
              )}>
                <div className={cn("w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center", funnel.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-display font-bold text-foreground mb-1">
                {funnel.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {funnel.subtitle}
              </p>

              {/* Description */}
              <p className="text-foreground/80 mb-5 min-h-[48px]">
                {funnel.description}
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-5">
                {funnel.features.map((feature) => (
                  <span
                    key={feature}
                    className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Conversión
                  </span>
                  <span className="font-semibold text-emerald-600">{funnel.conversion}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Duración
                  </span>
                  <span className="font-medium text-foreground">{funnel.duration}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ideal para</span>
                  <span className="font-medium text-foreground">{funnel.ideal}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* VSL Subtypes Selection */}
      {showVslSubtypes && (
        <div className="mt-10 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-display font-bold text-foreground mb-2">
              ¿Qué tipo de VSL necesitas?
            </h3>
            <p className="text-muted-foreground">
              Selecciona el modelo de VSL que mejor se adapte a tu oferta
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {VSL_SUBTYPES.map((subtype) => {
              const Icon = subtype.icon;
              const isSelected = project.vslType === subtype.type;

              return (
                <Card
                  key={subtype.type}
                  className={cn(
                    "relative p-6 cursor-pointer transition-all duration-300 hover:shadow-card-hover group overflow-hidden",
                    isSelected 
                      ? "ring-2 ring-primary shadow-card-hover" 
                      : "hover:-translate-y-1"
                  )}
                  onClick={() => handleSelectVslSubtype(subtype.type)}
                >
                  {/* Selected Badge */}
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-scale-in">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}

                  {/* Icon */}
                  <div className={cn(
                    "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                    subtype.color
                  )}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Title */}
                  <h4 className="text-xl font-display font-bold text-foreground mb-2">
                    {subtype.title}
                  </h4>

                  {/* Description */}
                  <p className="text-foreground/80 mb-4">
                    {subtype.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {subtype.features.map((feature) => (
                      <span
                        key={feature}
                        className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          subtype.type === 'high-ticket' 
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-blue-500/10 text-blue-600"
                        )}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" /> Conversión
                      </span>
                      <span className="font-semibold text-emerald-600">{subtype.conversion}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ideal para</span>
                      <span className="font-medium text-foreground">{subtype.ideal}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <p className="text-center text-sm text-muted-foreground mt-8">
        💡 Tip: Si es tu primer embudo, te recomendamos empezar con <strong>VSL Venta Directa</strong> por su simplicidad y efectividad.
      </p>
    </div>
  );
}
