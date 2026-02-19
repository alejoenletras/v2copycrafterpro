import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  User, 
  Users, 
  Brain, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
  Video,
  Rocket,
  Presentation,
  Loader2,
  Mic,
  BookOpen,
  Heart,
  Target,
  ShieldQuestion,
  Zap,
  Package,
  Pencil,
  Globe,
  Crown,
  DollarSign,
  Clock,
  Phone,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS, SALEADS_WIZARD_STEPS, CONSCIOUSNESS_LEVELS } from '@/lib/constants';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useGenerate } from '@/hooks/useGenerate';

const FUNNEL_ICONS: Record<string, any> = {
  vsl: Video,
  launch: Rocket,
  autowebinar: Presentation,
  'vsl-saleads': Zap,
};

const FUNNEL_NAMES: Record<string, string> = {
  vsl: 'VSL (Video Sales Letter)',
  launch: 'Lanzamiento 21 días',
  autowebinar: 'Autowebinar Evergreen',
  'vsl-saleads': 'VSL SaleADS.ai',
};

const VSL_TYPE_NAMES = {
  'direct-sale': 'Venta Directa',
  'high-ticket': 'High Ticket',
};

const SERVICE_TYPE_NAMES = {
  'coaching-1on1': 'Coaching 1 a 1',
  'coaching-group': 'Coaching Grupal',
  'consulting': 'Consultoría',
  'mentorship': 'Mentoría',
  'done-for-you': 'Done For You',
  'other': 'Otro',
};

const PROGRAM_DURATION_NAMES = {
  '30-days': '30 días',
  '60-days': '60 días',
  '90-days': '90 días',
  '6-months': '6 meses',
  '12-months': '12 meses',
  'custom': 'Personalizado',
};

const CALL_FORMAT_NAMES = {
  'zoom': 'Zoom',
  'phone': 'Teléfono',
  'in-person': 'Presencial',
};

const COUNTRY_FLAGS: Record<string, string> = {
  mexico: '🇲🇽',
  colombia: '🇨🇴',
  argentina: '🇦🇷',
  spain: '🇪🇸',
  chile: '🇨🇱',
  peru: '🇵🇪',
  usa: '🇺🇸',
  multiple: '🌎',
};

const LOADING_MESSAGES = [
  "Analizando tu experto...",
  "Comprendiendo a tu avatar...",
  "Aplicando gatillos mentales...",
  "Construyendo mega-prompt...",
  "Generando copy con Claude...",
];

const LOADING_MESSAGES_HIGH_TICKET = [
  "Analizando tu oferta high ticket...",
  "Construyendo 3 versiones del VSL...",
  "Generando 3 páginas de captura...",
  "Creando secuencia de 6 emails...",
  "Desarrollando 45 scripts de ads...",
  "Generando 21 ads de remarketing...",
];

const LOADING_MESSAGES_SALEADS = [
  "Analizando configuración SaleADS...",
  "Aplicando ángulo de comunicación...",
  "Adaptando al avatar objetivo...",
  "Generando VSL optimizado...",
  "Finalizando script completo...",
];

