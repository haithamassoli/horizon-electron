import { EventEmitter } from 'node:events';
import type { Settings } from '@shared/schemas';
import { getSettingsStore } from '../store/settings-store';

const MIN_MS = 60_000;

export type BlinkSchedulerEvent = 'blink-due';

export interface BlinkSchedulerOptions {
  /**
   * Suppression gate. Returning true causes the tick to silent-skip (no queue, no defer).
   * Wired in `main/blink/index.ts` to OR scheduler-pause / idle / outside-office-hours /
   * SuppressionGate / active break overlay.
   */
  shouldSuppress?: () => boolean;
  now?: () => number;
}

/**
 * Independent timer from the break Scheduler. Fires `blink-due` every `blink.intervalMinutes`
 * unless the suppress gate says otherwise. Silent skips do NOT shorten the next interval —
 * they're invisible to the user and to the schedule itself.
 */
export class BlinkScheduler extends EventEmitter {
  private readonly now: () => number;
  private readonly shouldSuppress: () => boolean;
  private handle: ReturnType<typeof setTimeout> | null = null;
  private settings: Settings;
  private unsubscribeSettings: (() => void) | null = null;
  private started = false;

  constructor(opts: BlinkSchedulerOptions = {}) {
    super();
    this.now = opts.now ?? Date.now;
    this.shouldSuppress = opts.shouldSuppress ?? (() => false);
    this.settings = getSettingsStore().get();
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.unsubscribeSettings = getSettingsStore().subscribe((s) => this.handleSettingsChange(s));
    this.armNext();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.clearTimer();
    this.unsubscribeSettings?.();
    this.unsubscribeSettings = null;
    this.removeAllListeners();
  }

  /**
   * Visible for tests + dev panels — true if a timer is pending.
   */
  isArmed(): boolean {
    return this.handle !== null;
  }

  private handleSettingsChange(next: Settings): void {
    const prev = this.settings;
    this.settings = next;
    const intervalChanged = prev.blink.intervalMinutes !== next.blink.intervalMinutes;
    const enabledChanged = prev.blink.enabled !== next.blink.enabled;
    if (!intervalChanged && !enabledChanged) return;

    this.clearTimer();
    if (this.started) this.armNext();
  }

  private armNext(): void {
    if (!this.started) return;
    if (!this.settings.blink.enabled) return;
    const delay = this.settings.blink.intervalMinutes * MIN_MS;
    this.handle = setTimeout(() => this.tick(), delay);
  }

  private tick(): void {
    this.handle = null;
    if (!this.started || !this.settings.blink.enabled) return;

    if (!this.shouldSuppress()) {
      this.emit('blink-due', { at: this.now() });
    }
    // Silent skip OR successful fire: always re-arm with full interval. Suppression doesn't
    // collapse cadence — the next pulse arrives on the regular beat.
    this.armNext();
  }

  private clearTimer(): void {
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = null;
    }
  }
}

