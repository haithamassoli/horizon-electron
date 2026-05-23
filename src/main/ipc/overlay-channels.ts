import { registerHandler } from './registry';
import {
  ipcChannels,
  overlayInitRequestSchema,
  overlayInitResponseSchema,
  overlaySkipRequestIpcSchema,
  overlaySkipResponseIpcSchema,
  overlaySnoozeRequestIpcSchema,
  overlaySnoozeResponseIpcSchema,
  overlayPanicRequestIpcSchema,
  overlayPanicResponseIpcSchema,
  preWarningInitRequestSchema,
  preWarningInitResponseSchema,
  preWarningDismissRequestSchema,
  preWarningDismissResponseSchema
} from '@shared/schemas';
import {
  getOverlayInitPayload,
  requestOverlayPanic,
  requestOverlaySkip,
  requestOverlaySnooze
} from '../windows/overlay-manager';
import {
  dismissPreWarningFromRenderer,
  getPreWarningInitPayload
} from '../windows/pre-warning-window';

export function registerOverlayChannels(): void {
  registerHandler({
    channel: ipcChannels.overlayInit,
    request: overlayInitRequestSchema,
    response: overlayInitResponseSchema,
    handler: (_req, event) => {
      const payload = getOverlayInitPayload(event.sender.id);
      if (!payload) {
        throw new Error('No active overlay session for this renderer');
      }
      return payload;
    }
  });

  registerHandler({
    channel: ipcChannels.overlaySkip,
    request: overlaySkipRequestIpcSchema,
    response: overlaySkipResponseIpcSchema,
    handler: ({ sessionId }) => ({ accepted: requestOverlaySkip(sessionId) })
  });

  registerHandler({
    channel: ipcChannels.overlaySnooze,
    request: overlaySnoozeRequestIpcSchema,
    response: overlaySnoozeResponseIpcSchema,
    handler: ({ sessionId }) => requestOverlaySnooze(sessionId)
  });

  registerHandler({
    channel: ipcChannels.overlayPanic,
    request: overlayPanicRequestIpcSchema,
    response: overlayPanicResponseIpcSchema,
    handler: ({ sessionId }) => ({ accepted: requestOverlayPanic(sessionId) })
  });

  registerHandler({
    channel: ipcChannels.preWarningInit,
    request: preWarningInitRequestSchema,
    response: preWarningInitResponseSchema,
    handler: () => {
      const payload = getPreWarningInitPayload();
      if (!payload) {
        throw new Error('No active pre-warning toast');
      }
      return payload;
    }
  });

  registerHandler({
    channel: ipcChannels.preWarningDismiss,
    request: preWarningDismissRequestSchema,
    response: preWarningDismissResponseSchema,
    handler: () => {
      dismissPreWarningFromRenderer();
      return undefined;
    }
  });
}
