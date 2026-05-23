import { z } from 'zod';
import { ambientAudioSchema, enforcementModeSchema, visualAidSchema } from './settings';

export const overlayRoleSchema = z.enum(['primary', 'secondary']);
export type OverlayRole = z.infer<typeof overlayRoleSchema>;

export const overlayPhaseSchema = z.enum(['active', 'closing']);
export type OverlayPhase = z.infer<typeof overlayPhaseSchema>;

export const snoozeCapsSchema = z.object({
  perSessionRemaining: z.union([z.number().int().min(0), z.literal('unlimited')]),
  perDayRemaining: z.union([z.number().int().min(0), z.literal('unlimited')])
});

export type SnoozeCaps = z.infer<typeof snoozeCapsSchema>;

export const overlayInitPayloadSchema = z.object({
  sessionId: z.string(),
  role: overlayRoleSchema,
  mode: enforcementModeSchema,
  isLongBreak: z.boolean(),
  durationMs: z.number().int().positive(),
  startedAt: z.number().int(),
  visualAid: visualAidSchema,
  ambientAudio: ambientAudioSchema,
  snoozeCaps: snoozeCapsSchema,
  balancedLockoutMs: z.number().int().nonnegative()
});

export type OverlayInitPayload = z.infer<typeof overlayInitPayloadSchema>;

export const overlayTickPayloadSchema = z.object({
  sessionId: z.string(),
  remainingMs: z.number().int().nonnegative(),
  elapsedMs: z.number().int().nonnegative(),
  phase: overlayPhaseSchema
});

export type OverlayTickPayload = z.infer<typeof overlayTickPayloadSchema>;

export const overlaySkipRequestSchema = z.object({
  sessionId: z.string()
});

export type OverlaySkipRequest = z.infer<typeof overlaySkipRequestSchema>;

export const overlaySkipResponseSchema = z.object({
  accepted: z.boolean()
});

export type OverlaySkipResponse = z.infer<typeof overlaySkipResponseSchema>;

export const overlaySnoozeRequestSchema = z.object({
  sessionId: z.string()
});

export type OverlaySnoozeRequest = z.infer<typeof overlaySnoozeRequestSchema>;

export const overlaySnoozeResponseSchema = z.discriminatedUnion('accepted', [
  z.object({
    accepted: z.literal(true),
    newFireAt: z.number(),
    deferMs: z.number().int().positive(),
    snoozeCaps: snoozeCapsSchema
  }),
  z.object({
    accepted: z.literal(false),
    reason: z.enum(['cap-session', 'cap-day', 'not-running', 'mode-disallowed', 'no-session', 'long-break-collision'])
  })
]);

export type OverlaySnoozeResponse = z.infer<typeof overlaySnoozeResponseSchema>;

export const overlayPanicRequestSchema = z.object({
  sessionId: z.string()
});

export type OverlayPanicRequest = z.infer<typeof overlayPanicRequestSchema>;

export const overlayPanicResponseSchema = z.object({
  accepted: z.boolean()
});

export type OverlayPanicResponse = z.infer<typeof overlayPanicResponseSchema>;

// Pre-break warning toast contracts.

export const preWarningInitPayloadSchema = z.object({
  sessionId: z.string(),
  fireAt: z.number().int(),
  isLongBreak: z.boolean()
});

export type PreWarningInitPayload = z.infer<typeof preWarningInitPayloadSchema>;

export const preWarningTickPayloadSchema = z.object({
  sessionId: z.string(),
  remainingMs: z.number().int().nonnegative()
});

export type PreWarningTickPayload = z.infer<typeof preWarningTickPayloadSchema>;
