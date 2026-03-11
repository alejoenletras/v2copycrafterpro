import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { DnaReferenteRule } from '@/types';

export function useDnaReferenteRules(personalityDnaId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['dna-referente-rules', personalityDnaId],
    queryFn: async () => {
      let q = supabase
        .from('dna_referente_rules')
        .select('*, referentes(*)')
        .order('priority', { ascending: false });
      if (personalityDnaId) {
        q = q.eq('personality_dna_id', personalityDnaId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as DnaReferenteRule[];
    },
    enabled: true,
  });

  const createRule = useMutation({
    mutationFn: async (input: {
      personality_dna_id: string;
      referente_id: string;
      what_to_model: string;
      what_to_filter: string;
      priority?: number;
      audience_dna_id?: string;
      product_dna_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('dna_referente_rules')
        .insert({ priority: 5, ...input })
        .select('*, referentes(*)')
        .single();
      if (error) throw error;
      return data as DnaReferenteRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dna-referente-rules'] });
      toast({ title: 'Referente asignado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DnaReferenteRule> }) => {
      const { data, error } = await supabase
        .from('dna_referente_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, referentes(*)')
        .single();
      if (error) throw error;
      return data as DnaReferenteRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dna-referente-rules'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dna_referente_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dna-referente-rules'] });
      toast({ title: 'Referente desasignado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    rules,
    isLoading,
    createRule: createRule.mutateAsync,
    isCreating: createRule.isPending,
    updateRule: updateRule.mutateAsync,
    isUpdating: updateRule.isPending,
    deleteRule: deleteRule.mutate,
    isDeleting: deleteRule.isPending,
  };
}
