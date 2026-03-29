import { useState, useEffect, useCallback } from 'react';
import { SUPABASE_KEY } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { AdSpyRun, AdSpyResult } from '@/types';

const BASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_KEY}`,
  apikey: SUPABASE_KEY,
};

interface TriggerSpyParams {
  search_query: string;
  country_code: string;
  min_page_likes: number;
  max_ads: number;
}

async function restGet<T>(table: string, params: string = ''): Promise<T[]> {
  const res = await fetch(`${BASE_URL}/rest/v1/${table}?${params}`, { headers });
  if (!res.ok) return [];
  return res.json();
}

export function useAdSpy() {
  const { toast } = useToast();

  const [runs, setRuns] = useState<AdSpyRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<AdSpyRun | null>(null);
  const [results, setResults] = useState<AdSpyResult[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  const loadRuns = useCallback(async () => {
    const data = await restGet<AdSpyRun>('ad_spy_runs', 'order=created_at.desc&limit=20');
    setRuns(data);
  }, []);

  const loadResults = useCallback(async (runId: string) => {
    setIsLoadingResults(true);
    const data = await restGet<AdSpyResult>('ad_spy_results', `run_id=eq.${runId}&order=created_at.desc`);
    setResults(data);
    setIsLoadingResults(false);
  }, []);

  const triggerSpy = useCallback(async (params: TriggerSpyParams) => {
    setIsTriggering(true);
    try {
      const res = await fetch(`${BASE_URL}/functions/v1/trigger-ad-spy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to trigger spy');
      }

      const { run_id } = await res.json();
      setActiveRunId(run_id);
      toast({ description: 'Spy iniciado. El agente esta trabajando...' });

      await loadRuns();
      return run_id;
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message });
      return null;
    } finally {
      setIsTriggering(false);
    }
  }, [toast, loadRuns]);

  // Poll active run status
  useEffect(() => {
    if (!activeRunId) return;

    const startTime = Date.now();
    const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes (video processing takes longer)

    const poll = async () => {
      const data = await restGet<AdSpyRun>('ad_spy_runs', `id=eq.${activeRunId}&limit=1`);
      const run = data[0];
      if (!run) return;
      setActiveRun(run);

      if (run.status === 'completed') {
        setActiveRunId(null);
        await loadResults(run.id);
        await loadRuns();
        toast({ description: `Spy completado: ${run.total_results || 0} anuncios analizados` });
      } else if (run.status === 'error') {
        setActiveRunId(null);
        await loadRuns();
        toast({ variant: 'destructive', description: run.error_message || 'Error en el spy' });
      } else if (Date.now() - startTime > TIMEOUT_MS) {
        setActiveRunId(null);
        toast({ variant: 'destructive', description: 'Timeout: el spy tardo mas de 15 minutos' });
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [activeRunId, loadResults, loadRuns, toast]);

  const selectRun = useCallback(async (run: AdSpyRun) => {
    setActiveRun(run);
    setActiveRunId(null);
    await loadResults(run.id);
  }, [loadResults]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  return {
    runs,
    activeRun,
    results,
    isTriggering,
    isLoadingResults,
    isPolling: !!activeRunId,
    triggerSpy,
    selectRun,
    loadRuns,
  };
}
