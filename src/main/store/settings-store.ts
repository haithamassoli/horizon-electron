import Store from 'electron-store';
import { settingsSchema, defaultSettings, type Settings } from '@shared/schemas';

type Schema = {
  settings: Settings;
};

class SettingsStore {
  private readonly store: Store<Schema>;
  private readonly listeners = new Set<(settings: Settings) => void>();

  constructor() {
    this.store = new Store<Schema>({
      name: 'horizon-settings',
      defaults: { settings: defaultSettings },
      clearInvalidConfig: true
    });

    const raw = this.store.get('settings');
    const parsed = settingsSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn('[settings-store] invalid stored settings, resetting to defaults', parsed.error);
      this.store.set('settings', defaultSettings);
    } else {
      this.store.set('settings', parsed.data);
    }
  }

  get(): Settings {
    return this.store.get('settings');
  }

  set(next: Settings): Settings {
    const parsed = settingsSchema.parse(next);
    this.store.set('settings', parsed);
    this.emit(parsed);
    return parsed;
  }

  subscribe(listener: (settings: Settings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(settings: Settings): void {
    for (const listener of this.listeners) {
      try {
        listener(settings);
      } catch (err) {
        console.error('[settings-store] listener threw', err);
      }
    }
  }
}

let instance: SettingsStore | undefined;

export function getSettingsStore(): SettingsStore {
  if (!instance) instance = new SettingsStore();
  return instance;
}

export type { SettingsStore };
