import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrapeRuns } from '@/hooks/useScrapeRuns';
import { RunsTable } from '@/components/runs/RunsTable';
import { Badge } from '@/components/ui/badge';
import { Home, Activity, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function RunsPage() {
  const navigate = useNavigate();
  const { runs, isLoading } = useScrapeRuns();

  const stats = useMemo(() => {
    const all = runs || [];
    const completed = all.filter((r) => r.status === 'completed').length;
    const failed = all.filter((r) => r.status === 'failed').length;
    const lastCompleted = all.find((r) => r.status === 'completed');
    return { total: all.length, completed, failed, lastCompleted };
  }, [runs]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <Home className="w-4 h-4" />
          </button>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-sm">Ejecuciones</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
          {!isLoading && (runs || []).length > 0 && (
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                Total: {stats.total}
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3.5 h-3.5" />
                Completados: {stats.completed}
              </Badge>
              {stats.failed > 0 && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Fallidos: {stats.failed}
                </Badge>
              )}
              {stats.lastCompleted && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                  Ultimo: {new Date(stats.lastCompleted.started_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                </Badge>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RunsTable runs={runs || []} />
          )}
        </div>
      </main>
    </div>
  );
}
