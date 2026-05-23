import { EventEmitter } from 'node:events';
import { powerMonitor } from 'electron';

const POLL_MS = 30_000;
const DEFAULT_THRESHOLD_SECONDS = 5 * 60;

export type IdleState = 'active' | 'idle';

export type IdleMonitorEvent = 'idle-detected' | 'activity-resumed';

export class IdleMonitor extends EventEmitter {
  private readonly thresholdSeconds: number;
  private readonly pollMs: number;
  private currentState: IdleState = 'active';
  private timer: ReturnType<typeof setInterval> | null = null;
  private suspendHandler: (() => void) | null = null;
  private resumeHandler: (() => void) | null = null;

  constructor(opts: { thresholdSeconds?: number; pollMs?: number } = {}) {
    super();
    this.thresholdSeconds = opts.thresholdSeconds ?? DEFAULT_THRESHOLD_SECONDS;
    this.pollMs = opts.pollMs ?? POLL_MS;
  }

  getThresholdSeconds(): number {
    return this.thresholdSeconds;
  }

  getState(): IdleState {
    return this.currentState;
  }

  start(): void {
    if (this.timer) return;
    this.poll();
    this.timer = setInterval(() => this.poll(), this.pollMs);

    // System sleep is functionally idle — fast-path to idle without waiting for the next poll.
    this.suspendHandler = () => this.transition('idle');
    this.resumeHandler = () => {
      // Don't snap to active immediately — the OS may still report idle for a few ms after wake.
      this.poll();
    };
    powerMonitor.on('suspend', this.suspendHandler);
    powerMonitor.on('resume', this.resumeHandler);
    powerMonitor.on('lock-screen', this.suspendHandler);
    powerMonitor.on('unlock-screen', this.resumeHandler);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.suspendHandler) {
      powerMonitor.removeListener('suspend', this.suspendHandler);
      powerMonitor.removeListener('lock-screen', this.suspendHandler);
      this.suspendHandler = null;
    }
    if (this.resumeHandler) {
      powerMonitor.removeListener('resume', this.resumeHandler);
      powerMonitor.removeListener('unlock-screen', this.resumeHandler);
      this.resumeHandler = null;
    }
    this.removeAllListeners();
  }

  private poll(): void {
    try {
      const sysState = powerMonitor.getSystemIdleState(this.thresholdSeconds);
      // 'locked' counts as idle; 'unknown' is treated as active (fail-open — never withhold breaks
      // due to an unknown idle signal).
      const next: IdleState = sysState === 'idle' || sysState === 'locked' ? 'idle' : 'active';
      this.transition(next);
    } catch (err) {
      console.warn('[idle-monitor] poll failed, assuming active', err);
      this.transition('active');
    }
  }

  private transition(next: IdleState): void {
    if (next === this.currentState) return;
    this.currentState = next;
    const eventName: IdleMonitorEvent = next === 'idle' ? 'idle-detected' : 'activity-resumed';
    this.emit(eventName);
  }
}
