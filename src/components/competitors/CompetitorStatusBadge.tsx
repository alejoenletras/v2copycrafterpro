import { Badge } from '@/components/ui/badge';
import { Check, X, Clock } from 'lucide-react';

interface CompetitorStatusBadgeProps {
  status: 'found' | 'not_found' | 'pending';
  handle?: string | null;
  platform: 'instagram' | 'tiktok';
}

export function CompetitorStatusBadge({ status, handle, platform }: CompetitorStatusBadgeProps) {
  if (status === 'found') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
        <Check className="w-3 h-3" />
        {handle ? `@${handle}` : platform === 'instagram' ? 'IG' : 'TikTok'}
      </Badge>
    );
  }

  if (status === 'not_found') {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 gap-1">
        <X className="w-3 h-3" />
        No encontrado
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1">
      <Clock className="w-3 h-3" />
      Pendiente
    </Badge>
  );
}
