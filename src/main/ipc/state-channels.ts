import { registerHandler, broadcast } from './registry';
import { getScheduler } from '../scheduler/scheduler';
import { getTodayStore } from '../store/today-store';
import {
  ipcChannels,
  stateGetRequestSchema,
  stateGetResponseSchema,
  stateSubscribeRequestSchema,
  stateSubscribeResponseSchema,
  stateChangedEventSchema,
  schedulerEventBroadcastSchema,
  trayActionRequestSchema,
  trayActionResponseSchema
} from '@shared/schemas';

export function registerStateChannels(): void {
  const scheduler = getScheduler();

  registerHandler({
    channel: ipcChannels.stateGet,
    request: stateGetRequestSchema,
    response: stateGetResponseSchema,
    handler: () => scheduler.getState()
  });

  registerHandler({
    channel: ipcChannels.stateSubscribe,
    request: stateSubscribeRequestSchema,
    response: stateSubscribeResponseSchema,
    handler: () => undefined
  });

  registerHandler({
    channel: ipcChannels.trayAction,
    request: trayActionRequestSchema,
    response: trayActionResponseSchema,
    handler: ({ action }) => {
      switch (action) {
        case 'pause-15m':
          scheduler.pause('15m');
          break;
        case 'pause-30m':
          scheduler.pause('30m');
          break;
        case 'pause-1h':
          scheduler.pause('1h');
          break;
        case 'pause-until-tomorrow':
          scheduler.pause('until-tomorrow');
          break;
        case 'resume':
          scheduler.resume();
          break;
        case 'break-now':
          scheduler.breakNow();
          break;
        case 'skip-next': {
          const before = scheduler.getState().longBreakCounter;
          scheduler.skipNext();
          if (scheduler.getState().longBreakCounter !== before) {
            getTodayStore().increment('breaksSkipped');
          }
          break;
        }
        case 'open-settings':
        case 'quit':
          // handled at the tray layer; no scheduler effect.
          break;
      }
      return scheduler.getState();
    }
  });

  scheduler.on((event) => {
    broadcast(ipcChannels.schedulerEvent, schedulerEventBroadcastSchema, event);
    if (event.type === 'state-changed') {
      broadcast(ipcChannels.stateChanged, stateChangedEventSchema, event.state);
    }
  });
}
