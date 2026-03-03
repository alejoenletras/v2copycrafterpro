import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Link, Loader2, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadPanelProps {
  onUploadFile: (file: File) => void;
  onSubmitUrl: (url: string) => void;
  isLoading: boolean;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

function detectPlatform(url: string): string | null {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  return null;
}

export default function UploadPanel({ onUploadFile, onSubmitUrl, isLoading }: UploadPanelProps) {
  const [url, setUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileError('');
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Formato no soportado. Usa mp4, mov o webm.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('El archivo excede 100MB.');
      return;
    }
    onUploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUrlSubmit = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const platform = detectPlatform(trimmed);
    if (!platform) {
      setFileError('URL no soportada. Usa YouTube, TikTok o Instagram.');
      return;
    }
    setFileError('');
    onSubmitUrl(trimmed);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="font-semibold text-lg text-foreground mb-2">Video Inspiration</h2>
          <p className="text-sm text-muted-foreground">
            Sube un video que te haya inspirado y encontraremos ads similares para modelar a tu DNA.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
            dragOver
              ? 'border-amber-400 bg-amber-50'
              : 'border-border hover:border-amber-300 hover:bg-amber-50/30'
          )}
        >
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Arrastra un video aquí</p>
          <p className="text-xs text-muted-foreground mt-1">o haz clic para seleccionar (mp4, mov, webm — máx 100MB)</p>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {/* Separator */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">o</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* URL input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Link className="w-3 h-3" /> Pegar link del video
          </label>
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setFileError(''); }}
              placeholder="https://www.tiktok.com/..."
              className="text-sm flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            <Button
              onClick={handleUrlSubmit}
              disabled={!url.trim() || isLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
              size="sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analizar'}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Soportado: YouTube, TikTok, Instagram Reels</p>
        </div>

        {/* Error */}
        {fileError && (
          <p className="text-xs text-destructive text-center">{fileError}</p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-amber-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Procesando...
          </div>
        )}
      </div>
    </div>
  );
}
