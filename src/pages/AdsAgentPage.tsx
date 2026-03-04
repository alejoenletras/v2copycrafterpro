import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDNAs } from '@/hooks/useDNAs';
import { useAdsAgentChat } from '@/hooks/useAdsAgentChat';
import ChatBubble from '@/components/agent-chat/ChatBubble';
import ChatInput from '@/components/agent-chat/ChatInput';
import DnaBar from '@/components/agent-chat/DnaBar';
import { Button } from '@/components/ui/button';
import { Home, Bot, RotateCcw } from 'lucide-react';

// ─── Build DNA context string ─────────────────────────────────────────────────

function buildDnaString(dnas: Array<{ id: string; type: string; data: Record<string, any> }> | undefined, dnaId: string): string {
  const dna = dnas?.find(d => d.id === dnaId);
  if (!dna?.data) return '';
  const d = dna.data as Record<string, any>;

  const safeJoin = (val: any, sep = ', '): string => {
    if (Array.isArray(val)) return val.join(sep) || '';
    if (typeof val === 'string') return val || '';
    return '';
  };

  if (dna.type === 'expert') {
    // Simple flat DNA format
    if (d.about || d.voice || d.credentials) {
      return [
        d.about ? `Sobre mí: ${d.about}` : '',
        d.voice ? `Voz/tono: ${d.voice}` : '',
        d.credentials ? `Credenciales: ${d.credentials}` : '',
        d.forbidden_words ? `Palabras prohibidas: ${d.forbidden_words}` : '',
      ].filter(Boolean).join('\n');
    }
    // Legacy rich DNA format
    const v = d.voice || {};
    const s = d.story || {};
    const b = d.beliefs || {};
    return [
      `Nombre: ${v.name || ''}`,
      `Tono: ${safeJoin(v.adjectives)}`,
      s.lowestPoint ? `Historia: ${s.lowestPoint} → ${s.breakthrough || ''} → ${s.current || ''}` : '',
      b.centralPromise ? `Promesa: ${b.centralPromise}` : '',
      b.commonEnemy ? `Enemigo: ${b.commonEnemy}` : '',
    ].filter(Boolean).join('\n');
  }

  if (dna.type === 'audience') {
    if (d.ideal_client || d.core_belief) {
      return [
        d.ideal_client ? `Cliente ideal: ${d.ideal_client}` : '',
        d.core_belief ? `Creencia core: ${d.core_belief}` : '',
        d.testimonials ? `Testimonios: ${d.testimonials}` : '',
        d.keywords ? `Keywords: ${d.keywords}` : '',
      ].filter(Boolean).join('\n');
    }
    const p = d.pains || {};
    const des = d.desires || {};
    return [
      p.primary ? `Dolor principal: ${p.primary}` : '',
      des.identityTransformation ? `Transformación deseada: ${des.identityTransformation}` : '',
      safeJoin(p.economic) ? `Dolores económicos: ${safeJoin(p.economic)}` : '',
    ].filter(Boolean).join('\n');
  }

  if (dna.type === 'product') {
    if (d.main_problem || d.solution_promise) {
      return [
        d.main_problem ? `Problema: ${d.main_problem}` : '',
        d.solution_promise ? `Promesa: ${d.solution_promise}` : '',
        d.irresistible_offer ? `Oferta: ${d.irresistible_offer}` : '',
        d.keywords ? `Keywords: ${d.keywords}` : '',
      ].filter(Boolean).join('\n');
    }
    return [
      d.name ? `Producto: ${d.name}` : '',
      d.price ? `Precio: $${d.price}` : '',
      d.audienceProblem ? `Problema: ${d.audienceProblem}` : '',
      d.solution ? `Solución: ${d.solution}` : '',
      d.transformationOffer ? `Transformación: ${d.transformationOffer}` : '',
    ].filter(Boolean).join('\n');
  }

  return Object.entries(d)
    .filter(([k, v]) => v !== null && v !== undefined && v !== '' && !k.startsWith('_'))
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('\n');
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdsAgentPage() {
  const navigate = useNavigate();
  const { dnas } = useDNAs();
  const chat = useAdsAgentChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-select first DNA of each type
  useEffect(() => {
    if (!dnas) return;
    if (!chat.personalityId) {
      const first = dnas.find(d => d.type === 'expert');
      if (first) chat.setPersonalityId(first.id);
    }
    if (!chat.audienceId) {
      const first = dnas.find(d => d.type === 'audience');
      if (first) chat.setAudienceId(first.id);
    }
    if (!chat.productId) {
      const first = dnas.find(d => d.type === 'product');
      if (first) chat.setProductId(first.id);
    }
  }, [dnas]);

  // Wire up DNA string builder
  useEffect(() => {
    chat.setBuildDnaString((id: string) => buildDnaString(dnas as any, id));
  }, [dnas, chat.setBuildDnaString]);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chat.messages]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
              <Home className="w-4 h-4" />
            </button>
            <span className="text-muted-foreground">/</span>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-600" />
              <span className="font-semibold text-sm text-foreground">Agente de Anuncios</span>
            </div>
            {chat.pipelinePhase && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 animate-pulse">
                {chat.pipelinePhase === 'searching' ? 'Buscando...' :
                 chat.pipelinePhase === 'modeling' ? 'Modelando...' : chat.pipelinePhase}
              </span>
            )}
          </div>
          <Button onClick={chat.resetChat} variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
            <RotateCcw className="w-3.5 h-3.5" />
            Nueva
          </Button>
        </div>
      </header>

      {/* DNA Bar */}
      <div className="max-w-4xl mx-auto w-full">
        <DnaBar
          dnas={dnas || []}
          personalityId={chat.personalityId}
          audienceId={chat.audienceId}
          productId={chat.productId}
          onPersonalityChange={chat.setPersonalityId}
          onAudienceChange={chat.setAudienceId}
          onProductChange={chat.setProductId}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-4">
          {chat.messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              dnaExpertId={chat.personalityId}
              onButtonClick={chat.selectButton}
            />
          ))}
        </div>

        {/* Input */}
        <ChatInput
          onSend={chat.sendMessage}
          disabled={chat.isProcessing}
          placeholder={
            chat.isProcessing
              ? 'Hooq está pensando...'
              : chat.pipelinePhase
                ? 'Pipeline en ejecución...'
                : 'Escribe tu mensaje...'
          }
        />
      </div>
    </div>
  );
}
