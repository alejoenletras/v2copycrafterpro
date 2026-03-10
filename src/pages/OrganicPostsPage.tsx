import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrganicPosts } from '@/hooks/useOrganicPosts';
import { useCompetitors } from '@/hooks/useCompetitors';
import { OrganicPostsTable } from '@/components/organic-posts/OrganicPostsTable';
import { OrganicPostFilters } from '@/components/organic-posts/OrganicPostFilters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, FileText, Loader2, Download } from 'lucide-react';

export default function OrganicPostsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preFilterCompetitor = searchParams.get('competitor') || 'all';

  const { competitors } = useCompetitors();
  const { posts, isLoading, triggerScraping, isTriggering } = useOrganicPosts(preFilterCompetitor !== 'all' ? preFilterCompetitor : undefined);

  const [platform, setPlatform] = useState('all');
  const [postType, setPostType] = useState('all');
  const [competitorId, setCompetitorId] = useState(preFilterCompetitor);
  const [minViews, setMinViews] = useState('');

  const filtered = useMemo(() => {
    return (posts || []).filter((p) => {
      if (platform !== 'all' && p.platform !== platform) return false;
      if (postType !== 'all' && p.post_type !== postType) return false;
      if (competitorId !== 'all' && p.competitor_id !== competitorId) return false;
      if (minViews && p.views < Number(minViews)) return false;
      return true;
    });
  }, [posts, platform, postType, competitorId, minViews]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <Home className="w-4 h-4" />
          </button>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-fuchsia-500" />
            <span className="font-semibold text-sm">Posts Orgánicos</span>
          </div>
          {!isLoading && (
            <Badge variant="secondary" className="ml-2">{filtered.length} posts</Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            className="ml-auto gap-1.5 text-xs"
            onClick={triggerScraping}
            disabled={isTriggering}
          >
            {isTriggering ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Iniciando...</>
            ) : (
              <><Download className="w-3.5 h-3.5" /> Scrapear posts</>
            )}
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
          <OrganicPostFilters
            platform={platform} onPlatformChange={setPlatform}
            postType={postType} onPostTypeChange={setPostType}
            competitorId={competitorId} onCompetitorChange={setCompetitorId}
            competitors={competitors || []}
            minViews={minViews} onMinViewsChange={setMinViews}
          />

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <OrganicPostsTable posts={filtered} />
          )}
        </div>
      </main>
    </div>
  );
}
