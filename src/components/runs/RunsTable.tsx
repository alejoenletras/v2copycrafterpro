import { RunStatusBadge } from './RunStatusBadge';
import { Badge } from '@/components/ui/badge';
import type { ScrapeRun } from '@/types';

interface RunsTableProps {
  runs: ScrapeRun[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('es', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const sourceLabels: Record<string, { label: string; className: string }> = {
  facebook_ads: { label: 'Facebook Ads', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  instagram: { label: 'Instagram', className: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  tiktok: { label: 'TikTok', className: 'bg-pink-50 text-pink-700 border-pink-200' },
};

export function RunsTable({ runs }: RunsTableProps) {
  if (runs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay ejecuciones registradas. Los datos se poblarán desde los workflows de N8N.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium">Fecha</th>
              <th className="text-left px-4 py-3 font-medium">Fuente</th>
              <th className="text-left px-4 py-3 font-medium">Keyword / Competidor</th>
              <th className="text-right px-4 py-3 font-medium">Scrapeados</th>
              <th className="text-right px-4 py-3 font-medium">Filtrados</th>
              <th className="text-right px-4 py-3 font-medium">Analizados</th>
              <th className="text-right px-4 py-3 font-medium">Errores</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
              <th className="text-right px-4 py-3 font-medium">Costo</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const src = sourceLabels[r.source] || { label: r.source, className: '' };
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.started_at)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={src.className}>{src.label}</Badge>
                  </td>
                  <td className="px-4 py-3">{r.keyword || r.competitor_name || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.total_scraped}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.total_filtered}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.total_analyzed}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {r.total_errors > 0 ? (
                      <span className="text-red-600">{r.total_errors}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><RunStatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {r.apify_cost_usd != null ? `$${Number(r.apify_cost_usd).toFixed(4)}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
