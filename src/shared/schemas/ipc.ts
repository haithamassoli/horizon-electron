import { z } from 'zod';
import { settingsSchema } from './settings';
import {
  schedulerEventSchema,
  schedulerStateSchema,
  trayActionSchema
} from './scheduler';
import {
  overlayInitPayloadSchema,
  overlaySkipRequestSchema,
  overlaySkipResponseSchema,
  overlaySnoozeRequestSchema,
  overlaySnoozeResponseSchema,
  overlayPanicRequestSchema,
  overlayPanicResponseSchema,
  overlayTickPayloadSchema,
  preWarningInitPayloadSchema,
  preWarningTickPayloadSchema
} from './overlay';

export const ipcChannels = {
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  settingsSubscribe: 'settings:subscribe',
  settingsChanged: 'settings:changed',

  stateGet: 'state:get',
  stateSubscribe: 'state:subscribe',
  stateChanged: 'state:changed',
  schedulerEvent: 'scheduler:event',

  trayAction: 'tray:action',

  popoverHide: 'popover:hide',

  overlayInit: 'overlay:init',
  overlayTick: 'overlay:tick',
  overlaySkip: 'overlay:skip',
  overlaySnooze: 'overlay:snooze',
  overlayPanic: 'overlay:panic',

  preWarningInit: 'pre-warning:init',
  preWarningTick: 'pre-warning:tick',
  preWarningDismiss: 'pre-warning:dismiss'
} as const;

export type IpcChannel = (typeof ipcChannels)[keyof typeof ipcChannels];

export const settingsGetRequestSchema = z.void();
export const settingsGetResponseSchema = settingsSchema;

export const settingsSetRequestSchema = settingsSchema;
export const settingsSetResponseSchema = settingsSchema;

export const settingsSubscribeRequestSchema = z.void();
export const settingsSubscribeResponseSchema = z.void();

export const settingsChangedEventSchema = settingsSchema;

export const stateGetRequestSchema = z.void();
export const stateGetResponseSchema = schedulerStateSchema;

export const stateSubscribeRequestSchema = z.void();
export const stateSubscribeResponseSchema = z.void();

export const stateChangedEventSchema = schedulerStateSchema;
export const schedulerEventBroadcastSchema = schedulerEventSchema;

export const trayActionRequestSchema = z.object({ action: trayActionSchema });
export const trayActionResponseSchema = schedulerStateSchema;

export const popoverHideRequestSchema = z.void();
export const popoverHideResponseSchema = z.void();

export const overlayInitRequestSchema = z.void();
export const overlayInitResponseSchema = overlayInitPayloadSchema;

export const overlayTickEventSchema = overlayTickPayloadSchema;

export const overlaySkipRequestIpcSchema = overlaySkipRequestSchema;
export const overlaySkipResponseIpcSchema = overlaySkipResponseSchema;

export const overlaySnoozeRequestIpcSchema = overlaySnoozeRequestSchema;
export const overlaySnoozeResponseIpcSchema = overlaySnoozeResponseSchema;

export const overlayPanicRequestIpcSchema = overlayPanicRequestSchema;
export const overlayPanicResponseIpcSchema = overlayPanicResponseSchema;

export const preWarningInitRequestSchema = z.void();
export const preWarningInitResponseSchema = preWarningInitPayloadSchema;

export const preWarningTickEventSchema = preWarningTickPayloadSchema;

export const preWarningDismissRequestSchema = z.void();
export const preWarningDismissResponseSchema = z.void();

export type SettingsGetRequest = z.infer<typeof settingsGetRequestSchema>;
export type SettingsGetResponse = z.infer<typeof settingsGetResponseSchema>;
export type SettingsSetRequest = z.infer<typeof settingsSetRequestSchema>;
export type SettingsSetResponse = z.infer<typeof settingsSetResponseSchema>;
export type SettingsChangedEvent = z.infer<typeof settingsChangedEventSchema>;

export type StateGetResponse = z.infer<typeof stateGetResponseSchema>;
export type TrayActionRequest = z.infer<typeof trayActionRequestSchema>;

export const ipcErrorSchema = z.object({
  code: z.enum(['validation_error', 'handler_error', 'unknown_channel']),
  message: z.string(),
  details: z.unknown().optional()
});

export type IpcError = z.infer<typeof ipcErrorSchema>;
