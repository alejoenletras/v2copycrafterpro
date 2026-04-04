import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUserId } from '@/hooks/useUserId';
import type { Referente } from '@/types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export function useReferentes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = useUserId();

  const { data: referentes = [], isLoading, error } = useQuery({
    queryKey: ['referentes', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referentes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Referente[];
    },
  });

  const createReferente = useMutation({
    mutationFn: async (input: Partial<Referente> & { name: string }) => {
      const ig_status = input.ig_handle ? 'manual' : 'pending';
      const tiktok_status = input.tiktok_handle ? 'manual' : 'pending';
      const { data, error } = await supabase
        .from('referentes')
        .insert({ ...input, ig_status, tiktok_status })
        .select()
        .single();
      if (error) throw error;
      return data as Referente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referentes'] });
      toast({ title: 'Referente creado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateReferente = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Referente> }) => {
      if (updates.ig_handle !== undefined) {
        updates.ig_status = updates.ig_handle ? 'manual' : 'pending';
      }
      if (updates.tiktok_handle !== undefined) {
        updates.tiktok_status = updates.tiktok_handle ? 'manual' : 'pending';
      }
      const { data, error } = await supabase
        .from('referentes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Referente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referentes'] });
      toast({ title: 'Referente actualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteReferente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('referentes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referentes'] });
      queryClient.invalidateQueries({ queryKey: ['dna-referente-rules'] });
      toast({ title: 'Referente eliminado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const scrapeReferente = useMutation({
    mutationFn: async (referenteId: string) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/trigger-referente-scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify({ referente_id: referenteId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Error al iniciar scraping');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['referentes'] });
      toast({
        title: 'Scraping iniciado',
        description: `${data.message ?? ''} Plataformas: ${(data.platforms ?? []).join(', ')}.`,
      });
    },
    onError: (error: any) => {
      toast({ title: 'Error al scrapear', description: error.message, variant: 'destructive' });
    },
  });

  return {
    referentes,
    isLoading,
    error,
    createReferente: createReferente.mutateAsync,
    isCreating: createReferente.isPending,
    updateReferente: updateReferente.mutateAsync,
    isUpdating: updateReferente.isPending,
    deleteReferente: deleteReferente.mutate,
    isDeleting: deleteReferente.isPending,
    scrapeReferente: scrapeReferente.mutate,
    isScraping: scrapeReferente.isPending,
    scrapingId: scrapeReferente.isPending ? (scrapeReferente.variables as string) : null,
  };
}
