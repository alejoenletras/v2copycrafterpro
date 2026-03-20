import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUserId } from '@/hooks/useUserId';
import type { ReferenceCategory } from '@/types';

export function useReferences(category?: ReferenceCategory) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = useUserId();

  const { data: references, isLoading, error } = useQuery({
    queryKey: category ? ['references', category] : ['references'],
    queryFn: async () => {
      let query = supabase
        .from('reference_scripts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createReference = useMutation({
    mutationFn: async (ref: {
      name: string;
      category: ReferenceCategory;
      content: string;
      source_url?: string;
      source_author?: string;
      tags?: string[];
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('reference_scripts')
        .insert({
          user_id: userId,
          ...ref,
          tags: ref.tags || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references'] });
      toast({ title: 'Referencia guardada' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateReference = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { data, error } = await supabase
        .from('reference_scripts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references'] });
      toast({ title: 'Referencia actualizada' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteReference = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reference_scripts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references'] });
      toast({ title: 'Referencia eliminada' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('reference_scripts')
        .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    references,
    isLoading,
    error,
    createReference: createReference.mutate,
    isCreating: createReference.isPending,
    updateReference: updateReference.mutate,
    isUpdating: updateReference.isPending,
    deleteReference: deleteReference.mutate,
    isDeleting: deleteReference.isPending,
    toggleFavorite: toggleFavorite.mutate,
  };
}
