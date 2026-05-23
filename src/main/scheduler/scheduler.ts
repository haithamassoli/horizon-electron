import { EventEmitter } from 'node:events';
import type {
  DailySnoozeCounter,
  PauseDuration,
  PersistedScheduler,
  SchedulerEvent,
  SchedulerState,
  Settings,
  SnoozeCap,
  SnoozeRejectReason,
  SuppressionReason
} from '@shared/schemas';
import { getSettingsStore } from '../store/settings-store';
import { getSchedulerStore } from '../store/scheduler-store';

const MIN_MS = 60_000;
const PRE_WARNING_MS = 60_000;
const TICK_MS = 1_000;
const SNOOZE_DEFER_MS = 5 * MIN_MS;
const POST_SUPPRESSION_BUFFER_MS = 30_000;

interface SchedulerOptions {
  now?: () => number;
}

type Listener = (event: SchedulerEvent) => void;

export type SnoozeResult =
  | {
      accepted: true;
      newFireAt: number;
      deferMs: number;
      snoozesUsedThisSession: number;
      snoozesUsedToday: number;
    }
  | { accepted: false; reason: SnoozeRejectReason };

export class Scheduler {
  private readonly emitter = new EventEmitter();
  private readonly now: () => number;
  private state: SchedulerState;
  private preWarningFired = false;
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private settingsUnsubscribe: (() => void) | null = null;
  private currentSettings: Settings;
  private snoozesUsedThisSession = 0;
  private dailySnooze: DailySnoozeCounter;
  private suppressionBufferHandle: ReturnType<typeof setTimeout> | null = null;
  private idleEnteredAt: number | null = null;

