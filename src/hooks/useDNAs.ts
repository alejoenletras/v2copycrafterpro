import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUserId } from '@/hooks/useUserId';
import { useDataScope } from '@/hooks/useDataScope';
import type { DNAType } from '@/types';

export function useDNAs(type?: DNAType) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = useUserId();
  const scopeIds = useDataScope();

  const { data: dnas, isLoading, error } = useQuery({
    queryKey: type ? ['dnas', type, scopeIds] : ['dnas', scopeIds],
    enabled: !!userId && !!scopeIds && scopeIds.length > 0,
    queryFn: async () => {
      let query = supabase
        .from('dnas')
        .select('*')
        .in('user_id', scopeIds!)
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
          user_id: userId,
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

  const setDefault = useMutation({
    mutationFn: async ({ id, dnaType }: { id: string; dnaType: DNAType }) => {
      // Clear current default for this type across the entire read scope
      // (for admins: all admins; for users: self). This keeps a single
      // default even when admins share the same DNA pool.
      await supabase
        .from('dnas')
        .update({ is_default: false })
        .eq('type', dnaType)
        .in('user_id', scopeIds ?? [userId!]);

      // Set new default
      const { data, error } = await supabase
        .from('dnas')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dnas'] });
      toast({ title: 'Predeterminado actualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const unsetDefault = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dnas')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dnas'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const duplicateDNA = useMutation({
    mutationFn: async (id: string) => {
      const source = dnas?.find((d) => d.id === id);
      if (!source) throw new Error('DNA no encontrado');

      const { data, error } = await supabase
        .from('dnas')
        .insert({
          user_id: userId,
          type: source.type,
          name: `${source.name} (copia)`,
          data: source.data,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dnas'] });
      toast({ title: 'DNA duplicado', description: 'Copia creada correctamente' });
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
    setDefault: setDefault.mutate,
    setDefaultAsync: setDefault.mutateAsync,
    isSettingDefault: setDefault.isPending,
    unsetDefault: unsetDefault.mutate,
    duplicateDNA: duplicateDNA.mutate,
    isDuplicating: duplicateDNA.isPending,
  };
}
