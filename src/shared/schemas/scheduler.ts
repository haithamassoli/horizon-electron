import { z } from 'zod';

export const schedulerLifecycleSchema = z.enum([
  'running',
  'paused',
  'idle',
  'suppressed',
  'outside-office-hours'
]);

export type SchedulerLifecycle = z.infer<typeof schedulerLifecycleSchema>;

export const suppressionReasonSchema = z.enum(['fullscreen', 'meeting']);
export type SuppressionReason = z.infer<typeof suppressionReasonSchema>;

export const schedulerStateSchema = z.object({
  lifecycle: schedulerLifecycleSchema,
  nextBreakAt: z.number().nullable(),
  pausedUntil: z.number().nullable(),
  lastBreakAt: z.number().nullable(),
  longBreakCounter: z.number().int().min(0),
  isNextLong: z.boolean(),
  deferredBreak: z.boolean(),
  suppressionReason: suppressionReasonSchema.nullable(),
  snoozesUsedThisSession: z.number().int().min(0),
  snoozesUsedToday: z.number().int().min(0),
  updatedAt: z.number()
});

export type SchedulerState = z.infer<typeof schedulerStateSchema>;

export const dailySnoozeCounterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  count: z.number().int().min(0)
});

export type DailySnoozeCounter = z.infer<typeof dailySnoozeCounterSchema>;

export const persistedSchedulerSchema = z.object({
  lastBreakAt: z.number().nullable(),
  longBreakCounter: z.number().int().min(0),
  pausedUntil: z.number().nullable(),
  dailySnooze: dailySnoozeCounterSchema
});

export type PersistedScheduler = z.infer<typeof persistedSchedulerSchema>;

export const defaultPersistedScheduler: PersistedScheduler = {
  lastBreakAt: null,
  longBreakCounter: 0,
  pausedUntil: null,
  dailySnooze: { date: '1970-01-01', count: 0 }
};

export const schedulerEventTypeSchema = z.enum([
  'state-changed',
  'pre-warning-due',
  'break-due',
  'pause-expired',
  'snooze-used',
  'snooze-rejected',
  'idle-detected',
  'activity-resumed',
  'suppression-changed',
  'break-deferred'
]);

export const snoozeRejectReasonSchema = z.enum([
  'cap-session',
  'cap-day',
  'not-running',
  'long-break-collision'
]);

export type SnoozeRejectReason = z.infer<typeof snoozeRejectReasonSchema>;

export const snoozeUsedPayloadSchema = z.object({
  newFireAt: z.number(),
  deferMs: z.number().int().positive(),
  snoozesUsedThisSession: z.number().int().min(0),
  snoozesUsedToday: z.number().int().min(0)
});

export const snoozeRejectedPayloadSchema = z.object({
  reason: snoozeRejectReasonSchema
});

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

export const idleDetectedPayloadSchema = z.object({
  idleThresholdSeconds: z.number().int().positive()
});

export const activityResumedPayloadSchema = z.object({
  idleDurationMs: z.number().int().nonnegative()
});

export const suppressionChangedPayloadSchema = z.object({
  suppressed: z.boolean(),
  reason: suppressionReasonSchema.nullable()
});

export const breakDeferredPayloadSchema = z.object({
  reason: suppressionReasonSchema,
  isLongBreak: z.boolean()
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
  }),
  z.object({
    type: z.literal('snooze-used'),
    at: z.number(),
    payload: snoozeUsedPayloadSchema
  }),
  z.object({
    type: z.literal('snooze-rejected'),
    at: z.number(),
    payload: snoozeRejectedPayloadSchema
  }),
  z.object({
    type: z.literal('idle-detected'),
    at: z.number(),
    payload: idleDetectedPayloadSchema
  }),
  z.object({
    type: z.literal('activity-resumed'),
    at: z.number(),
    payload: activityResumedPayloadSchema
  }),
  z.object({
    type: z.literal('suppression-changed'),
    at: z.number(),
    payload: suppressionChangedPayloadSchema
  }),
  z.object({
    type: z.literal('break-deferred'),
    at: z.number(),
    payload: breakDeferredPayloadSchema
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
