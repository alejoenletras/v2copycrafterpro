import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { CompetitorProfile } from '@/types';

export function useCompetitors() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: competitors, isLoading, error } = useQuery({
    queryKey: ['competitors'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('competitor_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CompetitorProfile[];
    },
  });

  const forceReEnrich = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('competitor_profiles')
        .update({
          ig_status: 'pending',
          tiktok_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      toast({ title: 'Re-enriquecimiento programado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    competitors,
    isLoading,
    error,
    forceReEnrich: forceReEnrich.mutate,
    isReEnriching: forceReEnrich.isPending,
  };
}
