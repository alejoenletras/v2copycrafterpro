import { useState, useRef } from 'react';
import {
  UploadCloud, FileSpreadsheet, X, Sparkles, Download, Copy, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text: string): { columns: { name: string; values: string[] }[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter(l => l.trim());
  if (nonEmpty.length < 2) return { columns: [] };

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        fields.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    return fields;
  };

  const headers = parseRow(nonEmpty[0]);
  const columns = headers.map(h => ({ name: h.trim().replace(/^"|"$/g, ''), values: [] as string[] }));

  for (let i = 1; i < nonEmpty.length; i++) {
    const row = parseRow(nonEmpty[i]);
    for (let j = 0; j < columns.length; j++) {
      columns[j].values.push((row[j] ?? '').trim());
    }
  }

  return { columns };
}

// ─── Simple markdown renderer ─────────────────────────────────────────────────
function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-6 mb-2 text-foreground">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-8 mb-3 text-foreground border-b border-border/40 pb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4 text-foreground">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-3 border-violet-500/40 pl-4 py-1 my-2 text-sm italic text-muted-foreground">$1</blockquote>')
    // Bullet lists
    .replace(/^[•\-] (.+)$/gm, '<li class="ml-4 text-sm leading-relaxed list-disc">$1</li>')
    // Tables (simple: | col | col |)
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => /^[-:\s]+$/.test(c))) return ''; // separator row
      const isHeader = cells.every(c => c.trim().length > 0);
      const tag = isHeader ? 'td' : 'td';
      return `<tr>${cells.map(c => `<${tag} class="px-3 py-1.5 text-sm border border-border/30">${c.trim()}</${tag}>`).join('')}</tr>`;
    })
    // Wrap consecutive <tr> in <table>
    .replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table class="w-full border-collapse my-4 text-sm">$1</table>')
    // Paragraphs (lines that aren't already HTML)
    .replace(/^(?!<[a-z])((?!\s*$).+)$/gm, '<p class="text-sm leading-relaxed my-1.5">$1</p>')
    // Line breaks
    .replace(/\n\n/g, '<div class="h-2"></div>');
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function SurveyAnalysisPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<{ name: string; values: string[] }[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({ title: 'Formato no válido', description: 'Solo se aceptan archivos .csv', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { columns: parsed } = parseCSV(text);
      if (parsed.length === 0) {
        toast({ title: 'CSV vacío', description: 'No se encontraron columnas válidas', variant: 'destructive' });
        return;
      }
      setColumns(parsed);
      setFileName(file.name);
      setTotalRows(parsed[0]?.values.filter(v => v.trim()).length ?? 0);
      setDocument('');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async () => {
    if (columns.length === 0) return;
    setLoading(true);
    setDocument('');
    try {
      const trimmedColumns = columns.map(col => ({
        name: col.name,
        values: col.values.slice(0, 200),
      }));

      const { data, error } = await supabase.functions.invoke('analyze-survey', {
        body: { columns: trimmedColumns, context: context.trim() || undefined },
      });

      if (error) throw new Error(error.message);
      if (!data) throw new Error('La función no devolvió datos.');
      if (data.error) throw new Error(data.error);
      if (!data.document) throw new Error('No se generó el documento. Intenta de nuevo.');

      setDocument(data.document);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error al analizar', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!document) return;
    const blob = new Blob([document], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `Avatar_Comprador_${fileName.replace('.csv', '')}_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(document);
    setCopied(true);
    toast({ title: 'Documento copiado al portapapeles' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Análisis de Encuestas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sube un CSV y obtén un documento completo de Avatar del Comprador con datos reales.
        </p>
      </div>

      {/* Upload */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !columns.length && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          columns.length ? 'border-violet-500/40 bg-violet-500/5 cursor-default' : 'border-border hover:border-violet-500/40 hover:bg-muted/30 cursor-pointer'
        }`}
      >
        {columns.length === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <UploadCloud size={36} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Arrastra tu CSV aquí o <span className="text-violet-400 underline">selecciona archivo</span></p>
            <p className="text-xs text-muted-foreground">Google Forms, Typeform, SurveyMonkey — cualquier exportación CSV</p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={24} className="text-violet-400" />
              <div className="text-left">
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">{totalRows} respuestas · {columns.length} preguntas</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setColumns([]); setFileName(''); setDocument(''); }}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      </div>

      {/* Context + Analyze */}
      {columns.length > 0 && !document && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Contexto del negocio <span className="text-muted-foreground font-normal">(opcional)</span></label>
          <Textarea
            placeholder="Ej: Somos SaleADS.ai, vendemos un software de IA para publicidad. Esta encuesta fue a compradores del lanzamiento de enero 2026..."
            value={context}
            onChange={e => setContext(e.target.value)}
            className="resize-none text-sm"
            rows={3}
          />
          <Button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Generando Avatar del Comprador con Opus... (puede tardar 1-2 min)
              </span>
            ) : (
              <span className="flex items-center gap-2"><Sparkles size={15} />Generar Avatar del Comprador</span>
            )}
          </Button>
        </div>
      )}

      {/* Document result */}
      {document && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex items-center justify-between border border-border/40 rounded-xl px-4 py-3 bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Documento generado · {document.length.toLocaleString()} caracteres
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyAll}>
                {copied ? <Check size={14} className="mr-1.5 text-green-500" /> : <Copy size={14} className="mr-1.5" />}
                {copied ? 'Copiado' : 'Copiar todo'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download size={14} className="mr-1.5" />
                Descargar .md
              </Button>
            </div>
          </div>

          {/* Rendered document */}
          <div
            className="border border-border/40 rounded-xl p-6 sm:p-8 bg-background prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(document) }}
          />

          {/* Analyze again */}
          <Button
            variant="outline"
            onClick={() => { setDocument(''); }}
            className="w-full"
          >
            Analizar otra encuesta
          </Button>
        </div>
      )}
    </div>
  );
}
