import { z } from 'zod';

export const schedulerLifecycleSchema = z.enum([
  'running',
  'paused',
  'suppressed',
  'outside-office-hours'
]);

export type SchedulerLifecycle = z.infer<typeof schedulerLifecycleSchema>;

export const schedulerStateSchema = z.object({
  lifecycle: schedulerLifecycleSchema,
  nextBreakAt: z.number().nullable(),
  pausedUntil: z.number().nullable(),
  lastBreakAt: z.number().nullable(),
  longBreakCounter: z.number().int().min(0),
  isNextLong: z.boolean(),
  deferredBreak: z.boolean(),
  updatedAt: z.number()
});

export type SchedulerState = z.infer<typeof schedulerStateSchema>;

export const persistedSchedulerSchema = z.object({
  lastBreakAt: z.number().nullable(),
  longBreakCounter: z.number().int().min(0),
  pausedUntil: z.number().nullable()
});

export type PersistedScheduler = z.infer<typeof persistedSchedulerSchema>;

export const defaultPersistedScheduler: PersistedScheduler = {
  lastBreakAt: null,
  longBreakCounter: 0,
  pausedUntil: null
};

export const schedulerEventTypeSchema = z.enum([
  'state-changed',
  'pre-warning-due',
  'break-due',
  'pause-expired'
]);

export type SchedulerEventType = z.infer<typeof schedulerEventTypeSchema>;

export const preWarningPayloadSchema = z.object({
  isLongBreak: z.boolean(),
  fireAt: z.number()
});

export const breakDuePayloadSchema = z.object({
  isLongBreak: z.boolean(),
  durationMs: z.number().int().positive(),
  manual: z.boolean()
});

export const pauseExpiredPayloadSchema = z.object({
  pausedAt: z.number(),
  pausedUntil: z.number()
});

export const schedulerEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('state-changed'),
    at: z.number(),
    state: schedulerStateSchema
  }),
  z.object({
    type: z.literal('pre-warning-due'),
    at: z.number(),
    payload: preWarningPayloadSchema
  }),
  z.object({
    type: z.literal('break-due'),
    at: z.number(),
    payload: breakDuePayloadSchema
  }),
  z.object({
    type: z.literal('pause-expired'),
    at: z.number(),
    payload: pauseExpiredPayloadSchema
  })
]);

export type SchedulerEvent = z.infer<typeof schedulerEventSchema>;

export const pauseDurationSchema = z.enum(['15m', '30m', '1h', 'until-tomorrow']);
export type PauseDuration = z.infer<typeof pauseDurationSchema>;

export const trayActionSchema = z.enum([
  'pause-15m',
  'pause-30m',
  'pause-1h',
  'pause-until-tomorrow',
  'resume',
  'break-now',
  'skip-next',
  'open-settings',
  'quit'
]);

export type TrayAction = z.infer<typeof trayActionSchema>;
