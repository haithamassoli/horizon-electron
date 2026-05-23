import Store from 'electron-store';
import {
  defaultTodayCounters,
  todayCountersSchema,
  type TodayCounters
} from '@shared/schemas';

type Schema = {
  today: TodayCounters;
};

function localDateString(now: number): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rollover(current: TodayCounters, now: number): TodayCounters {
  const today = localDateString(now);
  if (current.date === today) return current;
  return { ...defaultTodayCounters, date: today };
}

class TodayStore {
  private readonly store: Store<Schema>;
  private readonly listeners = new Set<(counters: TodayCounters) => void>();
  private current: TodayCounters;

  constructor() {
    this.store = new Store<Schema>({
      name: 'horizon-today',
      defaults: { today: defaultTodayCounters },
      clearInvalidConfig: true
    });

    const raw = this.store.get('today');
    const parsed = todayCountersSchema.safeParse(raw);
    const seed = parsed.success ? parsed.data : defaultTodayCounters;
    this.current = rollover(seed, Date.now());
    this.persist();
  }

  get(): TodayCounters {
    return this.current;
  }

  rolloverIfNewDay(now: number = Date.now()): boolean {
    const next = rollover(this.current, now);
    if (next.date === this.current.date) return false;
    this.current = next;
    this.persist();
    this.emit();
    return true;
  }

  increment(field: Exclude<keyof TodayCounters, 'date'>, by = 1): TodayCounters {
    this.rolloverIfNewDay();
    this.current = { ...this.current, [field]: this.current[field] + by };
    this.persist();
    this.emit();
    return this.current;
  }

  subscribe(listener: (counters: TodayCounters) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private persist(): void {
    this.store.set('today', this.current);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.current);
      } catch (err) {
        console.error('[today-store] listener threw', err);
      }
    }
  }
}

let instance: TodayStore | undefined;

export function getTodayStore(): TodayStore {
  if (!instance) instance = new TodayStore();
  return instance;
}

export type { TodayStore };
