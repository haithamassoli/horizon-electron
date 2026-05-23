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
  overlayInitResponseSchema,
  overlayTickEventSchema,
  overlaySkipResponseIpcSchema,
  overlaySnoozeResponseIpcSchema,
  overlayPanicResponseIpcSchema,
  preWarningInitResponseSchema,
  preWarningTickEventSchema,
  todayGetResponseSchema,
  todayChangedEventSchema,
  onboardingCompleteResponseSchema,
  audioGetSrcResponseSchema,
  appOpenExternalResponseSchema,
  appGetVersionResponseSchema,
  type Settings,
  type SchedulerState,
  type SchedulerEvent,
  type TrayAction,
  type OverlayInitPayload,
  type OverlayTickPayload,
  type OverlaySkipResponse,
  type OverlaySnoozeResponse,
  type OverlayPanicResponse,
  type PreWarningInitPayload,
  type PreWarningTickPayload,
  type TodayCounters,
  type AudioTrack
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
  },
  overlay: {
    async init(): Promise<OverlayInitPayload> {
      return invokeAndParse(ipcChannels.overlayInit, undefined, (d) =>
        overlayInitResponseSchema.safeParse(d)
      );
    },
    async skip(sessionId: string): Promise<OverlaySkipResponse> {
      return invokeAndParse(ipcChannels.overlaySkip, { sessionId }, (d) =>
        overlaySkipResponseIpcSchema.safeParse(d)
      );
    },
    async snooze(sessionId: string): Promise<OverlaySnoozeResponse> {
      return invokeAndParse(ipcChannels.overlaySnooze, { sessionId }, (d) =>
        overlaySnoozeResponseIpcSchema.safeParse(d)
      );
    },
    async panic(sessionId: string): Promise<OverlayPanicResponse> {
      return invokeAndParse(ipcChannels.overlayPanic, { sessionId }, (d) =>
        overlayPanicResponseIpcSchema.safeParse(d)
      );
    },
    onTick(listener: (payload: OverlayTickPayload) => void): () => void {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = overlayTickEventSchema.safeParse(payload);
        if (parsed.success) listener(parsed.data);
      };
      ipcRenderer.on(ipcChannels.overlayTick, wrapped);
      return () => {
        ipcRenderer.removeListener(ipcChannels.overlayTick, wrapped);
      };
    }
  },
  preWarning: {
    async init(): Promise<PreWarningInitPayload> {
      return invokeAndParse(ipcChannels.preWarningInit, undefined, (d) =>
        preWarningInitResponseSchema.safeParse(d)
      );
    },
    async dismiss(): Promise<void> {
      await ipcRenderer.invoke(ipcChannels.preWarningDismiss);
    },
    onTick(listener: (payload: PreWarningTickPayload) => void): () => void {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = preWarningTickEventSchema.safeParse(payload);
        if (parsed.success) listener(parsed.data);
      };
      ipcRenderer.on(ipcChannels.preWarningTick, wrapped);
      return () => {
        ipcRenderer.removeListener(ipcChannels.preWarningTick, wrapped);
      };
    }
  },
  today: {
    async get(): Promise<TodayCounters> {
      return invokeAndParse(ipcChannels.todayGet, undefined, (d) =>
        todayGetResponseSchema.safeParse(d)
      );
    },
    onChanged(listener: (counters: TodayCounters) => void): () => void {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = todayChangedEventSchema.safeParse(payload);
        if (parsed.success) listener(parsed.data);
      };
      ipcRenderer.on(ipcChannels.todayChanged, wrapped);
      void ipcRenderer.invoke(ipcChannels.todaySubscribe);
      return () => {
        ipcRenderer.removeListener(ipcChannels.todayChanged, wrapped);
      };
    }
  },
  onboarding: {
    async complete(): Promise<Settings> {
      return invokeAndParse(ipcChannels.onboardingComplete, undefined, (d) =>
        onboardingCompleteResponseSchema.safeParse(d)
      );
    }
  },
  audio: {
    async getSrc(track: AudioTrack): Promise<{ url: string | null }> {
      return invokeAndParse(ipcChannels.audioGetSrc, { track }, (d) =>
        audioGetSrcResponseSchema.safeParse(d)
      );
    }
  },
  app: {
    async openExternal(url: string): Promise<void> {
      const raw = await ipcRenderer.invoke(ipcChannels.appOpenExternal, { url });
      const parsed = appOpenExternalResponseSchema.safeParse(raw);
      if (!parsed.success) throw new Error('Invalid response on app:open-external');
    },
    async getVersion(): Promise<string> {
      const { version } = await invokeAndParse(
        ipcChannels.appGetVersion,
        undefined,
        (d) => appGetVersionResponseSchema.safeParse(d)
      );
      return version;
    }
  }
} as const;

export type HorizonApi = typeof horizon;

contextBridge.exposeInMainWorld('horizon', horizon);
