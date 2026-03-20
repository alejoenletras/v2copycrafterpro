import { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud, FileSpreadsheet, X, Sparkles, Download, Copy, Check,
  Clock, Trash2, ArrowLeft, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/hooks/useUserId';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SurveyAnalysisRecord {
  id: string;
  file_name: string;
  total_rows: number;
  context: string | null;
  document: string;
  status: string;
  created_at: string;
}

// ─── Relative date helper ─────────────────────────────────────────────────────
function relativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'hace un momento';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

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
  const userId = useUserId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<{ name: string; values: string[] }[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState('');
  const [copied, setCopied] = useState(false);

  // ─── History state ────────────────────────────────────────────────────────
  const [history, setHistory] = useState<SurveyAnalysisRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [viewingRecord, setViewingRecord] = useState<SurveyAnalysisRecord | null>(null);

  // ─── Fetch history ────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('survey_analyses')
        .select('id, file_name, total_rows, context, document, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setHistory(data ?? []);
    } catch {
      // Silently fail — table might not exist yet
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ─── Save analysis to Supabase ────────────────────────────────────────────
  const saveAnalysis = async (doc: string) => {
    try {
      const { error } = await supabase.from('survey_analyses').insert({
        user_id: userId,
        file_name: fileName,
        total_rows: totalRows,
        context: context.trim() || null,
        document: doc,
        status: 'completed',
      });
      if (error) throw error;
      fetchHistory();
    } catch {
      // Don't block user experience for persistence errors
    }
  };

  // ─── Delete analysis ──────────────────────────────────────────────────────
  const deleteAnalysis = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('survey_analyses').delete().eq('id', id);
      if (error) throw error;
      setHistory(prev => prev.filter(r => r.id !== id));
      if (viewingRecord?.id === id) {
        setViewingRecord(null);
      }
      toast({ title: 'Análisis eliminado' });
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  // ─── View past analysis ───────────────────────────────────────────────────
  const viewRecord = (record: SurveyAnalysisRecord) => {
    setViewingRecord(record);
  };

  const handleBackFromHistory = () => {
    setViewingRecord(null);
  };

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
      setViewingRecord(null);
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
      // Send all values — the edge function handles sampling
      const trimmedColumns = columns.map(col => ({
        name: col.name,
        values: col.values,
      }));

      // Use fetch directly for SSE streaming (supabase.functions.invoke doesn't support streams)
      const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-survey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ columns: trimmedColumns, context: context.trim() || undefined }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errData.error || `Error ${response.status}`);
      }

      // Read SSE stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.chunk) {
              accumulated += event.chunk;
              setDocument(accumulated);
            }
            if (event.done && event.document) {
              setDocument(event.document);
              accumulated = event.document;
            }
            if (event.error) {
              throw new Error(event.error);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }

      if (!accumulated) throw new Error('No se generó el documento. Intenta de nuevo.');

      // Save to Supabase on success
      await saveAnalysis(accumulated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error al analizar', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Download/copy helpers (work for both current and viewed record) ──────
  const activeDocument = viewingRecord?.document ?? document;
  const activeFileName = viewingRecord?.file_name ?? fileName;

  const handleDownloadTxt = () => {
    if (!activeDocument) return;
    const blob = new Blob([activeDocument], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `Avatar_Comprador_${activeFileName.replace('.csv', '')}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocx = async () => {
    if (!activeDocument) return;
    // Generate a simple HTML-based .doc file (opens in Word/Google Docs)
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Avatar del Comprador</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.6;max-width:700px;margin:0 auto;padding:40px}
h1{font-size:22pt;color:#1a1a2e;border-bottom:2px solid #e94560;padding-bottom:8px}
h2{font-size:16pt;color:#1a1a2e;margin-top:24px;border-bottom:1px solid #ddd;padding-bottom:4px}
h3{font-size:13pt;color:#333}
blockquote{border-left:3px solid #e94560;padding-left:12px;color:#555;font-style:italic;margin:8px 0}
table{border-collapse:collapse;width:100%;margin:12px 0}
td,th{border:1px solid #ddd;padding:6px 10px;text-size:10pt}
li{margin:2px 0}</style></head>
<body>${renderMarkdown(activeDocument)}</body></html>`;
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `Avatar_Comprador_${activeFileName.replace('.csv', '')}_${new Date().toISOString().split('T')[0]}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(activeDocument);
    setCopied(true);
    toast({ title: 'Documento copiado al portapapeles' });
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Viewing a past analysis ──────────────────────────────────────────────
  if (viewingRecord) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={handleBackFromHistory} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft size={16} />
          Volver
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{viewingRecord.file_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {viewingRecord.total_rows} respuestas &middot; {relativeDate(viewingRecord.created_at)}
          </p>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between border border-border/40 rounded-xl px-4 py-3 bg-muted/20">
          <p className="text-sm text-muted-foreground">
            Documento guardado &middot; {viewingRecord.document.length.toLocaleString()} caracteres
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyAll}>
              {copied ? <Check size={14} className="mr-1.5 text-green-500" /> : <Copy size={14} className="mr-1.5" />}
              {copied ? 'Copiado' : 'Copiar todo'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadTxt}>
              <Download size={14} className="mr-1.5" />
              .txt
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadDocx}>
              <Download size={14} className="mr-1.5" />
              .doc
            </Button>
          </div>
        </div>

        {/* Rendered document */}
        <div
          className="border border-border/40 rounded-xl p-6 sm:p-8 bg-background prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(viewingRecord.document) }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Análisis de Encuestas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sube un CSV y obtén un documento completo de Avatar del Comprador con datos reales.
        </p>
      </div>

      {/* ─── History section ──────────────────────────────────────────────── */}
      {!document && history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Análisis anteriores</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {history.map(record => (
              <button
                key={record.id}
                onClick={() => viewRecord(record)}
                className="group relative flex items-start gap-3 border border-border/50 rounded-xl p-4 text-left transition-all hover:shadow-md hover:border-violet-500/30 hover:bg-muted/20"
              >
                <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-violet-500/10 text-violet-400">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{record.file_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{record.total_rows} respuestas</span>
                    <span className="text-xs text-muted-foreground">&middot;</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={11} />
                      {relativeDate(record.created_at)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => deleteAnalysis(record.id, e)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {historyLoading && !history.length && (
        <div className="flex justify-center py-4">
          <span className="h-5 w-5 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
        </div>
      )}

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
              <Button variant="outline" size="sm" onClick={handleDownloadTxt}>
                <Download size={14} className="mr-1.5" />
                .txt
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadDocx}>
                <Download size={14} className="mr-1.5" />
                .doc
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
