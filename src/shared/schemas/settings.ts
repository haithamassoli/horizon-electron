import { z } from 'zod';

const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm');

const snoozeCapSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(5),
  z.literal(10),
  z.literal('unlimited')
]);

export const breaksSettingsSchema = z.object({
  intervalMinutes: z.number().int().min(5).max(60),
  shortDurationSeconds: z.number().int().min(15).max(120),
  longCadence: z.number().int().min(2).max(10),
  longDurationMinutes: z.number().int().min(1).max(10)
});

export const enforcementModeSchema = z.enum(['casual', 'balanced', 'hardcore']);

export const snoozeSettingsSchema = z.object({
  perSessionCap: snoozeCapSchema,
  perDayCap: snoozeCapSchema
});

export const blinkSettingsSchema = z.object({
  enabled: z.boolean(),
  intervalMinutes: z.number().int().min(5).max(30)
});

export const visualAidSchema = z.enum(['breathing', 'twenty-twenty-twenty', 'none']);
export const ambientAudioSchema = z.enum(['off', 'rain', 'fire', 'lightning']);

export const overlaySettingsSchema = z.object({
  visualAid: visualAidSchema,
  ambientAudio: ambientAudioSchema
});

export const officeHoursSettingsSchema = z.object({
  enabled: z.boolean(),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  activeDays: z.array(z.number().int().min(0).max(6)).max(7)
});

export const themeSchema = z.enum(['system', 'light', 'dark']);

export const generalSettingsSchema = z.object({
  autoLaunch: z.boolean(),
  theme: themeSchema
});

export const settingsSchema = z.object({
  breaks: breaksSettingsSchema,
  enforcementMode: enforcementModeSchema,
  snooze: snoozeSettingsSchema,
  blink: blinkSettingsSchema,
  overlay: overlaySettingsSchema,
  officeHours: officeHoursSettingsSchema,
  general: generalSettingsSchema,
  firstLaunchComplete: z.boolean()
});

export type Settings = z.infer<typeof settingsSchema>;
export type EnforcementMode = z.infer<typeof enforcementModeSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type SnoozeCap = z.infer<typeof snoozeCapSchema>;

export const defaultSettings: Settings = {
  breaks: {
    intervalMinutes: 20,
    shortDurationSeconds: 30,
    longCadence: 4,
    longDurationMinutes: 3
  },
  enforcementMode: 'balanced',
  snooze: {
    perSessionCap: 'unlimited',
    perDayCap: 'unlimited'
  },
  blink: {
    enabled: true,
    intervalMinutes: 5
  },
  overlay: {
    visualAid: 'breathing',
    ambientAudio: 'off'
  },
  officeHours: {
    enabled: false,
    startTime: '09:00',
    endTime: '18:00',
    activeDays: [1, 2, 3, 4, 5]
  },
  general: {
    autoLaunch: true,
    theme: 'system'
  },
  firstLaunchComplete: false
};
