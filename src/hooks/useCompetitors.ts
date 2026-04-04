import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_KEY } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUserId } from '@/hooks/useUserId';
import type { CompetitorProfile } from '@/types';

const BASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

export function useCompetitors() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = useUserId();
  const [isTriggering, setIsTriggering] = useState(false);

  const { data: competitors, isLoading, error } = useQuery({
    queryKey: ['competitors', userId],
    enabled: !!userId,
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

  const triggerEnrichment = async () => {
    setIsTriggering(true);
    try {
      const res = await fetch(`${BASE_URL}/functions/v1/trigger-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ workflow: 'enrichment' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to trigger enrichment');
      }
      toast({ description: 'Enriquecimiento iniciado. El agente buscara perfiles IG/TikTok...' });
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message });
    } finally {
      setIsTriggering(false);
    }
  };

  return {
    competitors,
    isLoading,
    error,
    forceReEnrich: forceReEnrich.mutate,
    isReEnriching: forceReEnrich.isPending,
    triggerEnrichment,
    isTriggering,
  };
}
