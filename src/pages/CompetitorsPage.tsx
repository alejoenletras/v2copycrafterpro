import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetitors } from '@/hooks/useCompetitors';
import { CompetitorTable } from '@/components/competitors/CompetitorTable';
import { CompetitorFilters } from '@/components/competitors/CompetitorFilters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Users, Loader2, RefreshCw } from 'lucide-react';

export default function CompetitorsPage() {
  const navigate = useNavigate();
  const { competitors, isLoading, forceReEnrich, isReEnriching, triggerEnrichment, isTriggering } = useCompetitors();

  const [search, setSearch] = useState('');
  const [igStatus, setIgStatus] = useState('all');
  const [tiktokStatus, setTiktokStatus] = useState('all');
  const [keyword, setKeyword] = useState('all');

  const keywords = useMemo(() => {
    const set = new Set<string>();
    (competitors || []).forEach((c) => { if (c.source_keyword) set.add(c.source_keyword); });
    return Array.from(set).sort();
  }, [competitors]);

  const filtered = useMemo(() => {
    return (competitors || []).filter((c) => {
      if (search && !c.fb_page_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (igStatus !== 'all' && c.ig_status !== igStatus) return false;
      if (tiktokStatus !== 'all' && c.tiktok_status !== tiktokStatus) return false;
      if (keyword !== 'all' && c.source_keyword !== keyword) return false;
      return true;
    });
  }, [competitors, search, igStatus, tiktokStatus, keyword]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <Home className="w-4 h-4" />
          </button>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" />
            <span className="font-semibold text-sm">Competidores</span>
          </div>
          {!isLoading && (
            <Badge variant="secondary" className="ml-2">{filtered.length} competidores</Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            className="ml-auto gap-1.5 text-xs"
            onClick={triggerEnrichment}
            disabled={isTriggering}
          >
            {isTriggering ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Iniciando...</>
            ) : (
              <><RefreshCw className="w-3.5 h-3.5" /> Enriquecer perfiles</>
            )}
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
          <CompetitorFilters
            search={search} onSearchChange={setSearch}
            igStatus={igStatus} onIgStatusChange={setIgStatus}
            tiktokStatus={tiktokStatus} onTiktokStatusChange={setTiktokStatus}
            keywords={keywords} keyword={keyword} onKeywordChange={setKeyword}
          />

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CompetitorTable
              competitors={filtered}
              onReEnrich={forceReEnrich}
              isReEnriching={isReEnriching}
            />
          )}
        </div>
      </main>
    </div>
  );
}
