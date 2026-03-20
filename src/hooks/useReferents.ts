import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUserId } from '@/hooks/useUserId';
import type { ReferentPlatform } from '@/types';

export function useReferents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = useUserId();

  const { data: referents, isLoading, error } = useQuery({
    queryKey: ['referents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referent_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createReferent = useMutation({
    mutationFn: async (ref: {
      name: string;
      platform: ReferentPlatform;
      profile_url?: string;
      fan_page_name?: string;
      niche?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('referent_profiles')
        .insert({ user_id: userId, ...ref })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referents'] });
      toast({ title: 'Referente agregado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateReferent = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { data, error } = await supabase
        .from('referent_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referents'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteReferent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('referent_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referents'] });
      toast({ title: 'Referente eliminado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('referent_profiles')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referents'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    referents,
    isLoading,
    error,
    activeReferentNames: referents?.filter(r => r.is_active).map(r => r.name) || [],
    createReferent: createReferent.mutate,
    isCreating: createReferent.isPending,
    updateReferent: updateReferent.mutate,
    deleteReferent: deleteReferent.mutate,
    isDeleting: deleteReferent.isPending,
    toggleActive: toggleActive.mutate,
  };
}
