import { useMutation } from '@tanstack/react-query';
import { SUPABASE_KEY } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const BASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

export function useTrainingPatterns() {
  const { toast } = useToast();

  const condensePatterns = useMutation({
    mutationFn: async (params: { dna_expert_id?: string }) => {
      const res = await fetch(`${BASE_URL}/functions/v1/condense-training-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          user_id: 'default-user',
          dna_expert_id: params.dna_expert_id || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      return res.json();
    },
    onSuccess: (data) => {
      if (data.patterns_created === 0 && data.patterns_updated === 0) {
        toast({
          description: data.summary || 'No hay suficientes correcciones para extraer patrones (mínimo 3)',
        });
      } else {
        toast({
          title: 'Patrones actualizados',
          description: `${data.patterns_created} nuevos, ${data.patterns_updated} actualizados`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    condensePatterns: condensePatterns.mutate,
    isCondensing: condensePatterns.isPending,
  };
}
