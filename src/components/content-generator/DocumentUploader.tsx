import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentUploaderProps {
  onExtract: (text: string) => void;
  isExtracting: boolean;
}

export default function DocumentUploader({ onExtract, isExtracting }: DocumentUploaderProps) {
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setPastedText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleExtract = () => {
    const text = pastedText.trim();
    if (text) onExtract(text);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/40',
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <Upload className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {fileName
            ? <span className="flex items-center justify-center gap-1.5 text-foreground"><FileText className="w-3.5 h-3.5" />{fileName}</span>
            : 'Arrastra un .txt o haz clic para seleccionar'
          }
        </p>
      </div>

      {/* Or paste text */}
      <Textarea
        placeholder="...o pega aquí el texto de tu página de ventas, PDF copiado, descripción de la oferta, historia del experto, testimonios, etc."
        value={pastedText}
        onChange={(e) => setPastedText(e.target.value)}
        rows={6}
        className="resize-none text-sm"
      />

      <Button
        onClick={handleExtract}
        disabled={!pastedText.trim() || isExtracting}
        variant="outline"
        className="w-full border-violet-300 text-violet-700 hover:bg-violet-50"
      >
        {isExtracting ? (
          <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Extrayendo información con IA...</>
        ) : (
          <><Sparkles className="mr-2 w-4 h-4" /> Extraer información automáticamente</>
        )}
      </Button>
    </div>
  );
}
