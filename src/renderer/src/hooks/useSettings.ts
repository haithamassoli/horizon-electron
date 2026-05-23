import { useEffect, useRef, useState } from 'react';
import type {
  Settings,
  EnforcementMode,
  SnoozeCap,
  Theme
} from '@shared/schemas';

type VisualAid = Settings['overlay']['visualAid'];
type AmbientAudio = Settings['overlay']['ambientAudio'];

interface SettingsState {
  settings: Settings | null;
  eventCount: number;
  lastEventAt: number | null;
  ready: boolean;
  error: string | null;
}

interface UseSettingsResult extends SettingsState {
  update: (mutate: (current: Settings) => Settings) => Promise<void>;
  setInterval: (minutes: number) => Promise<void>;
  setEnforcementMode: (mode: EnforcementMode) => Promise<void>;
  setBlinkEnabled: (enabled: boolean) => Promise<void>;
  setBlinkIntervalMinutes: (minutes: number) => Promise<void>;
  setShortDurationSeconds: (seconds: number) => Promise<void>;
  setLongCadence: (count: number) => Promise<void>;
  setLongDurationMinutes: (minutes: number) => Promise<void>;
  setSnoozePerSessionCap: (cap: SnoozeCap) => Promise<void>;
  setSnoozePerDayCap: (cap: SnoozeCap) => Promise<void>;
  setVisualAid: (aid: VisualAid) => Promise<void>;
  setAmbientAudio: (audio: AmbientAudio) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setAutoLaunch: (enabled: boolean) => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  const [state, setState] = useState<SettingsState>({
    settings: null,
    eventCount: 0,
    lastEventAt: null,
    ready: false,
    error: null
  });
  const latest = useRef<Settings | null>(null);

  useEffect(() => {
    let mounted = true;

    window.horizon.settings
      .get()
      .then((s) => {
        if (!mounted) return;
        latest.current = s;
        setState((prev) => ({ ...prev, settings: s, ready: true }));
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setState((prev) => ({ ...prev, error: err instanceof Error ? err.message : String(err) }));
      });

    const unsubscribe = window.horizon.settings.onChanged((s) => {
      latest.current = s;
      setState((prev) => ({
        ...prev,
        settings: s,
        eventCount: prev.eventCount + 1,
        lastEventAt: Date.now()
      }));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  async function update(mutate: (current: Settings) => Settings): Promise<void> {
    const current = latest.current;
    if (!current) return;
    const next = mutate(current);
    try {
      await window.horizon.settings.set(next);
    } catch (err) {
      setState((prev) => ({ ...prev, error: err instanceof Error ? err.message : String(err) }));
    }
  }

  return {
    ...state,
    update,
    setInterval: (minutes) =>
      update((s) => ({ ...s, breaks: { ...s.breaks, intervalMinutes: minutes } })),
    setEnforcementMode: (mode) => update((s) => ({ ...s, enforcementMode: mode })),
    setBlinkEnabled: (enabled) => update((s) => ({ ...s, blink: { ...s.blink, enabled } })),
    setBlinkIntervalMinutes: (minutes) =>
      update((s) => ({ ...s, blink: { ...s.blink, intervalMinutes: minutes } })),
    setShortDurationSeconds: (seconds) =>
      update((s) => ({ ...s, breaks: { ...s.breaks, shortDurationSeconds: seconds } })),
    setLongCadence: (count) =>
      update((s) => ({ ...s, breaks: { ...s.breaks, longCadence: count } })),
    setLongDurationMinutes: (minutes) =>
      update((s) => ({ ...s, breaks: { ...s.breaks, longDurationMinutes: minutes } })),
    setSnoozePerSessionCap: (cap) =>
      update((s) => ({ ...s, snooze: { ...s.snooze, perSessionCap: cap } })),
    setSnoozePerDayCap: (cap) =>
      update((s) => ({ ...s, snooze: { ...s.snooze, perDayCap: cap } })),
    setVisualAid: (aid) =>
      update((s) => ({ ...s, overlay: { ...s.overlay, visualAid: aid } })),
    setAmbientAudio: (audio) =>
      update((s) => ({ ...s, overlay: { ...s.overlay, ambientAudio: audio } })),
    setTheme: (theme) => update((s) => ({ ...s, general: { ...s.general, theme } })),
    setAutoLaunch: (enabled) =>
      update((s) => ({ ...s, general: { ...s.general, autoLaunch: enabled } }))
  };
}
