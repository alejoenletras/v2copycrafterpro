import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { ModeledScriptV3, ScriptStatus } from '@/types';

interface UseModeledScriptsOptions {
  personalityDnaId?: string;
  runId?: string;
  status?: ScriptStatus;
}

export function useModeledScripts(options: UseModeledScriptsOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { personalityDnaId, runId, status } = options;

  const { data: scripts = [], isLoading, error } = useQuery({
    queryKey: ['modeled-scripts', options],
    queryFn: async () => {
      let q = supabase
        .from('modeled_scripts')
        .select('*')
        .order('created_at', { ascending: false });

      if (runId) q = q.eq('generation_run_id', runId);
      else if (personalityDnaId) q = q.eq('personality_dna_id', personalityDnaId);
      if (status) q = q.eq('status', status);

      const { data, error } = await q;
      if (error) throw error;
      return data as ModeledScriptV3[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ScriptStatus }) => {
      const { error } = await supabase
        .from('modeled_scripts')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['modeled-scripts'] });
      const labels: Record<ScriptStatus, string> = {
        approved: 'Guión aprobado',
        rejected: 'Guión rechazado',
        used: 'Guión marcado como usado',
        draft: 'Guión movido a borrador',
      };
      toast({ title: labels[status] ?? 'Actualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    scripts,
    isLoading,
    error,
    updateStatus: updateStatus.mutate,
    isUpdating: updateStatus.isPending,
  };
}
