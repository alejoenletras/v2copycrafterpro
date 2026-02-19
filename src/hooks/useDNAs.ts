import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { DNAType } from '@/types';

export function useDNAs(type?: DNAType) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dnas, isLoading, error } = useQuery({
    queryKey: type ? ['dnas', type] : ['dnas'],
    queryFn: async () => {
      let query = supabase
        .from('dnas')
        .select('*')
        .order('updated_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createDNA = useMutation({
    mutationFn: async (dna: { type: DNAType; name: string; data: Record<string, any> }) => {
      const { data, error } = await supabase
        .from('dnas')
        .insert({
          user_id: 'default-user',
          type: dna.type,
          name: dna.name,
          data: dna.data,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dnas'] });
      toast({ title: 'DNA guardado', description: 'Perfil guardado correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateDNA = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { name?: string; data?: Record<string, any> } }) => {
      const { data, error } = await supabase
        .from('dnas')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dnas'] });
      toast({ title: 'DNA actualizado', description: 'Perfil actualizado correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDNA = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dnas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dnas'] });
      toast({ title: 'DNA eliminado', description: 'Perfil eliminado correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    dnas,
    isLoading,
    error,
    createDNA: createDNA.mutate,
    createDNAAsync: createDNA.mutateAsync,
    isCreating: createDNA.isPending,
    updateDNA: updateDNA.mutate,
    updateDNAAsync: updateDNA.mutateAsync,
    isUpdating: updateDNA.isPending,
    deleteDNA: deleteDNA.mutate,
    isDeleting: deleteDNA.isPending,
  };
}
