import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Send, Copy, Check, MessageSquare, Loader2, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Attachment {
  name: string;
  media_type: string;
  data: string; // base64
  preview?: string; // for images
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

const WELCOME_MESSAGE =
  'Soy el asistente de copy de SaleADS. Pídeme cualquier pieza: un email, un WhatsApp, una descripción de YouTube, un caption, una respuesta a objeción, un texto de landing... lo que necesites, en la voz de SaleADS.\n\nPuedes adjuntar documentos (PDF, TXT, CSV) e imágenes para darme más contexto.';

const QUICK_STARTS = [
  'Email de bienvenida',
  'WhatsApp de venta',
  'Descripción de YouTube',
  'Caption para Instagram',
  'Respuesta a objeción',
];

const ACCEPTED_TYPES = '.pdf,.txt,.csv,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp';
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // remove data:...;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BrandChatPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: 'Archivo muy grande', description: `${file.name} supera 10MB`, variant: 'destructive' });
        continue;
      }

      const base64 = await fileToBase64(file);
      const isImage = IMAGE_TYPES.includes(file.type);

      newAttachments.push({
        name: file.name,
        media_type: file.type || 'application/octet-stream',
        data: base64,
        preview: isImage ? `data:${file.type};base64,${base64}` : undefined,
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: trimmed || '(archivo adjunto)',
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setAttachments([]);
    setLoading(true);

    try {
      // Send messages with attachments to edge function
      const payload = updated.map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments?.map((a) => ({
          name: a.name,
          media_type: a.media_type,
          data: a.data,
        })),
      }));

      const { data, error } = await supabase.functions.invoke('brand-chat', {
        body: { messages: payload, dnas },
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
              {/* Show attachment chips for user messages */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {msg.attachments.map((att, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-black/10"
                    >
                      {att.preview ? (
                        <ImageIcon className="w-3 h-3" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      {att.name.length > 20 ? att.name.slice(0, 17) + '...' : att.name}
                    </span>
                  ))}
                </div>
              )}

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

      {/* Quick-start buttons */}
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

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="px-4 pb-1 flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="relative group inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border/60 bg-muted/40"
            >
              {att.preview ? (
                <img src={att.preview} alt={att.name} className="w-8 h-8 rounded object-cover" />
              ) : (
                <FileText className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="max-w-[120px] truncate">{att.name}</span>
              <button
                onClick={() => removeAttachment(i)}
                className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border/40 px-4 py-3">
        <div className="flex items-end gap-2">
          {/* File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border/60 hover:bg-muted transition-colors disabled:opacity-40"
            title="Adjuntar archivo o imagen"
          >
            <Paperclip className="w-4 h-4 text-muted-foreground" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />

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
            disabled={(!input.trim() && attachments.length === 0) || loading}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
