import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUserId } from '@/hooks/useUserId';
import { callEdge } from '@/lib/callEdge';
import type { VideoInspiration } from '@/types';

export function useVideoInspirations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = useUserId();

  // Query: list all video inspirations
  const { data: inspirations, isLoading, error } = useQuery({
    queryKey: ['video-inspirations'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('video_inspirations')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as VideoInspiration[];
      } catch (err) {
        console.error('video_inspirations query failed:', err);
        return [] as VideoInspiration[];
      }
    },
    retry: false,
    structuralSharing: false,
  });

  // Create new inspiration record
  const createInspiration = useMutation({
    mutationFn: async (params: {
      source_type: 'upload' | 'url';
      source_url?: string;
      storage_path?: string;
      platform?: string;
    }) => {
      const { data, error } = await supabase
        .from('video_inspirations')
        .insert({ user_id: userId, ...params })
        .select()
        .single();
      if (error) throw error;
      return data as VideoInspiration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-inspirations'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update fields on an inspiration
  const updateFields = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('video_inspirations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as VideoInspiration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-inspirations'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Upload video file to Storage
  const uploadVideo = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop() || 'mp4';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from('video-inspirations')
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      return path;
    },
    onError: (error: any) => {
      toast({ title: 'Error subiendo video', description: error.message, variant: 'destructive' });
    },
  });

  // Analyze video (calls edge function)
  const analyzeVideo = useMutation({
    mutationFn: async (params: {
      source_type: 'upload' | 'url';
      storage_path?: string;
      source_url?: string;
      transcript?: string;
    }) => {
      return callEdge('analyze-video-inspiration', params, 180000);
    },
    onError: (error: any) => {
      toast({ title: 'Error en análisis', description: error.message, variant: 'destructive' });
    },
  });

  // Search similar ads (calls edge function)
  const searchSimilarAds = useMutation({
    mutationFn: async (params: {
      keywords: string[];
      countries?: string[];
      max_ads_per_keyword?: number;
      max_total_ads?: number;
    }) => {
      return callEdge('search-similar-ads', params, 180000);
    },
    onError: (error: any) => {
      toast({ title: 'Error en búsqueda', description: error.message, variant: 'destructive' });
    },
  });

  // Score ads for similarity (calls edge function, batched)
  const scoreAds = useMutation({
    mutationFn: async (params: {
      video_analysis: Record<string, unknown>;
      ads: Record<string, unknown>[];
    }) => {
      return callEdge('score-ad-similarity', params, 120000);
    },
    onError: (error: any) => {
      toast({ title: 'Error en scoring', description: error.message, variant: 'destructive' });
    },
  });

  // Model selected ads (calls existing pipeline-model-ads)
  const modelAds = useMutation({
    mutationFn: async (params: {
      ads: Array<{ source: string; link: string; author: string; text: string; headline?: string; cta?: string }>;
      dna_expert: string;
      dna_audience: string;
      dna_product: string;
      training_context?: string;
    }) => {
      return callEdge('pipeline-model-ads', params, 300000);
    },
    onError: (error: any) => {
      toast({ title: 'Error en modelado', description: error.message, variant: 'destructive' });
    },
  });

  // Fetch transcript (calls existing fetch-transcript)
  const fetchTranscript = useMutation({
    mutationFn: async (params: { url: string; platform?: string }) => {
      return callEdge('fetch-transcript', params, 60000);
    },
    onError: (error: any) => {
      toast({ title: 'Error obteniendo transcripción', description: error.message, variant: 'destructive' });
    },
  });

  // Delete inspiration
  const deleteInspiration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('video_inspirations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-inspirations'] });
      toast({ title: 'Inspiración eliminada' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    inspirations,
    isLoading,
    error,
    createInspiration: createInspiration.mutateAsync,
    isCreating: createInspiration.isPending,
    updateFields: updateFields.mutateAsync,
    isUpdating: updateFields.isPending,
    uploadVideo: uploadVideo.mutateAsync,
    isUploading: uploadVideo.isPending,
    analyzeVideo: analyzeVideo.mutateAsync,
    isAnalyzing: analyzeVideo.isPending,
    searchSimilarAds: searchSimilarAds.mutateAsync,
    isSearching: searchSimilarAds.isPending,
    scoreAds: scoreAds.mutateAsync,
    isScoring: scoreAds.isPending,
    modelAds: modelAds.mutateAsync,
    isModeling: modelAds.isPending,
    fetchTranscript: fetchTranscript.mutateAsync,
    isFetchingTranscript: fetchTranscript.isPending,
    deleteInspiration: deleteInspiration.mutate,
    isDeleting: deleteInspiration.isPending,
  };
}
