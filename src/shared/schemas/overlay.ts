import { z } from 'zod';
import { enforcementModeSchema, visualAidSchema } from './settings';

export const overlayRoleSchema = z.enum(['primary', 'secondary']);
export type OverlayRole = z.infer<typeof overlayRoleSchema>;

export const overlayPhaseSchema = z.enum(['active', 'closing']);
export type OverlayPhase = z.infer<typeof overlayPhaseSchema>;

export const overlayInitPayloadSchema = z.object({
  sessionId: z.string(),
  role: overlayRoleSchema,
  mode: enforcementModeSchema,
  isLongBreak: z.boolean(),
  durationMs: z.number().int().positive(),
  startedAt: z.number().int(),
  visualAid: visualAidSchema
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