export default function ReviewStep() {
  const { project, completedSteps, setCurrentStep, saveToSupabase, isSaving, selectedDNAs } = useWizardStore();
  const { generate, isGenerating: isGeneratingCopy } = useGenerate();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const isGenerating = isProcessing || isGeneratingCopy;

  const isHighTicket = project.funnelType === 'vsl' && project.vslType === 'high-ticket';
  const isSaleADS = project.funnelType === 'vsl-saleads';
  
  const loadingMessages = isSaleADS 
    ? LOADING_MESSAGES_SALEADS 
    : isHighTicket 
      ? LOADING_MESSAGES_HIGH_TICKET 
      : LOADING_MESSAGES;

  // For SaleADS, we use a simplified flow
  const steps = isSaleADS ? SALEADS_WIZARD_STEPS : WIZARD_STEPS;

  // Build pilar 3 steps based on funnel type
  const pilar3Steps = isHighTicket 
    ? ['high-ticket-info', 'persuasion-triggers', 'product-info']
    : ['persuasion-triggers', 'product-info'];

  // For SaleADS, simplified pilars
  const pilars = isSaleADS ? [
    {
      id: 1,
      name: 'Configuración SaleADS',
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
      badgeColor: 'bg-purple-500',
      missingSteps: ['saleads-config'].filter(
        (s) => !completedSteps.includes(s as any)
      ),
    },
  ] : [
    {
      id: 1,
      name: 'Pilar 1: Experto',
      icon: User,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      badgeColor: 'bg-blue-500',
      missingSteps: selectedDNAs?.expert
        ? []
        : ['expert-voice', 'expert-story', 'expert-beliefs'].filter(
            (s) => !completedSteps.includes(s as any)
          ),
    },
    {
      id: 2,
      name: 'Pilar 2: Avatar',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
      badgeColor: 'bg-purple-500',
      missingSteps: selectedDNAs?.audience
        ? []
        : ['avatar-consciousness', 'avatar-pains', 'avatar-desires', 'avatar-objections'].filter(
            (s) => !completedSteps.includes(s as any)
          ),
    },
    {
      id: 3,
      name: 'Pilar 3: Persuasión',
      icon: Brain,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
      badgeColor: 'bg-green-500',
      missingSteps: pilar3Steps.filter(
        (s) => {
          if (s === 'product-info' && selectedDNAs?.product) return false;
          return !completedSteps.includes(s as any);
        }
      ),
    },
  ];

  const allComplete = isSaleADS 
    ? completedSteps.includes('saleads-config')
    : pilars.every((p) => p.missingSteps.length === 0);
  const FunnelIcon = project.funnelType ? FUNNEL_ICONS[project.funnelType] || Video : Video;

  const consciousnessLevel = CONSCIOUSNESS_LEVELS.find(
    (l) => l.level === project.avatarProfile?.consciousnessLevel
  );

  // Rotate loading messages
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, isHighTicket ? 3000 : 2000);
      return () => clearInterval(interval);
    }
  }, [isGenerating, loadingMessages.length, isHighTicket]);

  // Progress animation
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 100;
          return prev + 2;
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isGenerating]);

  const canGenerate = () => {
    // SaleADS simplified validation
    if (isSaleADS) {
      const saleads = project.saleadsConfig;
      return !!(
        saleads?.expert?.expertType &&
        saleads?.angle?.angleName
      );
    }

    const baseRequirements = !!(
      project.expertProfile?.voice?.name &&
      project.avatarProfile?.consciousnessLevel !== undefined &&
      project.avatarProfile?.pains?.primary &&
      (project.persuasionStrategy?.mentalTriggers?.filter(t => t.enabled).length || 0) >= 3 &&
      project.productInfo?.name &&
      project.productInfo?.price
    );

    // Additional requirements for High Ticket
    if (isHighTicket) {
      const ht = project.highTicketInfo;
      const highTicketRequirements = !!(
        ht?.serviceType &&
        ht?.investmentRange?.min &&
        ht?.investmentRange?.max &&
        ht?.programDuration &&
        ht?.qualificationCriteria?.minimumMonthlyRevenue &&
        ht?.strategicCallInfo?.duration
      );
      return baseRequirements && highTicketRequirements;
    }

    return baseRequirements;
  };

  const handleConfirmGenerate = () => {
    setShowConfirmDialog(true);
  };

  const handleGenerate = async () => {
    setShowConfirmDialog(false);
    setIsProcessing(true);
    setProgress(0);
    
    // Save project to Supabase first
    const result = await saveToSupabase();
    
    if (!result.success) {
      toast({
        title: "❌ Error al guardar",
        description: result.error || "No se pudo guardar el proyecto",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }
    
    // Show success for saving
    toast({
      title: "✅ Proyecto guardado",
      description: `Proyecto guardado (ID: ${result.projectId?.slice(0, 8)}...)`,
    });
    
    // Generate copy using the Edge Function
    if (result.projectId) {
      generate(
        { projectId: result.projectId, funnelType: project.funnelType },
        {
          onSuccess: (data) => {
            setIsProcessing(false);
            setTimeout(() => {
              navigate(`/copy/${data?.id || ''}`);
            }, 2000);
          },
          onError: () => {
            setIsProcessing(false);
          },
        }
      );
    } else {
      toast({
        title: "⚠️ Error",
        description: "No se pudo obtener el ID del proyecto",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const activeTriggers = project.persuasionStrategy?.mentalTriggers?.filter(t => t.enabled) || [];
  const bonuses = project.productInfo?.bonuses || [];
  const totalBonusValue = bonuses.reduce((acc, b) => acc + b.value, 0);
  const totalValue = (project.productInfo?.price || 0) + totalBonusValue;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-muted rounded-full text-muted-foreground text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Paso Final
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          ✅ Revisión Final - Los 3 Pilares
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Revisa que todo esté correcto antes de generar tu copy
        </p>
      </div>

      {/* Funnel Type Summary */}
      {project.funnelType && (
        <Card className={cn(
          "p-6 mb-6",
          isSaleADS
            ? "bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border-purple-500/30"
            : isHighTicket 
              ? "bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 border-amber-500/30" 
              : "bg-gradient-to-r from-primary/5 to-accent/5"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center",
              isSaleADS 
                ? "bg-gradient-to-br from-purple-500 to-orange-500"
                : isHighTicket 
                  ? "bg-gradient-to-br from-amber-500 to-orange-600" 
                  : "bg-gradient-primary"
            )}>
              {isSaleADS ? (
                <Zap className="w-7 h-7 text-white" />
              ) : isHighTicket ? (
                <Crown className="w-7 h-7 text-white" />
              ) : (
                <FunnelIcon className="w-7 h-7 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Tipo de embudo</p>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-display font-bold text-foreground">
                  {FUNNEL_NAMES[project.funnelType]}
                </h3>
                {isSaleADS && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-orange-500 text-white border-0">
                    SALEADS.AI
                  </Badge>
                )}
                {isHighTicket && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0">
                    HIGH TICKET
                  </Badge>
                )}
              </div>
              {project.funnelType === 'vsl' && project.vslType && (
                <p className="text-sm text-muted-foreground mt-1">
                  Modalidad: {VSL_TYPE_NAMES[project.vslType]}
                </p>
              )}
            </div>
          </div>

          {/* SaleADS Quick Summary */}
          {isSaleADS && project.saleadsConfig && (
            <div className="mt-4 pt-4 border-t border-purple-500/20 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <User className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <p className="text-xs text-muted-foreground">Experto</p>
                <p className="font-semibold text-foreground">
                  {project.saleadsConfig.expert?.expertType === 'founder' 
                    ? 'Juan Osorio' 
                    : project.saleadsConfig.expert?.name || 'No definido'}
                </p>
              </div>
              <div className="text-center">
                <Zap className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <p className="text-xs text-muted-foreground">Ángulo</p>
                <p className="font-semibold text-foreground capitalize">
                  {project.saleadsConfig.angle?.angleName?.replace('-', ' ') || 'No definido'}
                </p>
              </div>
              <div className="text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <p className="text-xs text-muted-foreground">Duración</p>
                <p className="font-semibold text-foreground">
                  {project.saleadsConfig.targetDuration || 20} min
                </p>
              </div>
              <div className="text-center">
                <Globe className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <p className="text-xs text-muted-foreground">País</p>
                <p className="font-semibold text-foreground">
                  {COUNTRY_FLAGS[project.saleadsConfig.targetCountry || 'multiple'] || '🌎'}
                </p>
              </div>
            </div>
          )}

          {/* High Ticket Quick Summary */}
          {isHighTicket && project.highTicketInfo && (
            <div className="mt-4 pt-4 border-t border-amber-500/20 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <DollarSign className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                <p className="text-xs text-muted-foreground">Inversión</p>
                <p className="font-semibold text-foreground">
                  ${project.highTicketInfo.investmentRange?.min?.toLocaleString()} - ${project.highTicketInfo.investmentRange?.max?.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                <p className="text-xs text-muted-foreground">Duración</p>
                <p className="font-semibold text-foreground">
                  {project.highTicketInfo.programDuration === 'custom' 
                    ? project.highTicketInfo.programDurationCustom 
                    : PROGRAM_DURATION_NAMES[project.highTicketInfo.programDuration]}
                </p>
              </div>
              <div className="text-center">
                <UserCheck className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                <p className="text-xs text-muted-foreground">Ingreso Mínimo</p>
                <p className="font-semibold text-foreground">
                  ${project.highTicketInfo.qualificationCriteria?.minimumMonthlyRevenue?.toLocaleString()}/mes
                </p>
              </div>
              <div className="text-center">
                <Phone className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                <p className="text-xs text-muted-foreground">Llamada</p>
                <p className="font-semibold text-foreground">
                  {project.highTicketInfo.strategicCallInfo?.duration} min
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* SaleADS Simplified Summary - skip accordion for SaleADS */}
      {isSaleADS ? (
        <Card className="p-6 mb-8 bg-gradient-to-r from-purple-50 to-orange-50 border-purple-200">
          <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Configuración del VSL SaleADS.ai
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground">Tipo de Experto</p>
                <p className="font-semibold text-foreground capitalize">
                  {project.saleadsConfig?.expert?.expertType === 'founder' ? 'Founder (Juan Osorio)' : project.saleadsConfig?.expert?.expertType}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Ángulo de Comunicación</p>
                <p className="font-semibold text-foreground capitalize">
                  {project.saleadsConfig?.angle?.angleName?.replace(/-/g, ' ') || 'No definido'}
                </p>
              </div>
              {project.saleadsConfig?.angle?.mainEnemy && (
                <div>
                  <p className="text-muted-foreground">Enemigo Principal</p>
                  <p className="font-semibold text-foreground">
                    {project.saleadsConfig.angle.mainEnemy}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground">Avatar</p>
                <p className="font-semibold text-foreground">
                  {project.saleadsConfig?.avatar?.isSpecific 
                    ? project.saleadsConfig?.avatar?.industry || 'Específico'
                    : 'General (todos los emprendedores)'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Duración Objetivo</p>
                <p className="font-semibold text-foreground">
                  {project.saleadsConfig?.targetDuration || 20} minutos
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">CTA</p>
                <p className="font-semibold text-purple-700">
                  1 MES GRATIS ($59/mes después)
                </p>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <>

      {/* Accordion Pilars */}
      <Accordion type="multiple" defaultValue={['pilar-1', 'pilar-2', 'pilar-3']} className="space-y-4 mb-8">
        {/* Pilar 1: Experto */}
        <AccordionItem value="pilar-1" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className={cn(
            "px-5 py-4 hover:no-underline",
            pilars[0].missingSteps.length > 0 ? "bg-amber-500/5" : "bg-blue-500/5"
          )}>
            <div className="flex items-center gap-3">
              <Badge className={cn("text-white", pilars[0].badgeColor)}>Pilar 1</Badge>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">El Experto</h3>
                <p className="text-sm text-muted-foreground">
                  {pilars[0].missingSteps.length === 0 ? 'Completo' : `${pilars[0].missingSteps.length} pasos pendientes`}
                </p>
              </div>
              {pilars[0].missingSteps.length === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500 ml-auto mr-2" />
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 py-4 bg-card">
            <div className="space-y-4">
              {/* Voice */}
              <Card className="p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-foreground">Voz y Tono</span>
                </div>
                <p className="text-sm text-foreground mb-1">
                  <strong>Nombre:</strong> {project.expertProfile?.voice?.name || 'No definido'}
                </p>
                {project.expertProfile?.voice?.adjectives?.length ? (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {project.expertProfile.voice.adjectives.map((adj, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{adj}</Badge>
                    ))}
                  </div>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  Humor: {project.expertProfile?.voice?.humorLevel || 'No definido'} | 
                  Estilo: {project.expertProfile?.voice?.sentenceLength || 'No definido'}
                </p>
              </Card>

              {/* Story - 3 columns */}
              <Card className="p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-foreground">Historia de Transformación</span>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <p className="text-xs font-semibold text-red-600 mb-1">ANTES</p>
                    <p className="text-xs text-foreground line-clamp-3">
                      {project.expertProfile?.story?.lowestPoint 
                        ? project.expertProfile.story.lowestPoint.substring(0, 100) + '...'
                        : 'No definido'}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                    <p className="text-xs font-semibold text-amber-600 mb-1">BREAKTHROUGH</p>
                    <p className="text-xs text-foreground line-clamp-3">
                      {project.expertProfile?.story?.breakthrough 
                        ? project.expertProfile.story.breakthrough.substring(0, 100) + '...'
                        : 'No definido'}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                    <p className="text-xs font-semibold text-emerald-600 mb-1">AHORA</p>
                    <p className="text-xs text-foreground line-clamp-3">
                      {project.expertProfile?.story?.current 
                        ? project.expertProfile.story.current.substring(0, 100) + '...'
                        : 'No definido'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Beliefs */}
              <Card className="p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-foreground">Creencias</span>
                </div>
                <div className="space-y-2">
                  {project.expertProfile?.beliefs?.beliefs?.slice(0, 3).map((belief, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {belief}</p>
                  ))}
                  <p className="text-sm text-foreground">
                    <strong>Enemigo común:</strong> {project.expertProfile?.beliefs?.commonEnemy || 'No definido'}
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    <strong>Promesa central:</strong> {project.expertProfile?.beliefs?.centralPromise || 'No definida'}
                  </p>
                </div>
              </Card>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep('expert-voice')}
                className="w-full"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Editar Pilar 1
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Pilar 2: Avatar */}
        <AccordionItem value="pilar-2" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className={cn(
            "px-5 py-4 hover:no-underline",
            pilars[1].missingSteps.length > 0 ? "bg-amber-500/5" : "bg-purple-500/5"
          )}>
            <div className="flex items-center gap-3">
              <Badge className={cn("text-white", pilars[1].badgeColor)}>Pilar 2</Badge>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">El Avatar</h3>
                <p className="text-sm text-muted-foreground">
                  {pilars[1].missingSteps.length === 0 ? 'Completo' : `${pilars[1].missingSteps.length} pasos pendientes`}
                </p>
              </div>
              {pilars[1].missingSteps.length === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500 ml-auto mr-2" />
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 py-4 bg-card">
            <div className="space-y-4">
              {/* Consciousness Level */}
              <Card className="p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-foreground">Nivel de Consciencia</span>
                </div>
                {consciousnessLevel ? (
                  <Badge variant="outline" className="text-sm">
                    Nivel {consciousnessLevel.level}: {consciousnessLevel.name}
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground">No definido</p>
                )}
              </Card>

              {/* Primary Pain */}
              <Card className="p-4 bg-red-50 dark:bg-red-950/30">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-foreground">Dolor Primario</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  "{project.avatarProfile?.pains?.primary || 'No definido'}"
                </p>
              </Card>

              {/* Pains Grid 2x2 */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3 bg-red-50/50 dark:bg-red-950/20">
                  <p className="text-xs font-semibold text-red-600 mb-1">💰 Económicos</p>
                  {project.avatarProfile?.pains?.economic?.slice(0, 2).map((pain, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {pain}</p>
                  )) || <p className="text-xs text-muted-foreground">No definidos</p>}
                </Card>
                <Card className="p-3 bg-orange-50/50 dark:bg-orange-950/20">
                  <p className="text-xs font-semibold text-orange-600 mb-1">😔 Emocionales</p>
                  {project.avatarProfile?.pains?.emotional?.slice(0, 2).map((pain, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {pain}</p>
                  )) || <p className="text-xs text-muted-foreground">No definidos</p>}
                </Card>
                <Card className="p-3 bg-yellow-50/50 dark:bg-yellow-950/20">
                  <p className="text-xs font-semibold text-yellow-600 mb-1">👥 Sociales</p>
                  {project.avatarProfile?.pains?.social?.slice(0, 2).map((pain, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {pain}</p>
                  )) || <p className="text-xs text-muted-foreground">No definidos</p>}
                </Card>
                <Card className="p-3 bg-purple-50/50 dark:bg-purple-950/20">
                  <p className="text-xs font-semibold text-purple-600 mb-1">🪞 Identidad</p>
                  {project.avatarProfile?.pains?.identity?.slice(0, 2).map((pain, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {pain}</p>
                  )) || <p className="text-xs text-muted-foreground">No definidos</p>}
                </Card>
              </div>

              {/* Transformation */}
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-foreground">Transformación Deseada</span>
                </div>
                <p className="text-sm text-foreground">
                  "{project.avatarProfile?.desires?.identityTransformation || 'No definida'}"
                </p>
              </Card>

              {/* Objections */}
              <Card className="p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldQuestion className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-foreground">Top 3 Objeciones</span>
                </div>
                {project.avatarProfile?.objections?.slice(0, 3).map((obj, i) => (
                  <div key={i} className="mb-2">
                    <p className="text-sm text-foreground">
                      {i + 1}. "{obj.exact_words}"
                    </p>
                    <p className="text-xs text-muted-foreground ml-4">
                      → {obj.destruction?.substring(0, 60)}...
                    </p>
                  </div>
                )) || <p className="text-sm text-muted-foreground">No definidas</p>}
              </Card>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep('avatar-consciousness')}
                className="w-full"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Editar Pilar 2
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Pilar 3: Persuasión */}
        <AccordionItem value="pilar-3" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className={cn(
            "px-5 py-4 hover:no-underline",
            pilars[2].missingSteps.length > 0 ? "bg-amber-500/5" : "bg-green-500/5"
          )}>
            <div className="flex items-center gap-3">
              <Badge className={cn("text-white", pilars[2].badgeColor)}>Pilar 3</Badge>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Persuasión + Producto</h3>
                <p className="text-sm text-muted-foreground">
                  {pilars[2].missingSteps.length === 0 ? 'Completo' : `${pilars[2].missingSteps.length} pasos pendientes`}
                </p>
              </div>
              {pilars[2].missingSteps.length === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500 ml-auto mr-2" />
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 py-4 bg-card">
            <div className="space-y-4">
              {/* Active Triggers */}
              <Card className="p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-foreground">
                    Gatillos Activos ({activeTriggers.length}/10)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {activeTriggers.map((trigger, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{trigger.name}</Badge>
                  ))}
                  {activeTriggers.length === 0 && (
                    <p className="text-sm text-muted-foreground">Ninguno seleccionado</p>
                  )}
                </div>
              </Card>

              {/* Product */}
              <Card className="p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-foreground">Información del Producto</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-foreground">
                    <strong>Nombre:</strong> {project.productInfo?.name || 'No definido'}
                  </p>
                  <p className="text-sm text-foreground">
                    <strong>Precio:</strong> ${project.productInfo?.price || 0}
                  </p>
                  {project.productInfo?.paymentPlan?.enabled && (
                    <p className="text-sm text-foreground">
                      <strong>Plan de pagos:</strong> {project.productInfo.paymentPlan.installments} cuotas de ${project.productInfo.paymentPlan.installmentPrice}
                    </p>
                  )}
                  <p className="text-sm text-foreground">
                    <strong>Garantía:</strong> {project.productInfo?.guaranteePeriod || '60'} días
                  </p>
                  <p className="text-sm text-foreground">
                    <strong>Bonos:</strong> {bonuses.length} incluidos
                  </p>
                  {project.country && (
                    <p className="text-sm text-foreground">
                      <strong>País objetivo:</strong> {COUNTRY_FLAGS[project.country]} {project.country}
                    </p>
                  )}
                </div>
              </Card>

              {/* Stack de Valor */}
              {bonuses.length > 0 && (
                <Card className="p-4 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30">
                  <p className="font-medium text-foreground mb-2">💰 Stack de Valor</p>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="py-1 text-muted-foreground">Producto principal</td>
                        <td className="py-1 text-right font-medium">${project.productInfo?.price || 0}</td>
                      </tr>
                      {bonuses.map((bonus, i) => (
                        <tr key={i}>
                          <td className="py-1 text-muted-foreground">{bonus.name}</td>
                          <td className="py-1 text-right font-medium">${bonus.value}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-border">
                        <td className="py-2 font-semibold">Valor Total:</td>
                        <td className="py-2 text-right font-bold">${totalValue}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold text-emerald-600">PRECIO HOY:</td>
                        <td className="py-1 text-right font-bold text-emerald-600">${project.productInfo?.price || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </Card>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep('persuasion-triggers')}
                className="w-full"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Editar Pilar 3
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      </>
      )}

      {/* Validation Checklist */}
      <Card className="p-6 mb-6">
        <h4 className="font-semibold text-foreground mb-4">Checklist de validación</h4>
        <div className="space-y-2">
          {pilars.map((pilar) => (
            <div key={pilar.id} className="flex items-center gap-2">
              {pilar.missingSteps.length === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
              <span className={cn(
                "text-sm",
                pilar.missingSteps.length === 0 ? "text-foreground" : "text-muted-foreground"
              )}>
                {pilar.name} {pilar.missingSteps.length === 0 ? '- Completo' : `- ${pilar.missingSteps.length} pendientes`}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Generate Button */}
      <div className="text-center">
        {!allComplete && (
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Completa todos los pilares antes de generar
            </p>
          </div>
        )}
        <Button
          size="lg"
          disabled={!canGenerate() || isGenerating}
          onClick={handleConfirmGenerate}
          className={cn(
            "text-lg px-10 py-7 h-auto",
            isHighTicket 
              ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              : canGenerate() && "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              {isHighTicket ? <Crown className="w-5 h-5 mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
              {isHighTicket ? '👑 GENERAR ECOSISTEMA HIGH TICKET' : '🚀 GENERAR MI COPY AHORA'}
            </>
          )}
        </Button>
        {allComplete && !isGenerating && (
          <p className="text-sm text-emerald-600 mt-3">
            {isHighTicket 
              ? '✓ Todo listo. Generaremos 3 VSLs, 3 páginas de captura, 6 emails y 66 scripts de ads.'
              : '✓ Todo listo. Haz clic para generar tu copy de ventas.'}
          </p>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className={isHighTicket ? "border-amber-500/30" : ""}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isHighTicket && <Crown className="w-5 h-5 text-amber-500" />}
              ¿Listo para generar?
            </DialogTitle>
            <DialogDescription>
              {isHighTicket ? (
                <div className="space-y-2 text-left">
                  <p>Vamos a crear tu ecosistema completo de VSL High Ticket:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                    <li>3 versiones del VSL (hooks diferentes)</li>
                    <li>3 variaciones de página de captura</li>
                    <li>1 página VSL completa con FAQs y testimonios</li>
                    <li>6 emails de seguimiento (18 subject lines)</li>
                    <li>45 scripts de ads de testeo</li>
                    <li>21 ads de remarketing</li>
                  </ul>
                  <p className="text-amber-600 font-medium mt-3">
                    ⏱️ Esto puede tomar unos minutos debido al volumen de contenido.
                  </p>
                </div>
              ) : (
                `Vamos a crear tu ${project.funnelType ? FUNNEL_NAMES[project.funnelType] : 'copy'} optimizado con los 3 pilares.`
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleGenerate} 
              className={isHighTicket 
                ? "bg-gradient-to-r from-amber-500 to-orange-600" 
                : "bg-gradient-to-r from-blue-600 to-purple-600"
              }
            >
              Sí, Generar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            {isHighTicket ? (
              <Crown className="w-16 h-16 animate-pulse text-amber-500 mx-auto mb-6" />
            ) : (
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
            )}
            <h3 className="text-2xl font-bold text-foreground mb-4">
              {loadingMessages[loadingMessageIndex]}
            </h3>
            <Progress value={progress} className={cn("mb-4", isHighTicket && "[&>div]:bg-amber-500")} />
            <p className="text-sm text-muted-foreground">
              {isHighTicket 
                ? 'Generando ecosistema completo... esto puede tomar unos minutos.'
                : 'Esto puede tomar unos segundos...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}