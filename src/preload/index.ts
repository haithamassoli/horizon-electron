import { contextBridge, ipcRenderer } from 'electron';
import {
  ipcChannels,
  settingsGetResponseSchema,
  settingsSetResponseSchema,
  settingsChangedEventSchema,
  stateGetResponseSchema,
  stateChangedEventSchema,
  schedulerEventBroadcastSchema,
  trayActionResponseSchema,
  type Settings,
  type SchedulerState,
  type SchedulerEvent,
  type TrayAction
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
  },
  state: {
    async get(): Promise<SchedulerState> {
      return invokeAndParse(ipcChannels.stateGet, undefined, (d) =>
        stateGetResponseSchema.safeParse(d)
      );
    },
    onChanged(listener: (state: SchedulerState) => void): () => void {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = stateChangedEventSchema.safeParse(payload);
        if (parsed.success) listener(parsed.data);
      };
      ipcRenderer.on(ipcChannels.stateChanged, wrapped);
      void ipcRenderer.invoke(ipcChannels.stateSubscribe);
      return () => {
        ipcRenderer.removeListener(ipcChannels.stateChanged, wrapped);
      };
    },
    onEvent(listener: (event: SchedulerEvent) => void): () => void {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = schedulerEventBroadcastSchema.safeParse(payload);
        if (parsed.success) listener(parsed.data);
      };
      ipcRenderer.on(ipcChannels.schedulerEvent, wrapped);
      void ipcRenderer.invoke(ipcChannels.stateSubscribe);
      return () => {
        ipcRenderer.removeListener(ipcChannels.schedulerEvent, wrapped);
      };
    }
  },
  tray: {
    async dispatch(action: TrayAction): Promise<SchedulerState> {
      return invokeAndParse(ipcChannels.trayAction, { action }, (d) =>
        trayActionResponseSchema.safeParse(d)
      );
    }
  },
  popover: {
    async hide(): Promise<void> {
      await ipcRenderer.invoke(ipcChannels.popoverHide);
    }
  }
} as const;

export type HorizonApi = typeof horizon;

contextBridge.exposeInMainWorld('horizon', horizon);
