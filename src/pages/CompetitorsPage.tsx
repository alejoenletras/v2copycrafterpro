import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetitors } from '@/hooks/useCompetitors';
import { useOrganicPosts } from '@/hooks/useOrganicPosts';
import { CompetitorTable } from '@/components/competitors/CompetitorTable';
import { CompetitorFilters } from '@/components/competitors/CompetitorFilters';
import { OrganicPostsTable } from '@/components/organic-posts/OrganicPostsTable';
import { OrganicPostFilters } from '@/components/organic-posts/OrganicPostFilters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Users, Loader2, RefreshCw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

function PostsTab() {
  const { competitors } = useCompetitors();
  const { posts, isLoading, triggerScraping, isTriggering } = useOrganicPosts();
  const [platform, setPlatform] = useState('all');
  const [postType, setPostType] = useState('all');
  const [competitorId, setCompetitorId] = useState('all');
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{filtered.length} posts</Badge>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={triggerScraping} disabled={isTriggering}>
          {isTriggering ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Iniciando...</> : <><Download className="w-3.5 h-3.5" /> Scrapear posts</>}
        </Button>
      </div>
      <OrganicPostFilters
        platform={platform} onPlatformChange={setPlatform}
        postType={postType} onPostTypeChange={setPostType}
        competitorId={competitorId} onCompetitorChange={setCompetitorId}
        competitors={competitors || []}
        minViews={minViews} onMinViewsChange={setMinViews}
      />
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <OrganicPostsTable posts={filtered} />
      )}
    </div>
  );
}

export default function CompetitorsPage() {
  const navigate = useNavigate();
  const { competitors, isLoading, forceReEnrich, isReEnriching, triggerEnrichment, isTriggering } = useCompetitors();

  const [search, setSearch] = useState('');
  const [igStatus, setIgStatus] = useState('all');
  const [tiktokStatus, setTiktokStatus] = useState('all');
  const [keyword, setKeyword] = useState('all');
  const [activeTab, setActiveTab] = useState<'perfiles' | 'posts'>('perfiles');

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
          {!isLoading && activeTab === 'perfiles' && (
            <Badge variant="secondary" className="ml-2">{filtered.length} competidores</Badge>
          )}
          {activeTab === 'perfiles' && (
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
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border pb-0">
            <button
              onClick={() => setActiveTab('perfiles')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'perfiles'
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Perfiles
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'posts'
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Posts orgánicos
            </button>
          </div>

          {activeTab === 'posts' ? (
            <PostsTab />
          ) : (
            <>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
