import { Badge } from '@/components/ui/badge';

interface PlatformBadgeProps {
  platform: 'instagram' | 'tiktok';
}

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  if (platform === 'instagram') {
    return (
      <Badge variant="outline" className="bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200">
        Instagram
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
      TikTok
    </Badge>
  );
}
