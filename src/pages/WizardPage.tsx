import { useWizardStore } from '@/store/wizardStore';
import WizardNavigation from '@/components/wizard/WizardNavigation';
import FunnelTypeStep from '@/components/wizard/steps/FunnelTypeStep';
import VslModeSelectionStep from '@/components/wizard/steps/VslModeSelectionStep';
import UrlInputStep from '@/components/wizard/steps/UrlInputStep';
import ExtractedBriefStep from '@/components/wizard/steps/ExtractedBriefStep';
import HighTicketInfoStep from '@/components/wizard/steps/HighTicketInfoStep';
import SaleADSConfigStep from '@/components/wizard/steps/SaleADSConfigStep';
import DNASelectionStep from '@/components/wizard/steps/DNASelectionStep';
import ExpertVoiceStep from '@/components/wizard/steps/ExpertVoiceStep';
import ExpertStoryStep from '@/components/wizard/steps/ExpertStoryStep';
import ExpertBeliefsStep from '@/components/wizard/steps/ExpertBeliefsStep';
import AvatarConsciousnessStep from '@/components/wizard/steps/AvatarConsciousnessStep';
import AvatarPainsStep from '@/components/wizard/steps/AvatarPainsStep';
import AvatarDesiresStep from '@/components/wizard/steps/AvatarDesiresStep';
import AvatarObjectionsStep from '@/components/wizard/steps/AvatarObjectionsStep';
import PersuasionTriggersStep from '@/components/wizard/steps/PersuasionTriggersStep';
import ProductInfoStep from '@/components/wizard/steps/ProductInfoStep';
import ReviewStep from '@/components/wizard/steps/ReviewStep';
import { Sparkles, Target, Wand2, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function WizardPage() {
  const { currentStep } = useWizardStore();
  const navigate = useNavigate();

  const renderStep = () => {
    switch (currentStep) {
      case 'funnel-type':
        return <FunnelTypeStep />;
      case 'vsl-mode-selection':
        return <VslModeSelectionStep />;
      case 'url-input':
        return <UrlInputStep />;
      case 'extracted-brief':
        return <ExtractedBriefStep />;
      case 'high-ticket-info':
        return <HighTicketInfoStep />;
      case 'saleads-config':
        return <SaleADSConfigStep />;
      case 'dna-selection':
        return <DNASelectionStep />;
      case 'expert-voice':
        return <ExpertVoiceStep />;
      case 'expert-story':
        return <ExpertStoryStep />;
      case 'expert-beliefs':
        return <ExpertBeliefsStep />;
      case 'avatar-consciousness':
        return <AvatarConsciousnessStep />;
      case 'avatar-pains':
        return <AvatarPainsStep />;
      case 'avatar-desires':
        return <AvatarDesiresStep />;
      case 'avatar-objections':
        return <AvatarObjectionsStep />;
      case 'persuasion-triggers':
        return <PersuasionTriggersStep />;
      case 'product-info':
        return <ProductInfoStep />;
      case 'review':
        return <ReviewStep />;
      default:
        return <FunnelTypeStep />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-foreground">
                  CopyGen Hispano
                </h1>
                <p className="text-xs text-muted-foreground">
                  Generador de Copys para Hispanoamérica
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="w-4 h-4" />
                  <span>Sistema de 3 Pilares</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  <span>Powered by AI</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <WizardNavigation />
        </div>

        {/* Step Content */}
        <div className="py-4">
          {renderStep()}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>
              © 2024 CopyGen Hispano. Creado para copywriters de habla hispana.
            </p>
            <div className="flex items-center gap-4">
              <span>🇲🇽 🇨🇴 🇦🇷 🇪🇸 🌎</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
