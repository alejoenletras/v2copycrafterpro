import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Link, Upload, FileText, Loader2, CheckCircle2, XCircle,
  Plus, X, Brain, Youtube, AlertCircle, Music, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { DNAType, DnaFieldStatus } from '@/types';

const BASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callEdge(name: string, body: unknown) {
  const res = await fetch(`${BASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });
  return res.json();
}

type UrlStatus = 'pending' | 'fetching' | 'ready' | 'error';
type FileStatus = 'pending' | 'reading' | 'ready' | 'error';

interface UrlEntry {
  id: string;
  url: string;
  status: UrlStatus;
  text?: string;
  error?: string;
}

interface FileEntry {
  id: string;
  name: string;
  status: FileStatus;
  text?: string;
  error?: string;
}

function detectUrlType(url: string): string {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com/i.test(url)) return 'reel';
  return 'other';
}

function UrlIcon({ type }: { type: string }) {
  if (type === 'youtube') return <Youtube className="w-3.5 h-3.5 text-red-500" />;
  if (type === 'tiktok') return <Music className="w-3.5 h-3.5 text-pink-500" />;
  return <Link className="w-3.5 h-3.5 text-blue-500" />;
}

interface DnaAutoModePanelProps {
  dnaType: DNAType;
  dnaName: string;
  onComplete: (fields: Record<string, string>, statuses: Record<string, DnaFieldStatus>, suggestedName?: string) => void;
}

export default function DnaAutoModePanel({ dnaType, dnaName, onComplete }: DnaAutoModePanelProps) {
  const { toast } = useToast();
  const [urlInput, setUrlInput] = useState('');
  const [urls, setUrls] = useState<UrlEntry[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (urls.some(u => u.url === trimmed)) {
      setUrlInput('');
      return;
    }
    setUrls(prev => [...prev, { id: crypto.randomUUID(), url: trimmed, status: 'pending' }]);
    setUrlInput('');
  };

  const removeUrl = (id: string) => setUrls(prev => prev.filter(u => u.id !== id));
  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  const readFile = useCallback((file: File): Promise<{ text: string; error?: string }> => {
    return new Promise((resolve) => {
      if (!file.name.match(/\.(txt|md|csv)$/i)) {
        resolve({ text: '', error: 'Solo se soportan archivos .txt, .md y .csv' });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => resolve({ text: String(e.target?.result ?? '') });
      reader.onerror = () => resolve({ text: '', error: 'Error al leer el archivo' });
      reader.readAsText(file, 'utf-8');
    });
  }, []);

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles: FileEntry[] = Array.from(fileList).map(f => ({
      id: crypto.randomUUID(), name: f.name, status: 'reading',
    }));
    setFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < fileList.length; i++) {
      const result = await readFile(fileList[i]);
      setFiles(prev => prev.map(f =>
        f.id === newFiles[i].id
          ? { ...f, status: result.error ? 'error' : 'ready', text: result.text, error: result.error }
          : f
      ));
    }
  }, [readFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const hasContent = urls.length > 0 || files.some(f => f.status === 'ready') || pastedText.trim().length > 0;

  const handleAnalyze = async () => {
    if (!hasContent) return;
    setIsAnalyzing(true);

    const contentTexts: string[] = [];

    // Step 1: Fetch URL transcripts
    if (urls.length > 0) {
      setAnalyzeStep(`Obteniendo transcripciones (0/${urls.length})...`);
      for (let i = 0; i < urls.length; i++) {
        const entry = urls[i];
        setUrls(prev => prev.map(u => u.id === entry.id ? { ...u, status: 'fetching' } : u));
        setAnalyzeStep(`Obteniendo transcripción ${i + 1}/${urls.length}...`);

        try {
          const urlType = detectUrlType(entry.url);
          const result = await callEdge('fetch-transcript', { url: entry.url, type: urlType });

          if (result.success && result.transcript) {
            setUrls(prev => prev.map(u =>
              u.id === entry.id ? { ...u, status: 'ready', text: result.transcript } : u
            ));
            contentTexts.push(`[Transcripción de ${entry.url}]\n${result.transcript}`);
          } else {
            setUrls(prev => prev.map(u =>
              u.id === entry.id ? { ...u, status: 'error', error: result.error ?? 'No se pudo obtener la transcripción' } : u
            ));
          }
        } catch (err: any) {
          setUrls(prev => prev.map(u =>
            u.id === entry.id ? { ...u, status: 'error', error: err.message } : u
          ));
        }
      }
    }

    // Step 2: Collect file texts
    for (const file of files) {
      if (file.status === 'ready' && file.text) {
        contentTexts.push(`[Archivo: ${file.name}]\n${file.text}`);
      }
    }

    // Step 3: Add pasted text
    if (pastedText.trim()) {
      contentTexts.push(`[Texto pegado]\n${pastedText.trim()}`);
    }

    if (contentTexts.length === 0) {
      toast({
        title: 'Sin contenido disponible',
        description: 'No se pudo obtener texto de ninguna fuente. Verifica las URLs o agrega texto manualmente.',
        variant: 'destructive',
      });
      setIsAnalyzing(false);
      setAnalyzeStep('');
      return;
    }

    // Step 4: Analyze with Claude
    setAnalyzeStep('Analizando contenido con IA...');
    try {
      const result = await callEdge('analyze-content-to-dna', {
        dna_type: dnaType,
        content_texts: contentTexts,
        dna_name_hint: dnaName || undefined,
      });

      if (result.success && result.data) {
        const { suggested_name, ...fields } = result.data;
        // Build status map — all fields are ai_suggested
        const statuses: Record<string, DnaFieldStatus> = {};
        for (const key of Object.keys(fields)) {
          statuses[key] = 'ai_suggested';
        }
        onComplete(fields, statuses, suggested_name);
        toast({ title: 'DNA creado', description: 'Revisa los campos generados y edítalos para validarlos.' });
      } else {
        throw new Error(result.error ?? 'Error al analizar contenido');
      }
    } catch (err: any) {
      toast({ title: 'Error al analizar', description: err.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
      setAnalyzeStep('');
    }
  };

  return (
    <div className="space-y-5">
      {/* Explanation */}
      <div className="text-sm text-muted-foreground bg-violet-50 border border-violet-100 rounded-lg px-4 py-3">
        <p className="font-medium text-violet-700 mb-1">¿Cómo funciona?</p>
        <p>Agrega URLs de YouTube, TikTok o Reels, sube documentos de texto, o pega cualquier contenido. La IA analiza todo y crea los 4 campos del DNA automáticamente.</p>
      </div>

      {/* URL input */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Link className="w-3.5 h-3.5 text-violet-500" />
          URLs de contenido
          <span className="text-muted-foreground font-normal text-xs">(YouTube, TikTok, Reels, Instagram)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 h-9 px-3 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Button type="button" variant="outline" size="sm" onClick={addUrl} disabled={!urlInput.trim()}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
          </Button>
        </div>

        {urls.length > 0 && (
          <div className="space-y-1.5">
            {urls.map((entry) => {
              const type = detectUrlType(entry.url);
              return (
                <div key={entry.id} className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md border text-sm',
                  entry.status === 'ready' && 'border-emerald-200 bg-emerald-50/50',
                  entry.status === 'error' && 'border-red-200 bg-red-50/50',
                  entry.status === 'fetching' && 'border-violet-200 bg-violet-50/50',
                  entry.status === 'pending' && 'border-border bg-muted/20',
                )}>
                  <UrlIcon type={type} />
                  <span className="flex-1 truncate text-xs">{entry.url}</span>
                  {entry.status === 'pending' && <Badge variant="outline" className="text-xs h-4 px-1">Pendiente</Badge>}
                  {entry.status === 'fetching' && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500 shrink-0" />}
                  {entry.status === 'ready' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  {entry.status === 'error' && (
                    <span className="text-xs text-red-500 truncate max-w-24" title={entry.error}>
                      <XCircle className="w-3.5 h-3.5 inline mr-0.5" />{entry.error}
                    </span>
                  )}
                  <button onClick={() => removeUrl(entry.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* File upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          Documentos de texto
          <span className="text-muted-foreground font-normal text-xs">(.txt, .md, .csv)</span>
        </label>
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
            isDragging ? 'border-violet-400 bg-violet-50' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">
            Arrastra archivos aquí o <span className="text-violet-600 font-medium">haz clic para subir</span>
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Para PDFs y Word: copia el texto y pégalo abajo</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-1.5">
            {files.map((file) => (
              <div key={file.id} className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md border text-sm',
                file.status === 'ready' && 'border-emerald-200 bg-emerald-50/50',
                file.status === 'error' && 'border-red-200 bg-red-50/50',
                (file.status === 'reading' || file.status === 'pending') && 'border-border bg-muted/20',
              )}>
                <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="flex-1 truncate text-xs">{file.name}</span>
                {file.status === 'reading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500 shrink-0" />}
                {file.status === 'ready' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                {file.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" title={file.error} />}
                <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paste text */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowPasteArea((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium hover:text-violet-600 transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-emerald-500" />
          Pegar texto directamente
          {showPasteArea ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {pastedText.trim() && <Badge variant="outline" className="text-xs h-4 px-1 border-emerald-300 text-emerald-700">Listo</Badge>}
        </button>
        {showPasteArea && (
          <Textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Pega aquí transcripciones, bios, emails de venta, guiones, presentaciones, o cualquier texto del que quieras extraer el DNA...

Tip: Para PDFs y Word, abre el archivo, selecciona todo (Ctrl+A) y pega aquí."
            rows={6}
            className="resize-none text-sm"
          />
        )}
      </div>

      {/* Warning if no ready content */}
      {!hasContent && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Agrega al menos una URL, archivo o texto pegado para continuar.</span>
        </div>
      )}

      {/* Analyze button */}
      <Button
        onClick={handleAnalyze}
        disabled={!hasContent || isAnalyzing}
        className="w-full h-11 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold gap-2"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {analyzeStep || 'Procesando...'}
          </>
        ) : (
          <>
            <Brain className="w-4 h-4" />
            Analizar y crear DNA con IA
          </>
        )}
      </Button>

      {isAnalyzing && (
        <p className="text-xs text-center text-muted-foreground">
          Esto puede tomar 15-30 segundos. No cierres esta ventana.
        </p>
      )}
    </div>
  );
}
