import { useEffect, useState } from 'react';
import type { TodayCounters } from '@shared/schemas';

interface UseTodayResult {
  counters: TodayCounters | null;
  ready: boolean;
}

export function useToday(): UseTodayResult {
  const [counters, setCounters] = useState<TodayCounters | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    window.horizon.today
      .get()
      .then((c) => {
        if (!mounted) return;
        setCounters(c);
        setReady(true);
      })
      .catch(() => {
        if (mounted) setReady(true);
      });

    const unsubscribe = window.horizon.today.onChanged((c) => {
      setCounters(c);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { counters, ready };
}
