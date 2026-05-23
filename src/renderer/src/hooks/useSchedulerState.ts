import { useEffect, useRef, useState } from 'react';
import type { SchedulerEvent, SchedulerState } from '@shared/schemas';

interface State {
  state: SchedulerState | null;
  ready: boolean;
  error: string | null;
  events: SchedulerEvent[];
}

interface UseSchedulerStateOptions {
  collectEvents?: boolean;
  maxEvents?: number;
}

export function useSchedulerState(opts: UseSchedulerStateOptions = {}): State & {
  clearEvents: () => void;
} {
  const { collectEvents = false, maxEvents = 50 } = opts;
  const [state, setState] = useState<State>({
    state: null,
    ready: false,
    error: null,
    events: []
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    window.horizon.state
      .get()
      .then((s) => {
        if (!mounted.current) return;
        setState((p) => ({ ...p, state: s, ready: true }));
      })
      .catch((err: unknown) => {
        if (!mounted.current) return;
        setState((p) => ({ ...p, error: err instanceof Error ? err.message : String(err) }));
      });

    const unsubState = window.horizon.state.onChanged((s) => {
      setState((p) => ({ ...p, state: s }));
    });

    let unsubEvent: (() => void) | null = null;
    if (collectEvents) {
      unsubEvent = window.horizon.state.onEvent((event) => {
        setState((p) => ({
          ...p,
          events: [event, ...p.events].slice(0, maxEvents)
        }));
      });
    }

    return () => {
      mounted.current = false;
      unsubState();
      unsubEvent?.();
    };
  }, [collectEvents, maxEvents]);

  return {
    ...state,
    clearEvents: () => setState((p) => ({ ...p, events: [] }))
  };
}
