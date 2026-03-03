import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Pencil, Check, Copy, AlertTriangle, ExternalLink, X,
} from 'lucide-react';
import { useCorrections } from '@/hooks/useCorrections';
import { cn } from '@/lib/utils';
import type { ModeledScript, CorrectionType } from '@/types';

interface ScriptCardProps {
  script: ModeledScript;
  dnaExpertId?: string;
}

const CORRECTION_TYPES: { value: CorrectionType; label: string }[] = [
  { value: 'minor_edit', label: 'Edición menor' },
  { value: 'tone', label: 'Tono/Voz' },
  { value: 'structure', label: 'Estructura' },
  { value: 'content', label: 'Contenido' },
  { value: 'complete_rewrite', label: 'Reescritura completa' },
];

const FIELDS = [
  { key: 'hook_1', label: 'Hook 1' },
  { key: 'hook_2', label: 'Hook 2' },
  { key: 'cuerpo', label: 'Cuerpo' },
  { key: 'cta_1', label: 'CTA 1' },
  { key: 'cta_2', label: 'CTA 2' },
] as const;

function highlightPending(text: string) {
  if (!text) return text;
  return text.replace(
    /\[PENDIENTE:[^\]]*\]/g,
    (match) => `⚠️ ${match}`
  );
}

export default function ScriptCard({ script, dnaExpertId }: ScriptCardProps) {
  const { createCorrection, isCreating } = useCorrections();
  const [editing, setEditing] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({
    hook_1: script.hook_1,
    hook_2: script.hook_2,
    cuerpo: script.cuerpo,
    cta_1: script.cta_1,
    cta_2: script.cta_2,
  });
  const [correctionType, setCorrectionType] = useState<CorrectionType>('minor_edit');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [copied, setCopied] = useState(false);

  const hasChanges = FIELDS.some(
    (f) => editedFields[f.key] !== (script as any)[f.key]
  );

  const handleCopy = () => {
    const fullScript = FIELDS.map(
      (f) => `${f.label.toUpperCase()}:\n${(script as any)[f.key]}`
    ).join('\n\n');

    navigator.clipboard.writeText(fullScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCorrection = () => {
    const originalScript: Record<string, string> = {};
    const correctedScript: Record<string, string> = {};

    for (const f of FIELDS) {
      originalScript[f.key] = (script as any)[f.key];
      correctedScript[f.key] = editedFields[f.key];
    }

    createCorrection({
      generated_script: originalScript,
      corrected_script: correctedScript,
      correction_type: correctionType,
      correction_notes: correctionNotes || undefined,
      dna_expert_id: dnaExpertId || undefined,
      quality_score_before: script.quality_score,
    });

    setEditing(false);
    setCorrectionNotes('');
  };

  const handleCancel = () => {
    setEditedFields({
      hook_1: script.hook_1,
      hook_2: script.hook_2,
      cuerpo: script.cuerpo,
      cta_1: script.cta_1,
      cta_2: script.cta_2,
    });
    setEditing(false);
    setCorrectionNotes('');
  };

  const platformColors: Record<string, string> = {
    facebook: 'bg-blue-100 text-blue-700',
    instagram: 'bg-fuchsia-100 text-fuchsia-700',
    tiktok: 'bg-pink-100 text-pink-700',
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Contenido #{script.content_number}</span>
          <Badge className={cn('text-xs', platformColors[script.platform] || 'bg-gray-100 text-gray-700')}>
            {script.platform}
          </Badge>
          {script.needs_review && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 gap-1">
              <AlertTriangle className="w-3 h-3" />
              Revisión manual
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            Score: {script.quality_score}/100
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {script.link && (
            <a
              href={script.link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Referente */}
      <div className="px-4 py-2 bg-muted/10 border-b border-border">
        <p className="text-xs text-muted-foreground">{script.referente}</p>
      </div>

      {/* Fields */}
      <div className="p-4 space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 block">
              {f.label}
            </label>
            {editing ? (
              <Textarea
                value={editedFields[f.key]}
                onChange={(e) =>
                  setEditedFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                className="text-sm min-h-[80px] resize-y"
                rows={f.key === 'cuerpo' ? 8 : 3}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {highlightPending((script as any)[f.key] || '')}
              </p>
            )}
          </div>
        ))}

        {/* Pending items */}
        {script.pending_items && script.pending_items.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs font-semibold text-amber-700 mb-1">Items pendientes:</p>
            <ul className="text-xs text-amber-600 space-y-0.5">
              {script.pending_items.map((item, i) => (
                <li key={i}>- {item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Correction controls */}
      {editing && hasChanges && (
        <div className="px-4 py-3 border-t border-border bg-violet-50/50 space-y-3">
          <div className="flex gap-2">
            <select
              value={correctionType}
              onChange={(e) => setCorrectionType(e.target.value as CorrectionType)}
              className="text-xs border border-input rounded-md px-2 py-1.5 bg-background"
            >
              {CORRECTION_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
            <Input
              value={correctionNotes}
              onChange={(e) => setCorrectionNotes(e.target.value)}
              placeholder="Nota opcional (ej: más directo, menos formal...)"
              className="text-xs flex-1"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSaveCorrection}
              disabled={isCreating}
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white gap-1 text-xs"
            >
              <Check className="w-3 h-3" />
              Guardar corrección
            </Button>
            <Button onClick={handleCancel} size="sm" variant="ghost" className="text-xs">
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
