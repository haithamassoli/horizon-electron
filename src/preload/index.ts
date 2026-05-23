import { contextBridge, ipcRenderer } from 'electron';
import {
  ipcChannels,
  settingsGetResponseSchema,
  settingsSetResponseSchema,
  settingsChangedEventSchema,
  type Settings
} from '@shared/schemas';

async function invokeAndParse<T>(
  channel: string,
  payload: unknown,
  parser: (data: unknown) => { success: true; data: T } | { success: false }
): Promise<T> {
  const raw = await ipcRenderer.invoke(channel, payload);
  const parsed = parser(raw);
  if (!parsed.success) throw new Error(`Invalid response on channel ${channel}`);
  return parsed.data;
}

const horizon = {
  settings: {
    async get(): Promise<Settings> {
      return invokeAndParse(ipcChannels.settingsGet, undefined, (d) =>
        settingsGetResponseSchema.safeParse(d)
      );
    },
    async set(next: Settings): Promise<Settings> {
      return invokeAndParse(ipcChannels.settingsSet, next, (d) =>
        settingsSetResponseSchema.safeParse(d)
      );
    },
    onChanged(listener: (settings: Settings) => void): () => void {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = settingsChangedEventSchema.safeParse(payload);
        if (parsed.success) listener(parsed.data);
      };
      ipcRenderer.on(ipcChannels.settingsChanged, wrapped);
      void ipcRenderer.invoke(ipcChannels.settingsSubscribe);
      return () => {
        ipcRenderer.removeListener(ipcChannels.settingsChanged, wrapped);
      };
    }
  }
} as const;

export type HorizonApi = typeof horizon;

contextBridge.exposeInMainWorld('horizon', horizon);
