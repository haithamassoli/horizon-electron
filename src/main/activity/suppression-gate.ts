import { EventEmitter } from 'node:events';
import type { SuppressionReason } from '@shared/schemas';
import { FullscreenMonitor } from './fullscreen-monitor';
import { MeetingMonitor } from './meeting-monitor';

export type SuppressionGateEvent = 'suppression-changed';

export interface SuppressionState {
  suppressed: boolean;
  reason: SuppressionReason | null;
}

export interface SuppressionGateOptions {
  /**
   * Optional gate: when this returns true, the SuppressionGate suppresses its own emissions —
   * used to silence the gate while the overlay is up (the break is already happening, so
   * fullscreen/meeting transitions during the break are noise).
   */
  isQuiet?: () => boolean;
  fullscreen?: FullscreenMonitor;
  meeting?: MeetingMonitor;
}

/**
 * ORs FullscreenMonitor + MeetingMonitor into a single suppression signal. The reason field
 * surfaces "meeting active" / "fullscreen" in the tray popover — meeting wins when both are true
 * because it's the more user-meaningful label.
 */
export class SuppressionGate extends EventEmitter {
  private readonly fullscreen: FullscreenMonitor;
  private readonly meeting: MeetingMonitor;
  private readonly isQuiet: (() => boolean) | undefined;
  private current: SuppressionState = { suppressed: false, reason: null };
  private started = false;
  private fullscreenHandler: () => void;
  private meetingHandler: () => void;

  constructor(opts: SuppressionGateOptions = {}) {
    super();
    this.fullscreen = opts.fullscreen ?? new FullscreenMonitor();
    this.meeting = opts.meeting ?? new MeetingMonitor();
    this.isQuiet = opts.isQuiet;

    this.fullscreenHandler = () => this.recompute();
    this.meetingHandler = () => this.recompute();
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.fullscreen.on('fullscreen-active', this.fullscreenHandler);
    this.fullscreen.on('fullscreen-ended', this.fullscreenHandler);
    this.meeting.on('meeting-active', this.meetingHandler);
    this.meeting.on('meeting-ended', this.meetingHandler);

    await this.fullscreen.start();
    this.meeting.start();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.fullscreen.off('fullscreen-active', this.fullscreenHandler);
    this.fullscreen.off('fullscreen-ended', this.fullscreenHandler);
    this.meeting.off('meeting-active', this.meetingHandler);
    this.meeting.off('meeting-ended', this.meetingHandler);
    this.fullscreen.stop();
    this.meeting.stop();
    this.removeAllListeners();
  }

  setHighFrequency(high: boolean): void {
    this.fullscreen.setHighFrequency(high);
  }

  getState(): SuppressionState {
    return this.current;
  }

  private recompute(): void {
    if (this.isQuiet?.()) return;

    const meeting = this.meeting.isActive();
    const fullscreen = this.fullscreen.isActive();
    const next: SuppressionState = meeting
      ? { suppressed: true, reason: 'meeting' }
      : fullscreen
        ? { suppressed: true, reason: 'fullscreen' }
        : { suppressed: false, reason: null };

    if (
      next.suppressed === this.current.suppressed &&
      next.reason === this.current.reason
    ) {
      return;
    }
    this.current = next;
    const eventName: SuppressionGateEvent = 'suppression-changed';
    this.emit(eventName, next);
  }
}
