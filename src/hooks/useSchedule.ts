import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserId } from '@/hooks/useUserId';

export interface Schedule {
  id?: string;
  user_id: string;
  keyword: string;
  countries: string[];
  max_ads: number;
  dna_expert: string;
  dna_audience: string;
  dna_product: string;
  telegram_chat_id: string;
  email: string;
  frequency: 'daily' | 'weekly';
  run_hour: number;
  run_minute: number;
  timezone: string;
  run_days: number[];
  is_active: boolean;
  last_run_at?: string;
  last_run_status?: string;
}

export function useSchedule() {
  const userId = useUserId();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedule();
  }, [userId]);

  async function loadSchedule() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedules' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && !error && data.length > 0) {
        const row = data[0] as any;
        setSchedule({
          ...row,
          countries: typeof row.countries === 'string' ? JSON.parse(row.countries) : row.countries,
          run_days: typeof row.run_days === 'string' ? JSON.parse(row.run_days) : row.run_days,
        });
      }
    } catch (e) {
      console.error('Error loading schedule:', e);
    }
    setLoading(false);
  }

  async function saveSchedule(scheduleData: Partial<Schedule>) {
    const payload = {
      ...scheduleData,
      user_id: userId,
      countries: JSON.stringify(scheduleData.countries),
      run_days: JSON.stringify(scheduleData.run_days),
    };

    try {
      if (schedule?.id) {
        const { data, error } = await supabase
          .from('schedules' as any)
          .update(payload)
          .eq('id', schedule.id)
          .select();

        if (!error && data && data.length > 0) {
          const row = data[0] as any;
          setSchedule({
            ...row,
            countries: typeof row.countries === 'string' ? JSON.parse(row.countries) : row.countries,
            run_days: typeof row.run_days === 'string' ? JSON.parse(row.run_days) : row.run_days,
          });
        }
        return { data, error };
      } else {
        const { data, error } = await supabase
          .from('schedules' as any)
          .insert(payload)
          .select();

        if (!error && data && data.length > 0) {
          const row = data[0] as any;
          setSchedule({
            ...row,
            countries: typeof row.countries === 'string' ? JSON.parse(row.countries) : row.countries,
            run_days: typeof row.run_days === 'string' ? JSON.parse(row.run_days) : row.run_days,
          });
        }
        return { data, error };
      }
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  }

  async function toggleActive(active: boolean) {
    if (!schedule?.id) return;
    const { error } = await supabase
      .from('schedules' as any)
      .update({ is_active: active })
      .eq('id', schedule.id);

    if (!error) {
      setSchedule(prev => prev ? { ...prev, is_active: active } : null);
    }
  }

  async function deleteSchedule() {
    if (!schedule?.id) return;
    const { error } = await supabase
      .from('schedules' as any)
      .delete()
      .eq('id', schedule.id);

    if (!error) {
      setSchedule(null);
    }
  }

  return { schedule, loading, saveSchedule, toggleActive, deleteSchedule, reload: loadSchedule };
}