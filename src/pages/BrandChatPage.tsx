import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Send, Copy, Check, MessageSquare, Loader2, Paperclip, X, FileText, Image as ImageIcon, Plus, Trash2, PanelLeftClose, PanelLeft, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserId } from '@/hooks/useUserId';

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

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function BrandChatPage() {
  const { toast } = useToast();
  const userId = useUserId();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sidebar & persistence state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const { data: dnas } = useQuery({
    queryKey: ['chat-dnas', userId],
    enabled: !!userId,
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

  // Fetch conversation list
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setLoadingConversations(true);
    try {
      const { data, error } = await supabase
        .from('chat_conversations' as any)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setConversations(data || []);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [userId]);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load messages for a conversation
  const loadConversation = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages' as any)
        .select('role, content, attachments')
        .eq('conversation_id', convId)
        .order('message_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const loaded: ChatMessage[] = data.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          attachments: m.attachments || undefined,
        }));
        setMessages([{ role: 'assistant', content: WELCOME_MESSAGE }, ...loaded]);
      } else {
        setMessages([{ role: 'assistant', content: WELCOME_MESSAGE }]);
      }
      setConversationId(convId);
      setInput('');
      setAttachments([]);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los mensajes.',
        variant: 'destructive',
      });
    }
  };

  // Start new conversation
  const startNewConversation = () => {
    setConversationId(null);
    setMessages([{ role: 'assistant', content: WELCOME_MESSAGE }]);
    setInput('');
    setAttachments([]);
  };

  // Delete a conversation
  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Delete messages first (FK constraint)
      await supabase.from('chat_messages' as any).delete().eq('conversation_id', convId);
      await supabase.from('chat_conversations' as any).delete().eq('id', convId);

      setConversations((prev) => prev.filter((c) => c.id !== convId));

      // If we deleted the active conversation, reset
      if (convId === conversationId) {
        startNewConversation();
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la conversación.',
        variant: 'destructive',
      });
    }
  };

  // Save messages to Supabase
  const saveMessages = async (
    convId: string,
    userMsg: ChatMessage,
    assistantMsg: ChatMessage,
    existingMessageCount: number
  ) => {
    try {
      const baseOrder = existingMessageCount; // messages already in DB
      const rows = [
        {
          conversation_id: convId,
          role: userMsg.role,
          content: userMsg.content,
          attachments: userMsg.attachments
            ? userMsg.attachments.map((a) => ({ name: a.name, media_type: a.media_type, data: a.data }))
            : null,
          message_order: baseOrder,
        },
        {
          conversation_id: convId,
          role: assistantMsg.role,
          content: assistantMsg.content,
          attachments: null,
          message_order: baseOrder + 1,
        },
      ];

      await supabase.from('chat_messages' as any).insert(rows);

      // Update conversation updated_at
      await supabase
        .from('chat_conversations' as any)
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);
    } catch (err: any) {
      console.error('Error saving messages:', err);
    }
  };

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

    // Track whether this is the first user message (need to create conversation)
    const isFirstMessage = conversationId === null;
    // Count existing persisted messages (exclude welcome message)
    const existingPersistedCount = isFirstMessage ? 0 : messages.length - 1; // -1 for welcome

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
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      setMessages((prev) => [...prev, assistantMsg]);

      // Persistence: create or update conversation
      let activeConvId = conversationId;

      if (isFirstMessage) {
        // Create new conversation
        const title = (trimmed || '(archivo adjunto)').slice(0, 50);
        const { data: convData, error: convError } = await supabase
          .from('chat_conversations' as any)
          .insert({ title, user_id: userId })
          .select('*')
          .single();

        if (convError) {
          console.error('Error creating conversation:', convError);
        } else if (convData) {
          activeConvId = convData.id;
          setConversationId(convData.id);
          setConversations((prev) => [convData, ...prev]);
        }
      }

      // Save both messages
      if (activeConvId) {
        await saveMessages(activeConvId, userMsg, assistantMsg, existingPersistedCount);
        // Refresh conversations list to update order
        fetchConversations();
      }
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

  const handleDownloadConversation = () => {
    // Skip the welcome message (index 0), only include real conversation
    const conversationMessages = messages.filter((_, i) => i > 0);
    if (conversationMessages.length === 0) {
      toast({ title: 'No hay mensajes para descargar' });
      return;
    }
    const content = conversationMessages
      .map((msg) => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
      .join('\n\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-marca-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-200 overflow-hidden flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col`}
      >
        {/* Sidebar header */}
        <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
          <button
            onClick={startNewConversation}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva conversación
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-6 px-3">
              Sin conversaciones aún
            </p>
          ) : (
            <div className="py-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`group flex items-center gap-2 px-3 py-2.5 mx-1 my-0.5 rounded-lg cursor-pointer transition-colors ${
                    conv.id === conversationId
                      ? 'bg-zinc-700/80 text-zinc-100'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-50" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{conv.title}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {formatDate(conv.updated_at || conv.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-all"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border/40">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title={sidebarOpen ? 'Cerrar panel' : 'Abrir panel'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-5 h-5 text-muted-foreground" />
            ) : (
              <PanelLeft className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Chat de Marca</h1>
            <p className="text-xs text-muted-foreground">
              Genera copy en la voz de tu marca
            </p>
          </div>
          {messages.length > 1 && (
            <button
              onClick={handleDownloadConversation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Descargar conversación como .txt"
            >
              <Download className="w-4 h-4" />
              Descargar conversación
            </button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="max-w-3xl mx-auto space-y-4">
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
        </div>

        {/* Quick-start buttons */}
        {messages.length === 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2 max-w-3xl mx-auto w-full">
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
          <div className="px-4 pb-1 flex flex-wrap gap-2 max-w-3xl mx-auto w-full">
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
          <div className="max-w-3xl mx-auto flex items-end gap-2">
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
    </div>
  );
}
