import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function useProjects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener todos los proyectos
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          generated_copies(id, created_at)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Crear proyecto
  const createProject = useMutation({
    mutationFn: async (project: any) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: 'default-user',
          funnel_type: project.funnelType || 'vsl',
          country: project.country || 'colombia',
          expert_profile: project.expertProfile || {},
          avatar_profile: project.avatarProfile || {},
          persuasion_strategy: project.persuasionStrategy || {},
          product_info: project.productInfo || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: '✅ Proyecto creado',
        description: 'Tu proyecto se guardó correctamente',
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Actualizar proyecto
  const updateProject = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({
          funnel_type: updates.funnelType,
          country: updates.country,
          expert_profile: updates.expertProfile,
          avatar_profile: updates.avatarProfile,
          persuasion_strategy: updates.persuasionStrategy,
          product_info: updates.productInfo,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: '✅ Guardado',
        description: 'Cambios guardados correctamente',
      });
    },
  });

  // Eliminar proyecto
  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: '🗑️ Eliminado',
        description: 'Proyecto eliminado correctamente',
      });
    },
  });

  return {
    projects,
    isLoading,
    error,
    createProject: createProject.mutate,
    isCreating: createProject.isPending,
    updateProject: updateProject.mutate,
    isUpdating: updateProject.isPending,
    deleteProject: deleteProject.mutate,
    isDeleting: deleteProject.isPending,
  };
}
