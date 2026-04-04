import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/hooks/useUserId';
import type { ReferenteContent } from '@/types';

interface UseReferenteContentOptions {
  referenteId?: string;
  platform?: string;
  contentType?: string;
  minQuality?: number;
  isUsed?: boolean;
}

export function useReferenteContent(options: UseReferenteContentOptions = {}) {
  const { referenteId, platform, contentType, minQuality, isUsed } = options;
  const userId = useUserId();

  const { data: content = [], isLoading, error } = useQuery({
    queryKey: ['referente-content', options, userId],
    enabled: !!userId,
    queryFn: async () => {
      let q = supabase
        .from('referente_content')
        .select('*, referentes(name)')
        .order('quality_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (referenteId) q = q.eq('referente_id', referenteId);
      if (platform) q = q.eq('platform', platform);
      if (contentType) q = q.eq('content_type', contentType);
      if (minQuality !== undefined) q = q.gte('quality_score', minQuality);
      if (isUsed !== undefined) q = q.eq('is_used', isUsed);

      const { data, error } = await q;
      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        referente_name: item.referentes?.name ?? null,
      })) as ReferenteContent[];
    },
  });

  return { content, isLoading, error };
}
