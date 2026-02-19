import { useEffect } from 'react';
import { useContentGeneratorStore } from '@/store/contentGeneratorStore';
import { ContentStructure, ContentType } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Tv, Megaphone, Youtube, Mail, MonitorPlay, ArrowRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_META: Record<ContentType, { label: string; icon: React.ReactNode; color: string }> = {
  'vsl':         { label: 'VSL',              icon: <Tv className="w-4 h-4" />,         color: 'bg-violet-500/10 text-violet-600 border-violet-200' },
  'webinar':     { label: 'Webinar',          icon: <MonitorPlay className="w-4 h-4" />, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  'facebook-ad': { label: 'Anuncio Meta',     icon: <Megaphone className="w-4 h-4" />,  color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' },
  'youtube-ad':  { label: 'Anuncio YouTube',  icon: <Youtube className="w-4 h-4" />,    color: 'bg-red-500/10 text-red-600 border-red-200' },
  'email':       { label: 'Email',            icon: <Mail className="w-4 h-4" />,       color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
};

const TYPE_ORDER: ContentType[] = ['vsl', 'webinar', 'facebook-ad', 'youtube-ad', 'email'];

export default function StructureSelectionScreen() {
  const {
    structures, selectedStructure, isLoadingStructures, error,
    loadStructures, selectStructure, startSession,
  } = useContentGeneratorStore();

  useEffect(() => {
    if (structures.length === 0) loadStructures();
  }, []);

  const byType = TYPE_ORDER.reduce<Record<string, ContentStructure[]>>((acc, t) => {
    const items = structures.filter((s) => s.type === t);
    if (items.length > 0) acc[t] = items;
    return acc;
  }, {});

  const handleContinue = async () => {
    await startSession();
  };

  if (isLoadingStructures) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          ¿Qué quieres crear hoy?
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Elige la estructura que mejor se adapte a tu objetivo. La IA generará cada bloque con precisión basándose en tu información.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
          {error}
          <Button variant="ghost" size="sm" onClick={loadStructures} className="ml-auto">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reintentar
          </Button>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(byType).map(([type, items]) => {
          const meta = TYPE_META[type as ContentType];
          return (
            <div key={type}>
              <div className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-4', meta.color)}>
                {meta.icon}
                {meta.label}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((structure) => {
                  const isSelected = selectedStructure?.id === structure.id;
                  return (
                    <Card
                      key={structure.id}
                      onClick={() => selectStructure(structure)}
                      className={cn(
                        'p-5 cursor-pointer transition-all hover:shadow-md',
                        isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/40'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground mb-1">{structure.name}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {structure.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            <Badge variant="secondary" className="text-xs">
                              {structure.blocks.length} bloques
                            </Badge>
                            {structure.targetAudiences.slice(0, 2).map((a) => (
                              <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 transition-colors',
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        )} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedStructure && (
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleContinue}
            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-8 h-12 text-base"
          >
            Continuar con "{selectedStructure.name}"
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
