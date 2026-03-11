import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { GenerationRun } from '@/types';

export function useGenerationRuns(personalityDnaId?: string) {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['generation-runs', personalityDnaId],
    queryFn: async () => {
      let q = supabase
        .from('generation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      if (personalityDnaId) q = q.eq('personality_dna_id', personalityDnaId);
      const { data, error } = await q;
      if (error) throw error;
      return data as GenerationRun[];
    },
    refetchInterval: (query) => {
      const hasRunning = query.state.data?.some((r: GenerationRun) => r.status === 'running');
      return hasRunning ? 5000 : false;
    },
  });

  return { runs, isLoading };
}
