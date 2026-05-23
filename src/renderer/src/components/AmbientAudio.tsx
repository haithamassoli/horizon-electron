import { useEffect, useRef } from 'react';
import type { Settings, AudioTrack } from '@shared/schemas';

interface AmbientAudioProps {
  track: Settings['overlay']['ambientAudio'];
  durationMs: number;
  startedAt: number;
  closing: boolean;
}

const PEAK_VOLUME = 0.55;
const FADE_MS = 1_000;
const RAMP_HZ = 60;

/**
 * Plays the selected ambient track during a break overlay.
 *
 * - Resolves the file URL via the main process (which knows the packaged vs dev path).
 * - Fades in over FADE_MS at start, fades out over FADE_MS when `closing` flips true
 *   or `FADE_MS` before the natural end of the break.
 * - Loops by default — tracks are at least 3 min, longer than any break duration in v1.
 * - Render-only: no UI. Silent when track is `off` or the file is unbundled.
 */
export function AmbientAudio({ track, durationMs, startedAt, closing }: AmbientAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeHandle = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeOutFiredAt = useRef<number | null>(null);

  // Mount: load + fade in. Track change inside a single overlay is unsupported (overlay
  // tears down on close); useEffect keys off track to be defensive against React reruns.
  useEffect(() => {
    if (track === 'off') return;
    let cancelled = false;
    let el: HTMLAudioElement | null = null;

    void window.horizon.audio
      .getSrc(track as AudioTrack)
      .then(({ url }) => {
        if (cancelled || !url) return;
        el = new Audio(url);
        el.loop = true;
        el.volume = 0;
        audioRef.current = el;
        void el.play().catch(() => {
          /* autoplay blocked — overlay focuses on mount so this is rare */
        });
        rampVolume(el, 0, PEAK_VOLUME, FADE_MS);
      })
      .catch(() => {
        /* missing file — silent */
      });

    return () => {
      cancelled = true;
      if (fadeHandle.current) {
        clearInterval(fadeHandle.current);
        fadeHandle.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [track]);

  // Fade out 1s before the natural end of the break.
  useEffect(() => {
    if (track === 'off') return;
    const endAt = startedAt + durationMs;
    const fadeAt = endAt - FADE_MS;
    const delay = Math.max(0, fadeAt - Date.now());
    const handle = window.setTimeout(() => {
      const el = audioRef.current;
      if (!el || fadeOutFiredAt.current !== null) return;
      fadeOutFiredAt.current = Date.now();
      rampVolume(el, el.volume, 0, FADE_MS);
    }, delay);
    return () => window.clearTimeout(handle);
  }, [track, durationMs, startedAt]);

  // Skip / snooze / panic — fade immediately when closing flips.
  useEffect(() => {
    if (!closing) return;
    const el = audioRef.current;
    if (!el || fadeOutFiredAt.current !== null) return;
    fadeOutFiredAt.current = Date.now();
    rampVolume(el, el.volume, 0, FADE_MS);
  }, [closing]);

  return null;

  function rampVolume(el: HTMLAudioElement, from: number, to: number, durMs: number): void {
    if (fadeHandle.current) {
      clearInterval(fadeHandle.current);
      fadeHandle.current = null;
    }
    const start = Date.now();
    const step = 1000 / RAMP_HZ;
    fadeHandle.current = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / durMs);
      const v = from + (to - from) * t;
      el.volume = Math.max(0, Math.min(1, v));
      if (t >= 1) {
        if (fadeHandle.current) {
          clearInterval(fadeHandle.current);
          fadeHandle.current = null;
        }
      }
    }, step);
  }
}
