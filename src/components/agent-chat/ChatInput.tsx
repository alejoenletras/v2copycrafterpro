import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (text: string, attachments?: Array<{ name: string; content: string }>) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Array<{ name: string; content: string }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      // Only text-based files
      if (file.size > 500_000) continue; // 500KB limit
      try {
        const content = await file.text();
        setAttachments(prev => [...prev, { name: file.name, content: content.substring(0, 5000) }]);
      } catch {
        // skip binary files
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    for (const file of Array.from(files)) {
      if (file.size > 500_000) continue;
      try {
        const content = await file.text();
        setAttachments(prev => [...prev, { name: file.name, content: content.substring(0, 5000) }]);
      } catch {
        // skip
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className="border-t border-border bg-card px-4 py-3"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachments.map((att, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-violet-50 border border-violet-200 text-violet-700">
              {att.name}
              <button onClick={() => removeAttachment(i)} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* File upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          title="Adjuntar referencia"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".txt,.md,.html,.csv,.json"
          multiple
          onChange={handleFileChange}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); adjustHeight(); }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder || 'Escribe tu mensaje...'}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'max-h-40 scrollbar-thin',
          )}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && attachments.length === 0)}
          className={cn(
            'p-2.5 rounded-xl transition-all',
            text.trim() || attachments.length > 0
              ? 'bg-violet-600 text-white hover:bg-violet-700'
              : 'bg-muted text-muted-foreground',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
