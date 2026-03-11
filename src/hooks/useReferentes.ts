import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Referente } from '@/types';

export function useReferentes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: referentes = [], isLoading, error } = useQuery({
    queryKey: ['referentes'],
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
  };
}
