import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { CorrectionType } from '@/types';

export function useCorrections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCorrection = useMutation({
    mutationFn: async (correction: {
      generated_script: Record<string, string>;
      corrected_script: Record<string, string>;
      original_ad_text?: string;
      correction_type?: CorrectionType;
      correction_notes?: string;
      dna_expert_id?: string;
      dna_audience_id?: string;
      dna_product_id?: string;
      quality_score_before?: number;
    }) => {
      const { data, error } = await supabase
        .from('script_corrections')
        .insert({
          user_id: 'default-user',
          ...correction,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections'] });
      toast({ title: 'Corrección guardada', description: 'La IA aprenderá de esta corrección.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    createCorrection: createCorrection.mutate,
    createCorrectionAsync: createCorrection.mutateAsync,
    isCreating: createCorrection.isPending,
  };
}
