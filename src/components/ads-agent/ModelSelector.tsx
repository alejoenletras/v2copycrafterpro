import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export type AIModelId =
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5-20251001'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash';

const MODELS: { id: AIModelId; label: string; provider: string; available: boolean }[] = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'Anthropic', available: true },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'Anthropic', available: true },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', available: false },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', provider: 'OpenAI', available: false },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'Google', available: false },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'Google', available: false },
];

const STORAGE_KEY = 'hooq_ai_model';

export function getStoredModel(): AIModelId {
  return (localStorage.getItem(STORAGE_KEY) as AIModelId) || 'claude-sonnet-4-6';
}

interface ModelSelectorProps {
  value: AIModelId;
  onChange: (model: AIModelId) => void;
  className?: string;
}

export default function ModelSelector({ value, onChange, className }: ModelSelectorProps) {
  const handleChange = (v: string) => {
    const model = v as AIModelId;
    localStorage.setItem(STORAGE_KEY, model);
    onChange(model);
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MODELS.map((m) => (
          <SelectItem key={m.id} value={m.id} disabled={!m.available}>
            <div className="flex items-center gap-2">
              <span>{m.label}</span>
              <span className="text-xs text-muted-foreground">{m.provider}</span>
              {!m.available && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                  Próximamente
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
