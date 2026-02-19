import { useWizardStore } from '@/store/wizardStore';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, Sparkles, Save, Loader2 } from 'lucide-react';
import { getActiveWizardSteps, PILAR_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { WizardStep } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function WizardNavigation() {
  const {
    currentStep,
    completedSteps,
    setCurrentStep,
    canProceed,
    markStepCompleted,
    saveDraft,
    isSaving,
    lastSavedAt,
    project,
    selectedDNAs
  } = useWizardStore();
  const { toast } = useToast();

  // Dynamic steps based on funnel type, DNA selections, VSL type, and VSL mode
  const steps = getActiveWizardSteps(project.funnelType, selectedDNAs, project.vslType, project.vslMode);

  const rawIndex = steps.findIndex((s) => s.id === currentStep);
  const currentIndex = rawIndex === -1 ? 0 : rawIndex;
  const progress = ((currentIndex + 1) / steps.length) * 100;

  const handleNext = async () => {
    // Always compute steps from the latest store state to avoid stale closures
    const latestState = useWizardStore.getState();
    const latestSteps = getActiveWizardSteps(
      latestState.project.funnelType,
      latestState.selectedDNAs,
      latestState.project.vslType,
      latestState.project.vslMode
    );
    const latestIndex = latestSteps.findIndex(s => s.id === latestState.currentStep);

    if (latestIndex !== -1 && latestIndex < latestSteps.length - 1 && canProceed()) {
      markStepCompleted(latestState.currentStep);
      setCurrentStep(latestSteps[latestIndex + 1].id);

      // Auto-save on step completion
      const result = await saveDraft();
      if (result.success) {
        toast({
          title: "💾 Borrador guardado",
          description: "Tu progreso se guardó automáticamente",
          duration: 2000,
        });
      }
    }
  };

  const handlePrevious = () => {
    // Use latest state to compute steps for accurate navigation
    const latestState = useWizardStore.getState();
    const latestSteps = getActiveWizardSteps(
      latestState.project.funnelType,
      latestState.selectedDNAs,
      latestState.project.vslType,
      latestState.project.vslMode
    );
    const latestIndex = latestSteps.findIndex(s => s.id === latestState.currentStep);

    if (latestIndex > 0) {
      setCurrentStep(latestSteps[latestIndex - 1].id);
    }
  };

  const handleSaveDraft = async () => {
    const result = await saveDraft();
    if (result.success) {
      toast({
        title: "✅ Borrador guardado",
        description: "Tu proyecto se guardó correctamente",
      });
    } else {
      toast({
        title: "❌ Error",
        description: result.error || "No se pudo guardar el borrador",
        variant: "destructive",
      });
    }
  };

  const handleStepClick = (stepId: WizardStep, index: number) => {
    // Allow going back or to completed steps
    if (index < currentIndex || completedSteps.includes(stepId)) {
      setCurrentStep(stepId);
    }
  };

  const currentStepConfig = steps[currentIndex] ?? steps[0];
  const isLastStep = currentIndex === steps.length - 1;

  return (
    <div className="bg-card rounded-xl shadow-card p-6 animate-fade-in">
      {/* Progress Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="text-sm text-muted-foreground">
              Paso {currentIndex + 1} de {steps.length}
            </span>
            <h3 className="text-lg font-semibold text-foreground">
              {currentStepConfig.label}
            </h3>
          </div>
          <div className="text-right flex items-center gap-2">
            {lastSavedAt && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Guardado: {lastSavedAt.toLocaleTimeString()}
              </span>
            )}
            <span className={cn(
              "text-xs font-medium px-3 py-1 rounded-full",
              PILAR_COLORS[currentStepConfig.pilar].bg,
              PILAR_COLORS[currentStepConfig.pilar].text
            )}>
              {currentStepConfig.pilarName}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Indicators - Desktop */}
      <div className="hidden lg:flex justify-between items-center mb-6 px-2">
        {steps.map((step, i) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isClickable = i < currentIndex || isCompleted;
          const pilarColor = PILAR_COLORS[step.pilar];

          return (
            <div key={step.id} className="flex flex-col items-center relative group">
              {/* Connector Line */}
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute top-5 left-[50%] w-full h-0.5 -z-10",
                    i < currentIndex ? "bg-primary" : "bg-border"
                  )}
                />
              )}

              {/* Step Circle */}
              <button
                onClick={() => handleStepClick(step.id, i)}
                disabled={!isClickable && !isCurrent}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  isCurrent && "bg-gradient-primary text-primary-foreground ring-4 ring-primary/20",
                  isCompleted && !isCurrent && "bg-primary text-primary-foreground",
                  !isCurrent && !isCompleted && "bg-muted text-muted-foreground",
                  isClickable && "cursor-pointer hover:ring-2 hover:ring-primary/30"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : i + 1}
              </button>

              {/* Step Label */}
              <span
                className={cn(
                  "text-xs mt-2 text-center max-w-[80px] transition-colors",
                  isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {step.shortLabel}
              </span>

              {/* Pilar Badge on Hover */}
              <div className={cn(
                "absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity",
                pilarColor.bg,
                pilarColor.text
              )}>
                {step.pilarName}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step Indicators - Mobile */}
      <div className="lg:hidden flex justify-center gap-1.5 mb-6">
        {steps.map((step, i) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                "h-1.5 rounded-full transition-all",
                isCurrent ? "w-6 bg-primary" : "w-1.5",
                isCompleted && !isCurrent && "bg-primary/50",
                !isCurrent && !isCompleted && "bg-muted"
              )}
            />
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex-1 sm:flex-none"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
        </Button>

        <div className="flex gap-2">
          {/* Save Draft Button */}
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="hidden sm:flex"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Guardar
              </>
            )}
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || isLastStep}
            className={cn(
              "flex-1 sm:flex-none",
              canProceed() && !isLastStep && "bg-gradient-primary hover:opacity-90"
            )}
          >
            {isLastStep ? (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Generar Copy
              </>
            ) : (
              <>
                Siguiente <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
