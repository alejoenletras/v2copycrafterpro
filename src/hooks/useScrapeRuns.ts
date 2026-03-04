import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ScrapeRun } from '@/types';

export function useScrapeRuns() {
  const { data: runs, isLoading, error } = useQuery({
    queryKey: ['scrape-runs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('scrape_runs')
        .select('*, competitor:competitor_profiles(fb_page_name)')
        .order('started_at', { ascending: false });
      if (error) throw error;
      return (data as any[]).map((row) => ({
        ...row,
        competitor_name: row.competitor?.fb_page_name || null,
        competitor: undefined,
      })) as ScrapeRun[];
    },
  });

  return { runs, isLoading, error };
}
