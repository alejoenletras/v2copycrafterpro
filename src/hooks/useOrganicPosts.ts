import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, SUPABASE_KEY } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { OrganicPost } from '@/types';

const BASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

export function useOrganicPosts(competitorId?: string) {
  const { toast } = useToast();
  const [isTriggering, setIsTriggering] = useState(false);

  const { data: posts, isLoading, error } = useQuery({
    queryKey: competitorId ? ['organic-posts', competitorId] : ['organic-posts'],
    queryFn: async () => {
      let query = (supabase as any)
        .from('organic_posts')
        .select('*, competitor:competitor_profiles(fb_page_name)')
        .order('views', { ascending: false });

      if (competitorId) {
        query = query.eq('competitor_id', competitorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]).map((row) => ({
        ...row,
        competitor_name: row.competitor?.fb_page_name || null,
        competitor: undefined,
      })) as OrganicPost[];
    },
  });

  const triggerScraping = async () => {
    setIsTriggering(true);
    try {
      const res = await fetch(`${BASE_URL}/functions/v1/trigger-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ workflow: 'organic-posts' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to trigger scraping');
      }
      toast({ description: 'Scraping iniciado. El agente buscara posts organicos...' });
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message });
    } finally {
      setIsTriggering(false);
    }
  };

  return { posts, isLoading, error, triggerScraping, isTriggering };
}
