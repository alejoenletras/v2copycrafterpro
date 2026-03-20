import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Send, Copy, Check, MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME_MESSAGE =
  'Colega, soy el asistente de copy de SaleADS. Pídeme cualquier pieza: un email, un WhatsApp, una descripción de YouTube, un caption, una respuesta a objeción, un texto de landing... lo que necesites, en la voz de SaleADS.';

const QUICK_STARTS = [
  'Email de bienvenida',
  'WhatsApp de venta',
  'Descripción de YouTube',
  'Caption para Instagram',
  'Respuesta a objeción',
];

export default function BrandChatPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: dnas } = useQuery({
    queryKey: ['chat-dnas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('dnas')
        .select('type, data')
        .in('type', ['expert', 'audience', 'product']);
      const result: Record<string, string> = {};
      for (const d of data || []) {
        result[d.type] = typeof d.data === 'string' ? d.data : JSON.stringify(d.data);
      }
      return result;
    },
  });

  // Auto-scroll on new messages or loading change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('brand-chat', {
        body: { messages: updated, dnas },
      });

      if (error) throw error;

      const reply = data?.reply || data?.content || 'Sin respuesta.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'No se pudo obtener respuesta.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast({ title: 'Copiado al portapapeles' });
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border/40">
        <div className="p-2 rounded-lg bg-primary/10">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Chat de Marca</h1>
          <p className="text-xs text-muted-foreground">
            Genera copy en la voz de tu marca
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted/60 text-foreground rounded-bl-md border border-border/40'
              }`}
            >
              {msg.content}

              {msg.role === 'assistant' && i > 0 && (
                <button
                  onClick={() => handleCopy(msg.content, i)}
                  className="absolute -bottom-3 right-2 p-1 rounded-md bg-background border border-border/60 hover:bg-muted transition-colors"
                  title="Copiar"
                >
                  {copiedIdx === i ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted/60 border border-border/40 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick-start buttons (only show when just the welcome message exists) */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {QUICK_STARTS.map((label) => (
            <button
              key={label}
              onClick={() => sendMessage(label)}
              className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-muted/40 hover:bg-muted text-foreground transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border/40 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe lo que necesitas..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[42px] max-h-[120px]"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
