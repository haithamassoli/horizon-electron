import { EventEmitter } from 'node:events';
import type {
  PauseDuration,
  PersistedScheduler,
  SchedulerEvent,
  SchedulerState,
  Settings
} from '@shared/schemas';
import { getSettingsStore } from '../store/settings-store';
import { getSchedulerStore } from '../store/scheduler-store';

const MIN_MS = 60_000;
const PRE_WARNING_MS = 60_000;
const TICK_MS = 1_000;

interface SchedulerOptions {
  now?: () => number;
}

type Listener = (event: SchedulerEvent) => void;

export class Scheduler {
  private readonly emitter = new EventEmitter();
  private readonly now: () => number;
  private state: SchedulerState;
  private preWarningFired = false;
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private settingsUnsubscribe: (() => void) | null = null;
  private currentSettings: Settings;

  constructor(opts: SchedulerOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.currentSettings = getSettingsStore().get();

    const persisted = getSchedulerStore().get();
    this.state = this.computeInitialState(persisted);
    this.persist();
  }

  start(): void {
    if (this.tickHandle) return;
    this.tickHandle = setInterval(() => this.tick(), TICK_MS);
    this.settingsUnsubscribe = getSettingsStore().subscribe((s) => this.handleSettingsChange(s));
    this.broadcastState();
  }

  stop(): void {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
    this.settingsUnsubscribe?.();
    this.settingsUnsubscribe = null;
    this.emitter.removeAllListeners();
  }

  getState(): SchedulerState {
    return this.state;
  }

  on(listener: Listener): () => void {
    this.emitter.on('event', listener);
    return () => this.emitter.off('event', listener);
  }

  pause(duration: PauseDuration): void {
    const now = this.now();
    const until = computePauseUntil(now, duration);
    this.update({
      lifecycle: 'paused',
      pausedUntil: until,
      nextBreakAt: null
    });
  }

  resume(): void {
    if (this.state.lifecycle !== 'paused') return;
    const now = this.now();
    const wasUntil = this.state.pausedUntil;
    this.update({
      lifecycle: 'running',
      pausedUntil: null,
      nextBreakAt: now + this.intervalMs()
    });
    if (wasUntil !== null) {
      this.emit({
        type: 'pause-expired',
        at: now,
        payload: { pausedAt: now, pausedUntil: wasUntil }
      });
    }
    this.preWarningFired = false;
  }

  breakNow(): void {
    if (this.state.lifecycle !== 'running') return;
    const now = this.now();
    this.fireBreak(now, true);
  }

  skipNext(): void {
    if (this.state.lifecycle !== 'running') return;
    const now = this.now();
    const counter = this.state.longBreakCounter + 1;
    const isNextLong = (counter + 1) % this.currentSettings.breaks.longCadence === 0;
    this.update({
      longBreakCounter: counter,
      lastBreakAt: now,
      nextBreakAt: now + this.intervalMs(),
      isNextLong
    });
    this.preWarningFired = false;
  }

  // --- internals ---

  private computeInitialState(persisted: PersistedScheduler): SchedulerState {
    const now = this.now();
    const interval = this.intervalMs();
    const isNextLong = (persisted.longBreakCounter + 1) % this.currentSettings.breaks.longCadence === 0;

    if (persisted.pausedUntil !== null && persisted.pausedUntil > now) {
      return {
        lifecycle: 'paused',
        nextBreakAt: null,
        pausedUntil: persisted.pausedUntil,
        lastBreakAt: persisted.lastBreakAt,
        longBreakCounter: persisted.longBreakCounter,
        isNextLong,
        deferredBreak: false,
        updatedAt: now
      };
    }

    const candidate = persisted.lastBreakAt !== null ? persisted.lastBreakAt + interval : null;
    const nextBreakAt = candidate !== null && candidate > now ? candidate : now + interval;

    return {
      lifecycle: 'running',
      nextBreakAt,
      pausedUntil: null,
      lastBreakAt: persisted.lastBreakAt,
      longBreakCounter: persisted.longBreakCounter,
      isNextLong,
      deferredBreak: false,
      updatedAt: now
    };
  }

