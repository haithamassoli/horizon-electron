import Store from 'electron-store';
import {
  persistedSchedulerSchema,
  defaultPersistedScheduler,
  type PersistedScheduler
} from '@shared/schemas';

type Schema = {
  scheduler: PersistedScheduler;
};

class SchedulerStore {
  private readonly store: Store<Schema>;

  constructor() {
    this.store = new Store<Schema>({
      name: 'horizon-scheduler',
      defaults: { scheduler: defaultPersistedScheduler },
      clearInvalidConfig: true
    });

    const raw = this.store.get('scheduler');
    const parsed = persistedSchedulerSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn('[scheduler-store] invalid stored scheduler, resetting', parsed.error);
      this.store.set('scheduler', defaultPersistedScheduler);
    } else {
      this.store.set('scheduler', parsed.data);
    }
  }

  get(): PersistedScheduler {
    return this.store.get('scheduler');
  }

  set(next: PersistedScheduler): PersistedScheduler {
    const parsed = persistedSchedulerSchema.parse(next);
    this.store.set('scheduler', parsed);
    return parsed;
  }
}

let instance: SchedulerStore | undefined;

export function getSchedulerStore(): SchedulerStore {
  if (!instance) instance = new SchedulerStore();
  return instance;
}

export type { SchedulerStore };
