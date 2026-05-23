import { registerHandler, broadcast } from './registry';
import { getSettingsStore } from '../store/settings-store';
import {
  ipcChannels,
  settingsGetRequestSchema,
  settingsGetResponseSchema,
  settingsSetRequestSchema,
  settingsSetResponseSchema,
  settingsSubscribeRequestSchema,
  settingsSubscribeResponseSchema,
  settingsChangedEventSchema
} from '@shared/schemas';

export function registerSettingsChannels(): void {
  const store = getSettingsStore();

  registerHandler({
    channel: ipcChannels.settingsGet,
    request: settingsGetRequestSchema,
    response: settingsGetResponseSchema,
    handler: () => store.get()
  });

  registerHandler({
    channel: ipcChannels.settingsSet,
    request: settingsSetRequestSchema,
    response: settingsSetResponseSchema,
    handler: (next) => store.set(next)
  });

  registerHandler({
    channel: ipcChannels.settingsSubscribe,
    request: settingsSubscribeRequestSchema,
    response: settingsSubscribeResponseSchema,
    handler: () => undefined
  });

  store.subscribe((settings) => {
    broadcast(ipcChannels.settingsChanged, settingsChangedEventSchema, settings);
  });
}
