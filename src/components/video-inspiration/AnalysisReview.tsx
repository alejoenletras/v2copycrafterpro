import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X, BookOpen } from 'lucide-react';
import type { VideoAnalysis } from '@/types';

interface AnalysisReviewProps {
  analysis: VideoAnalysis;
  onSearch: (keywords: string[]) => void;
  onSaveAsReference?: () => void;
  isSearching: boolean;
}

export default function AnalysisReview({
  analysis,
  onSearch,
  onSaveAsReference,
  isSearching,
}: AnalysisReviewProps) {
  const [keywords, setKeywords] = useState<string[]>(analysis.search_keywords || []);
  const [newKeyword, setNewKeyword] = useState('');

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
    }
    setNewKeyword('');
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="font-semibold text-lg text-foreground mb-1">Análisis Completo</h2>
        <p className="text-sm text-muted-foreground">{analysis.summary}</p>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Tipo</p>
          <p className="text-sm font-medium">{analysis.content_type}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Tono</p>
          <p className="text-sm font-medium">{analysis.tone}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Estructura</p>
          <p className="text-sm font-medium">{analysis.persuasion_structure}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Duración</p>
          <p className="text-sm font-medium">~{analysis.estimated_duration_seconds}s</p>
        </div>
      </div>

      {/* Hook & CTA */}
      <div className="space-y-3">
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 mb-1">Hook</p>
          <p className="text-sm">{analysis.hook_analysis}</p>
        </div>
        <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 mb-1">CTA</p>
          <p className="text-sm">{analysis.cta_analysis}</p>
        </div>
      </div>

      {/* Visual style */}
      {analysis.visual_style && analysis.visual_style !== 'no_disponible' && (
        <div className="p-3 rounded-lg border border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Estilo visual</p>
          <p className="text-sm">{analysis.visual_style}</p>
        </div>
      )}

      {/* Techniques */}
      {analysis.key_techniques && analysis.key_techniques.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Técnicas identificadas</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.key_techniques.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Audience */}
      {analysis.target_audience_profile && (
        <div className="p-3 rounded-lg border border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Audiencia target</p>
          <p className="text-sm">{analysis.target_audience_profile}</p>
        </div>
      )}

      {/* Keywords - editable */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Keywords de búsqueda</p>
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((kw) => (
            <Badge key={kw} variant="outline" className="text-xs gap-1 pr-1">
              {kw}
              <button onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Agregar keyword..."
            className="text-xs h-7 flex-1"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
          />
          <Button onClick={addKeyword} size="sm" variant="outline" className="h-7 px-2 text-xs">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          onClick={() => onSearch(keywords)}
          disabled={keywords.length === 0 || isSearching}
          className="bg-amber-600 hover:bg-amber-700 text-white gap-1 flex-1"
        >
          <Search className="w-4 h-4" />
          Buscar Ads Similares
        </Button>
        {onSaveAsReference && (
          <Button onClick={onSaveAsReference} variant="outline" size="sm" className="gap-1 text-xs">
            <BookOpen className="w-3 h-3" />
            Guardar como referencia
          </Button>
        )}
      </div>
    </div>
  );
}
