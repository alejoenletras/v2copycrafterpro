import { PlatformBadge } from './PlatformBadge';
import { ExpandableCell } from './ExpandableCell';
import { Badge } from '@/components/ui/badge';
import { Video, Image, Layers, FileText } from 'lucide-react';
import type { OrganicPost } from '@/types';

interface OrganicPostsTableProps {
  posts: OrganicPost[];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

const typeIcons: Record<string, React.ReactNode> = {
  video: <Video className="w-3.5 h-3.5" />,
  image: <Image className="w-3.5 h-3.5" />,
  carousel: <Layers className="w-3.5 h-3.5" />,
  text: <FileText className="w-3.5 h-3.5" />,
};

export function OrganicPostsTable({ posts }: OrganicPostsTableProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay posts orgánicos. Los datos se poblarán desde el workflow de N8N.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium">Competidor</th>
              <th className="text-left px-4 py-3 font-medium">Plataforma</th>
              <th className="text-left px-4 py-3 font-medium">Tipo</th>
              <th className="text-right px-4 py-3 font-medium">Views</th>
              <th className="text-right px-4 py-3 font-medium">Likes</th>
              <th className="text-left px-4 py-3 font-medium min-w-[200px]">Caption</th>
              <th className="text-left px-4 py-3 font-medium min-w-[200px]">Análisis</th>
              <th className="text-left px-4 py-3 font-medium min-w-[200px]">Copy Reescrito</th>
              <th className="text-left px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 align-top">
                <td className="px-4 py-3 font-medium">{p.competitor_name || '—'}</td>
                <td className="px-4 py-3"><PlatformBadge platform={p.platform} /></td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="gap-1">
                    {typeIcons[p.post_type]}
                    {p.post_type}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatNumber(p.views)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatNumber(p.likes)}</td>
                <td className="px-4 py-3"><ExpandableCell text={p.caption} /></td>
                <td className="px-4 py-3"><ExpandableCell text={p.content_analysis} /></td>
                <td className="px-4 py-3"><ExpandableCell text={p.rewritten_copy} copyable /></td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(p.posted_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
