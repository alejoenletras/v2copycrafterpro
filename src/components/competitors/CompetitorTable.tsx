import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CompetitorStatusBadge } from './CompetitorStatusBadge';
import { RefreshCw, Eye, ExternalLink } from 'lucide-react';
import type { CompetitorProfile } from '@/types';

interface CompetitorTableProps {
  competitors: CompetitorProfile[];
  onReEnrich: (id: string) => void;
  isReEnriching: boolean;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function CompetitorTable({ competitors, onReEnrich, isReEnriching }: CompetitorTableProps) {
  const navigate = useNavigate();

  if (competitors.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay competidores registrados. Los datos se poblarán desde el workflow de N8N.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium">Nombre</th>
              <th className="text-left px-4 py-3 font-medium">Keyword</th>
              <th className="text-left px-4 py-3 font-medium">Instagram</th>
              <th className="text-left px-4 py-3 font-medium">TikTok</th>
              <th className="text-left px-4 py-3 font-medium">Ultimo scrape</th>
              <th className="text-right px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{c.fb_page_name}</span>
                    {c.fb_page_url && (
                      <a href={c.fb_page_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.source_keyword || '—'}</td>
                <td className="px-4 py-3">
                  <CompetitorStatusBadge status={c.ig_status} handle={c.ig_handle} platform="instagram" />
                </td>
                <td className="px-4 py-3">
                  <CompetitorStatusBadge status={c.tiktok_status} handle={c.tiktok_handle} platform="tiktok" />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(c.last_scraped_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReEnrich(c.id)}
                      disabled={isReEnriching}
                      title="Re-enriquecer"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/organic-posts?competitor=${c.id}`)}
                      title="Ver posts"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