  constructor(opts: SchedulerOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.currentSettings = getSettingsStore().get();

    const persisted = getSchedulerStore().get();
    this.dailySnooze = rolloverDailySnooze(persisted.dailySnooze, this.now());
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
    this.clearSuppressionBuffer();
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
    this.clearSuppressionBuffer();
    this.idleEnteredAt = null;
    this.update({
      lifecycle: 'paused',
      pausedUntil: until,
      nextBreakAt: null,
      suppressionReason: null,
      deferredBreak: false
    });
    this.preWarningFired = false;
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

  snooze(): SnoozeResult {
    const now = this.now();

    if (this.state.lifecycle !== 'running' || this.state.nextBreakAt === null) {
      this.emit({ type: 'snooze-rejected', at: now, payload: { reason: 'not-running' } });
      return { accepted: false, reason: 'not-running' };
    }

    this.rolloverIfNewDay(now);

    const sessionCap = this.currentSettings.snooze.perSessionCap;
    const dayCap = this.currentSettings.snooze.perDayCap;

    if (capReached(sessionCap, this.snoozesUsedThisSession)) {
      this.emit({ type: 'snooze-rejected', at: now, payload: { reason: 'cap-session' } });
      return { accepted: false, reason: 'cap-session' };
    }
    if (capReached(dayCap, this.dailySnooze.count)) {
      this.emit({ type: 'snooze-rejected', at: now, payload: { reason: 'cap-day' } });
      return { accepted: false, reason: 'cap-day' };
    }

    // Long-break collision: if the upcoming break is already long, snooze is a no-op on duration —
    // we defer but the consumed slot stays long. The "short" identity dissolves; counter unchanged.
    // No stacking — a single deferred slot, replaced not added.
    const newFireAt = now + SNOOZE_DEFER_MS;
    this.snoozesUsedThisSession += 1;
    this.dailySnooze = { date: this.dailySnooze.date, count: this.dailySnooze.count + 1 };

    this.update({
      nextBreakAt: newFireAt,
      snoozesUsedThisSession: this.snoozesUsedThisSession,
      snoozesUsedToday: this.dailySnooze.count
    });
    this.preWarningFired = false;

    this.emit({
      type: 'snooze-used',
      at: now,
      payload: {
        newFireAt,
        deferMs: SNOOZE_DEFER_MS,
        snoozesUsedThisSession: this.snoozesUsedThisSession,
        snoozesUsedToday: this.dailySnooze.count
      }
    });

    return {
      accepted: true,
      newFireAt,
      deferMs: SNOOZE_DEFER_MS,
      snoozesUsedThisSession: this.snoozesUsedThisSession,
      snoozesUsedToday: this.dailySnooze.count
    };
  }

  /**
   * Reset session counter — invoked by activity monitor (M5) on idle-resume.
   * Safe to call before M5 wires the trigger.
   */
  resetSessionSnoozes(): void {
    if (this.snoozesUsedThisSession === 0) return;
    this.snoozesUsedThisSession = 0;
    this.update({ snoozesUsedThisSession: 0 });
  }

  /**
   * Idle takes priority over user pause / suppression. Halts the timer, drops any deferred slot,
   * and emits `idle-detected`. The in-flight pre-warning closes via the lifecycle transition.
   */
  notifyIdleDetected(thresholdSeconds: number): void {
    if (this.state.lifecycle === 'idle') return;
    // Paused / outside-office-hours own their own exit conditions — don't clobber them.
    if (this.state.lifecycle === 'paused' || this.state.lifecycle === 'outside-office-hours') return;
    const now = this.now();
    this.idleEnteredAt = now;
    this.clearSuppressionBuffer();
    this.update({
      lifecycle: 'idle',
      nextBreakAt: null,
      suppressionReason: null,
      deferredBreak: false
    });
    this.preWarningFired = false;
    this.emit({
      type: 'idle-detected',
      at: now,
      payload: { idleThresholdSeconds: thresholdSeconds }
    });
  }

  /**
   * Activity resumed from idle. Resets the schedule from now and clears the session snooze count.
   * Does nothing if not currently idle (active-window noise should not nuke a paused / suppressed state).
   */
  notifyActivityResumed(): void {
    if (this.state.lifecycle !== 'idle') return;
    const now = this.now();
    const idleDurationMs = this.idleEnteredAt !== null ? Math.max(0, now - this.idleEnteredAt) : 0;
    this.idleEnteredAt = null;
    this.snoozesUsedThisSession = 0;
    this.update({
      lifecycle: 'running',
      nextBreakAt: now + this.intervalMs(),
      suppressionReason: null,
      deferredBreak: false,
      snoozesUsedThisSession: 0
    });
    this.preWarningFired = false;
    this.emit({
      type: 'activity-resumed',
      at: now,
      payload: { idleDurationMs }
    });
  }

  /**
   * Suppression OR'd from FullscreenMonitor + MeetingMonitor. Idle / paused take priority and ignore.
   * Single deferred-break slot — collapses repeated triggers.
   */
  notifySuppressionChanged(suppressed: boolean, reason: SuppressionReason | null): void {
    const now = this.now();

    if (suppressed) {
      if (!reason) return;
      if (this.state.lifecycle === 'idle' || this.state.lifecycle === 'paused') return;

      // Already suppressed — only update reason if changed (e.g., fullscreen → meeting overlap).
      if (this.state.lifecycle === 'suppressed') {
        if (this.state.suppressionReason !== reason) {
          this.update({ suppressionReason: reason });
          this.emit({
            type: 'suppression-changed',
            at: now,
            payload: { suppressed: true, reason }
          });
        }
        return;
      }

      // Capture whether a break was about to (or did) fire — collapse into deferredBreak slot.
      const wasNearBreak =
        this.preWarningFired ||
        (this.state.nextBreakAt !== null && this.state.nextBreakAt - now <= PRE_WARNING_MS);
      const deferredBreak = this.state.deferredBreak || wasNearBreak;
      const newlyDeferred = deferredBreak && !this.state.deferredBreak;
      const isLongBreak = this.state.isNextLong;

      this.clearSuppressionBuffer();
      this.update({
        lifecycle: 'suppressed',
        suppressionReason: reason,
        nextBreakAt: null,
        deferredBreak
      });
      this.preWarningFired = false;
      this.emit({
        type: 'suppression-changed',
        at: now,
        payload: { suppressed: true, reason }
      });
      if (newlyDeferred) {
        this.emit({
          type: 'break-deferred',
          at: now,
          payload: { reason, isLongBreak }
        });
      }
      return;
    }

    // Unsuppress — only acts if currently suppressed (idle / paused / outside-hours own their exits).
    if (this.state.lifecycle !== 'suppressed') return;

    this.clearSuppressionBuffer();
    const deferred = this.state.deferredBreak;

    if (deferred) {
      // Stay in suppressed UI label until the buffer expires? Spec is silent — promote to running
      // immediately so the popover stops saying "deferred". The pre-warning will appear after 30s.
      this.update({
        lifecycle: 'running',
        suppressionReason: null,
        nextBreakAt: null,
        deferredBreak: true
      });
      this.suppressionBufferHandle = setTimeout(() => this.fireDeferredBreak(), POST_SUPPRESSION_BUFFER_MS);
    } else {
      this.update({
        lifecycle: 'running',
        suppressionReason: null,
        nextBreakAt: this.now() + this.intervalMs(),
        deferredBreak: false
      });
      this.preWarningFired = false;
    }

    this.emit({
      type: 'suppression-changed',
      at: now,
      payload: { suppressed: false, reason: null }
    });
  }

  isSuppressed(): boolean {
    return this.state.lifecycle === 'suppressed';
  }

  // --- deferred break helpers ---

  private fireDeferredBreak(): void {
    this.suppressionBufferHandle = null;
    // Suppression / idle / pause may have flipped during the buffer — if so, drop the trigger;
    // the next state change will re-evaluate.
    if (this.state.lifecycle !== 'running' || !this.state.deferredBreak) return;
    const fireAt = this.now() + PRE_WARNING_MS;
    this.update({ nextBreakAt: fireAt, deferredBreak: false });
    this.preWarningFired = false;
    // tick() will emit `pre-warning-due` on the next interval and `break-due` at fireAt.
  }

  private clearSuppressionBuffer(): void {
    if (this.suppressionBufferHandle) {
      clearTimeout(this.suppressionBufferHandle);
      this.suppressionBufferHandle = null;
    }
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
        suppressionReason: null,
        snoozesUsedThisSession: 0,
        snoozesUsedToday: this.dailySnooze.count,
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
      suppressionReason: null,
      snoozesUsedThisSession: 0,
      snoozesUsedToday: this.dailySnooze.count,
      updatedAt: now
    };
  }

  private tick(): void {
    const now = this.now();
    this.rolloverIfNewDay(now);

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
      pausedUntil: this.state.pausedUntil,
      dailySnooze: this.dailySnooze
    });
  }

  private rolloverIfNewDay(now: number): void {
    const next = rolloverDailySnooze(this.dailySnooze, now);
    if (next.date !== this.dailySnooze.date) {
      this.dailySnooze = next;
      this.update({ snoozesUsedToday: 0 });
    }
  }
}

function rolloverDailySnooze(current: DailySnoozeCounter, now: number): DailySnoozeCounter {
  const today = localDateString(now);
  if (current.date === today) return current;
  return { date: today, count: 0 };
}

function localDateString(now: number): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function capReached(cap: SnoozeCap, used: number): boolean {
  if (cap === 'unlimited') return false;
  return used >= cap;
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
