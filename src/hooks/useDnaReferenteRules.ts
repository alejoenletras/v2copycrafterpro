import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUserId } from '@/hooks/useUserId';
import type { DnaReferenteRule } from '@/types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export function useDnaReferenteRules(personalityDnaId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = useUserId();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['dna-referente-rules', personalityDnaId, userId],
    enabled: !!userId,
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
  });

  // Generate rules via AI (calls generate-referente-rules edge function)
  const generateRules = useMutation({
    mutationFn: async (input: {
      personality_dna_id: string;
      referente_id: string;
      audience_dna_id?: string;
      product_dna_id?: string;
    }) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-referente-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Error al generar reglas');
      return data.rule as DnaReferenteRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dna-referente-rules'] });
      toast({ title: 'Referente asignado', description: 'Reglas de modelado generadas por IA.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error al generar reglas', description: error.message, variant: 'destructive' });
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
      toast({ title: 'Regla actualizada' });
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

  const regenerateRules = useMutation({
    mutationFn: async (rule: DnaReferenteRule) => {
      if (!rule.personality_dna_id) throw new Error('personality_dna_id requerido');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-referente-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify({
          personality_dna_id: rule.personality_dna_id,
          referente_id: rule.referente_id,
          audience_dna_id: rule.audience_dna_id,
          product_dna_id: rule.product_dna_id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Error al regenerar');
      return data.rule as DnaReferenteRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dna-referente-rules'] });
      toast({ title: 'Reglas regeneradas por IA' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    rules,
    isLoading,
    generateRules: generateRules.mutateAsync,
    isGenerating: generateRules.isPending,
    updateRule: updateRule.mutateAsync,
    isUpdating: updateRule.isPending,
    deleteRule: deleteRule.mutate,
    isDeleting: deleteRule.isPending,
    regenerateRules: regenerateRules.mutate,
    isRegenerating: regenerateRules.isPending,
  };
}
