import ReactMarkdown from 'react-markdown';
import ScriptCard from '@/components/agent/ScriptCard';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, ModeledScript } from '@/types';

interface ChatBubbleProps {
  message: ChatMessage;
  dnaExpertId?: string;
  onButtonClick?: (value: string) => void;
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

export default function ChatBubble({ message, dnaExpertId, onButtonClick }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // System messages (pipeline progress)
  if (isSystem) {
    return (
      <div className="flex justify-center px-4 py-1">
        <div className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
          {message.pipelineStatus || message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2.5 px-4', isUser ? 'justify-end' : 'justify-start')}>
      {/* Avatar - assistant only */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-violet-600" />
        </div>
      )}

      <div className={cn('max-w-[80%] space-y-2', isUser && 'flex flex-col items-end')}>
        {/* Name */}
        {!isUser && (
          <span className="text-xs font-medium text-violet-600">Hooq</span>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-violet-600 text-white rounded-br-md'
              : 'bg-violet-50 border border-violet-100 text-foreground rounded-bl-md',
          )}
        >
          {message.isLoading ? (
            <LoadingDots />
          ) : (
            <div className="prose prose-sm max-w-none [&_p]:m-0 [&_p]:leading-relaxed">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.attachments.map((att, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border">
                {att.name}
              </span>
            ))}
          </div>
        )}

        {/* Suggested buttons */}
        {message.buttons && message.buttons.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.buttons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => onButtonClick?.(btn.value)}
                className="text-sm px-3.5 py-1.5 rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:border-violet-300 transition-all font-medium"
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* Inline scripts */}
        {message.scripts && message.scripts.length > 0 && (
          <div className="space-y-3 w-full max-w-2xl mt-2">
            {message.scripts.map((script: ModeledScript) => (
              <ScriptCard
                key={script.content_number}
                script={script}
                dnaExpertId={dnaExpertId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Avatar - user only */}
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
