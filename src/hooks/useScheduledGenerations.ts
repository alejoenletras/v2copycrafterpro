import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { ScheduledGeneration } from '@/types';

export function useScheduledGenerations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['scheduled-generations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_generations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ScheduledGeneration[];
    },
  });

  const createSchedule = useMutation({
    mutationFn: async (input: Omit<ScheduledGeneration, 'id' | 'created_at' | 'last_run_at' | 'next_run_at'>) => {
      const { data, error } = await supabase
        .from('scheduled_generations')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as ScheduledGeneration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-generations'] });
      toast({ title: 'Agente programado', description: 'El agente se ejecutará automáticamente.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleSchedule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('scheduled_generations')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-generations'] });
      toast({ title: is_active ? 'Agente activado' : 'Agente pausado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scheduled_generations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-generations'] });
      toast({ title: 'Programación eliminada' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    schedules,
    isLoading,
    createSchedule: createSchedule.mutateAsync,
    isCreating: createSchedule.isPending,
    toggleSchedule: toggleSchedule.mutate,
    isToggling: toggleSchedule.isPending,
    deleteSchedule: deleteSchedule.mutate,
    isDeleting: deleteSchedule.isPending,
  };
}
