import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { OrganicPost } from '@/types';

export function useOrganicPosts(competitorId?: string) {
  const { data: posts, isLoading, error } = useQuery({
    queryKey: competitorId ? ['organic-posts', competitorId] : ['organic-posts'],
    queryFn: async () => {
      let query = (supabase as any)
        .from('organic_posts')
        .select('*, competitor:competitor_profiles(fb_page_name)')
        .order('views', { ascending: false });

      if (competitorId) {
        query = query.eq('competitor_id', competitorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]).map((row) => ({
        ...row,
        competitor_name: row.competitor?.fb_page_name || null,
        competitor: undefined,
      })) as OrganicPost[];
    },
  });

  return { posts, isLoading, error };
}
