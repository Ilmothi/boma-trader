import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { Batch, Sale, Death, Expense } from '../types';
import type { Data } from './calc';

export interface Store extends Data {
  target: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

const empty: Data = { batches: [], sales: [], deaths: [], expenses: [] };

export function useStore(userId: string | null): Store {
  const [data, setData] = useState<Data>(empty);
  const [target, setTarget] = useState(125);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [b, s, de, e, cfg] = await Promise.all([
      supabase.from('batches').select('*').order('purchase_date', { ascending: false }),
      supabase.from('sales').select('*'),
      supabase.from('deaths').select('*'),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
    ]);
    setData({
      batches: (b.data ?? []) as Batch[],
      sales: (s.data ?? []) as Sale[],
      deaths: (de.data ?? []) as Death[],
      expenses: (e.data ?? []) as Expense[],
    });
    if (cfg.data) {
      setTarget((cfg.data as { nairobi_target: number }).nairobi_target);
    } else {
      // seed a default settings row on first run
      await supabase.from('settings').insert({ user_id: userId, nairobi_target: 125 });
      setTarget(125);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) refetch();
    else { setData(empty); setLoading(false); }
  }, [userId, refetch]);

  return { ...data, target, loading, refetch };
}

export async function saveTarget(userId: string, target: number) {
  await supabase.from('settings').upsert({ user_id: userId, nairobi_target: target });
}
