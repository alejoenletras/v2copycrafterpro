import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_KEY } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { AdSearch, Ad, AdSearchType, AdMediaFilter } from '@/types';

const BASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

interface TriggerSearchParams {
  search_type: AdSearchType;
  query: string;
  country_code: string;
  media_type: AdMediaFilter;
}

export function useAdSearches() {
  const { toast } = useToast();

  const [searches, setSearches] = useState<AdSearch[]>([]);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [activeSearch, setActiveSearch] = useState<AdSearch | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isLoadingAds, setIsLoadingAds] = useState(false);

  // Load past searches
  const loadSearches = useCallback(async () => {
    const { data, error } = await supabase
      .from('ad_searches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error loading searches:', error);
      return;
    }
    setSearches((data as unknown as AdSearch[]) || []);
  }, []);

  // Load ads for a specific search
  const loadAds = useCallback(async (searchId: string) => {
    setIsLoadingAds(true);
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .eq('search_id', searchId)
      .order('days_active', { ascending: false });

    if (error) {
      console.error('Error loading ads:', error);
      setIsLoadingAds(false);
      return;
    }
    setAds((data as unknown as Ad[]) || []);
    setIsLoadingAds(false);
  }, []);

  // Trigger new search
  const triggerSearch = useCallback(async (params: TriggerSearchParams) => {
    setIsTriggering(true);
    try {
      const res = await fetch(`${BASE_URL}/functions/v1/trigger-ad-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to trigger search');
      }

      const { search_id } = await res.json();
      setActiveSearchId(search_id);
      toast({ description: 'Busqueda iniciada. El agente esta trabajando...' });

      // Refresh searches list
      await loadSearches();

      return search_id;
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message });
      return null;
    } finally {
      setIsTriggering(false);
    }
  }, [toast, loadSearches]);

  // Poll active search status
  useEffect(() => {
    if (!activeSearchId) return;

    const startTime = Date.now();
    const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

    const poll = async () => {
      const { data, error } = await supabase
        .from('ad_searches')
        .select('*')
        .eq('id', activeSearchId)
        .single();

      if (error) return;
      const search = data as unknown as AdSearch;
      setActiveSearch(search);

      if (search.status === 'completed') {
        setActiveSearchId(null);
        await loadAds(search.id);
        await loadSearches();
        toast({ description: `Busqueda completada: ${search.filtered_results || 0} anuncios encontrados` });
      } else if (search.status === 'error') {
        setActiveSearchId(null);
        await loadSearches();
        toast({ variant: 'destructive', description: search.error_message || 'Error en la busqueda' });
      } else if (Date.now() - startTime > TIMEOUT_MS) {
        setActiveSearchId(null);
        toast({ variant: 'destructive', description: 'Timeout: la busqueda tardo mas de 10 minutos' });
      }
    };

    poll(); // immediate first check
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [activeSearchId, loadAds, loadSearches, toast]);

  // Select a completed search to view its ads
  const selectSearch = useCallback(async (search: AdSearch) => {
    setActiveSearch(search);
    setActiveSearchId(null); // stop polling
    await loadAds(search.id);
  }, [loadAds]);

  // Initial load
  useEffect(() => {
    loadSearches();
  }, [loadSearches]);

  return {
    searches,
    activeSearch,
    ads,
    isTriggering,
    isLoadingAds,
    isPolling: !!activeSearchId,
    triggerSearch,
    selectSearch,
    loadSearches,
  };
}
