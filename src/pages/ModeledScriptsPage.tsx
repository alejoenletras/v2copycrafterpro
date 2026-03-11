import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModeledScripts } from '@/hooks/useModeledScripts';
import { useDNAs } from '@/hooks/useDNAs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, FileText, Copy, Check, ChevronDown, ChevronUp, ExternalLink, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModeledScriptV3, ScriptStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import GenerateScriptsModal from '@/components/scripts/GenerateScriptsModal';

// ─── Copy button ──────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors" title="Copiar">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Status badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: ScriptStatus }) {
  const map: Record<ScriptStatus, string> = {
    draft:    'bg-muted text-muted-foreground border-border',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    used:     'bg-blue-100 text-blue-700 border-blue-200',
  };
  const labels: Record<ScriptStatus, string> = {
    draft: 'Borrador', approved: 'Aprobado', rejected: 'Rechazado', used: 'Usado',
  };
  return <Badge variant="outline" className={cn('text-xs', map[status])}>{labels[status]}</Badge>;
}

// ─── Script card ──────────────────────────────────────────────
function ScriptCard({ script, onStatusChange }: { script: ModeledScriptV3; onStatusChange: (id: string, status: ScriptStatus) => void }) {
  const [expanded, setExpanded] = useState(false);

  const copyAll = () => {
    const parts = [
      `HOOK 1:\n${script.hook_1}`,
      script.hook_2 ? `HOOK 2:\n${script.hook_2}` : null,
      `CUERPO:\n${script.body}`,
      `CTA:\n${script.cta}`,
      script.production_notes ? `NOTAS DE PRODUCCIÓN:\n${script.production_notes}` : null,
    ].filter(Boolean);
    navigator.clipboard.writeText(parts.join('\n\n'));
  };

  return (
    <div className={cn('border rounded-xl overflow-hidden', script.status === 'rejected' && 'opacity-60')}>
      {/* Header */}
      <div className="px-4 py-3 bg-muted/30 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={script.status} />
          {script.referente_name && (
            <Badge variant="outline" className="text-xs">
              Ref: {script.referente_name}
            </Badge>
          )}
          {script.script_format && (
            <Badge variant="outline" className="text-xs capitalize">
              {script.script_format.replace('_', ' ')}
            </Badge>
          )}
          {script.target_platform && (
            <Badge variant="outline" className="text-xs capitalize">
              {script.target_platform}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(script.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {script.google_doc_url && (
            <a href={script.google_doc_url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Ver en Google Doc">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={copyAll}>
            <Copy className="w-3 h-3" /> Copiar todo
          </Button>
          {script.status !== 'approved' && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600" title="Aprobar"
              onClick={() => onStatusChange(script.id, 'approved')}>
              <ThumbsUp className="w-3.5 h-3.5" />
            </Button>
          )}
          {script.status !== 'rejected' && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" title="Rechazar"
              onClick={() => onStatusChange(script.id, 'rejected')}>
              <ThumbsDown className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Hook 1 — always visible */}
      <div className="px-4 py-3 border-t">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Hook 1</span>
          <CopyButton text={script.hook_1} />
        </div>
        <p className="text-sm whitespace-pre-wrap">{script.hook_1}</p>
      </div>

      {/* Expanded content */}
      {expanded && (
        <>
          {script.hook_2 && (
            <div className="px-4 py-3 border-t bg-violet-50/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Hook 2</span>
                <CopyButton text={script.hook_2} />
              </div>
              <p className="text-sm whitespace-pre-wrap">{script.hook_2}</p>
            </div>
          )}

          <div className="px-4 py-3 border-t">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Cuerpo</span>
              <CopyButton text={script.body} />
            </div>
            <p className="text-sm whitespace-pre-wrap">{script.body}</p>
          </div>

          <div className="px-4 py-3 border-t bg-emerald-50/30">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">CTA</span>
              <CopyButton text={script.cta} />
            </div>
            <p className="text-sm whitespace-pre-wrap">{script.cta}</p>
          </div>

          {script.production_notes && (
            <div className="px-4 py-3 border-t bg-amber-50/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Notas de producción</span>
                <CopyButton text={script.production_notes} />
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{script.production_notes}</p>
            </div>
          )}

          {(script.what_was_modeled || script.why_it_works || script.how_adapted) && (
            <div className="px-4 py-3 border-t bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Análisis de modelado</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                {script.what_was_modeled && <p><span className="font-medium">Qué se modeló:</span> {script.what_was_modeled}</p>}
                {script.why_it_works && <p><span className="font-medium">Por qué funciona:</span> {script.why_it_works}</p>}
                {script.how_adapted && <p><span className="font-medium">Cómo se adaptó:</span> {script.how_adapted}</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function ModeledScriptsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { dnas } = useDNAs();
  const [filterStatus, setFilterStatus] = useState<ScriptStatus | ''>('');
  const [filterDna, setFilterDna] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);

  const { scripts, isLoading, updateStatus } = useModeledScripts({
    personalityDnaId: filterDna || undefined,
    status: filterStatus || undefined,
  });

  const expertDnas = dnas?.filter(d => d.type === 'expert') ?? [];

  const handleStatusChange = (id: string, status: ScriptStatus) => {
    updateStatus({ id, status });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-1" /> Inicio
          </Button>
          <h1 className="font-bold text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" /> Guiones Modelados
          </h1>
          <Badge variant="outline" className="text-xs">{scripts.length} guiones</Badge>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setShowGenerate(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              Generar guiones
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 w-full space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            className="text-sm border rounded-md px-3 py-1.5 bg-background"
            value={filterDna}
            onChange={e => setFilterDna(e.target.value)}
          >
            <option value="">Todos los DNAs</option>
            {expertDnas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select
            className="text-sm border rounded-md px-3 py-1.5 bg-background"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as ScriptStatus | '')}
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
            <option value="used">Usados</option>
          </select>

          {(filterDna || filterStatus) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterDna(''); setFilterStatus(''); }}>
              Limpiar filtros
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-semibold text-foreground">Sin guiones todavía</p>
            <p className="text-sm mt-1 mb-6">Genera guiones seleccionando tus DNAs y referentes asignados.</p>
            <Button onClick={() => setShowGenerate(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Generar primeros guiones
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {scripts.map(script => (
              <ScriptCard key={script.id} script={script} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </main>

      {showGenerate && (
        <GenerateScriptsModal
          open={showGenerate}
          onClose={() => setShowGenerate(false)}
        />
      )}
    </div>
  );
}
