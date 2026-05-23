import { registerHandler, broadcast } from './registry';
import { getTodayStore } from '../store/today-store';
import {
  ipcChannels,
  todayGetRequestSchema,
  todayGetResponseSchema,
  todaySubscribeRequestSchema,
  todaySubscribeResponseSchema,
  todayChangedEventSchema
} from '@shared/schemas';

let midnightHandle: ReturnType<typeof setInterval> | null = null;

export function registerTodayChannels(): void {
  const store = getTodayStore();

  registerHandler({
    channel: ipcChannels.todayGet,
    request: todayGetRequestSchema,
    response: todayGetResponseSchema,
    handler: () => store.get()
  });

  registerHandler({
    channel: ipcChannels.todaySubscribe,
    request: todaySubscribeRequestSchema,
    response: todaySubscribeResponseSchema,
    handler: () => undefined
  });

  store.subscribe((counters) => {
    broadcast(ipcChannels.todayChanged, todayChangedEventSchema, counters);
  });

  // Midnight rollover — checked every 60s + on app open (constructor already rolled once).
  midnightHandle = setInterval(() => store.rolloverIfNewDay(), 60_000);
}

export function stopTodayMidnightTimer(): void {
  if (midnightHandle) {
    clearInterval(midnightHandle);
    midnightHandle = null;
  }
}