  private tick(): void {
    const now = this.now();

    if (this.state.lifecycle === 'paused') {
      if (this.state.pausedUntil !== null && now >= this.state.pausedUntil) {
        const wasUntil = this.state.pausedUntil;
        this.update({
          lifecycle: 'running',
          pausedUntil: null,
          nextBreakAt: now + this.intervalMs()
        });
        this.emit({
          type: 'pause-expired',
          at: now,
          payload: { pausedAt: now, pausedUntil: wasUntil }
        });
      }
      return;
    }

    if (this.state.lifecycle !== 'running' || this.state.nextBreakAt === null) return;

    const remaining = this.state.nextBreakAt - now;

    if (!this.preWarningFired && remaining <= PRE_WARNING_MS && remaining > 0) {
      this.preWarningFired = true;
      this.emit({
        type: 'pre-warning-due',
        at: now,
        payload: { isLongBreak: this.state.isNextLong, fireAt: this.state.nextBreakAt }
      });
    }

    if (remaining <= 0) {
      this.fireBreak(now, false);
    }
  }

  private fireBreak(now: number, manual: boolean): void {
    const isLong = this.state.isNextLong;
    const durationMs = isLong
      ? this.currentSettings.breaks.longDurationMinutes * MIN_MS
      : this.currentSettings.breaks.shortDurationSeconds * 1_000;

    const counter = this.state.longBreakCounter + 1;
    const isNextLong = (counter + 1) % this.currentSettings.breaks.longCadence === 0;

    this.update({
      lastBreakAt: now,
      longBreakCounter: counter,
      nextBreakAt: now + this.intervalMs(),
      isNextLong
    });
    this.preWarningFired = false;

    this.emit({
      type: 'break-due',
      at: now,
      payload: { isLongBreak: isLong, durationMs, manual }
    });
  }

  private handleSettingsChange(next: Settings): void {
    const prev = this.currentSettings;
    this.currentSettings = next;
    if (prev.breaks.intervalMinutes !== next.breaks.intervalMinutes && this.state.lifecycle === 'running') {
      const now = this.now();
      this.update({ nextBreakAt: now + this.intervalMs() });
      this.preWarningFired = false;
    }
    const isNextLong = (this.state.longBreakCounter + 1) % next.breaks.longCadence === 0;
    if (isNextLong !== this.state.isNextLong) {
      this.update({ isNextLong });
    }
  }

  private intervalMs(): number {
    return this.currentSettings.breaks.intervalMinutes * MIN_MS;
  }

  private update(patch: Partial<SchedulerState>): void {
    this.state = { ...this.state, ...patch, updatedAt: this.now() };
    this.persist();
    this.broadcastState();
  }

  private broadcastState(): void {
    this.emit({ type: 'state-changed', at: this.now(), state: this.state });
  }

  private emit(event: SchedulerEvent): void {
    this.emitter.emit('event', event);
  }

  private persist(): void {
    getSchedulerStore().set({
      lastBreakAt: this.state.lastBreakAt,
      longBreakCounter: this.state.longBreakCounter,
      pausedUntil: this.state.pausedUntil
    });
  }
}

function computePauseUntil(now: number, duration: PauseDuration): number {
  switch (duration) {
    case '15m':
      return now + 15 * MIN_MS;
    case '30m':
      return now + 30 * MIN_MS;
    case '1h':
      return now + 60 * MIN_MS;
    case 'until-tomorrow': {
      const d = new Date(now);
      d.setHours(24, 1, 0, 0);
      return d.getTime();
    }
  }
}

let instance: Scheduler | undefined;

export function getScheduler(): Scheduler {
  if (!instance) instance = new Scheduler();
  return instance;
}
