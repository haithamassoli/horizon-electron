import { EventEmitter } from 'node:events';
import { BrowserWindow, screen, type Rectangle } from 'electron';
import type activeWindowTypes from 'active-win';

type ActiveWinModule = typeof activeWindowTypes;

const NORMAL_POLL_MS = 5_000;
const FAST_POLL_MS = 1_000;
// Some apps leave 1–2px gaps; treat near-display-size as fullscreen.
const BOUNDS_TOLERANCE_PX = 4;

export type FullscreenMonitorEvent = 'fullscreen-active' | 'fullscreen-ended';

export class FullscreenMonitor extends EventEmitter {
  private active = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private polling = false;
  private currentInterval = NORMAL_POLL_MS;
  private highFrequency = false;
  private disabled = false;
  private activeWin: ActiveWinModule | null = null;

  async start(): Promise<void> {
    if (this.timer || this.disabled) return;
    try {
      // Dynamic import keeps the native dep failure isolated — fail-open if it can't load.
      const mod = (await import('active-win')) as unknown as { default?: ActiveWinModule } & ActiveWinModule;
      this.activeWin = (mod.default ?? mod) as ActiveWinModule;
    } catch (err) {
      console.warn('[fullscreen-monitor] active-win unavailable — fullscreen detection disabled', err);
      this.disabled = true;
      return;
    }
    this.scheduleNext(0);
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.removeAllListeners();
  }

  setHighFrequency(high: boolean): void {
    if (this.highFrequency === high) return;
    this.highFrequency = high;
    this.currentInterval = high ? FAST_POLL_MS : NORMAL_POLL_MS;
    // Re-arm with the new cadence; if a poll is in flight we let it finish then reschedule.
    if (!this.polling && this.timer) {
      clearTimeout(this.timer);
      this.scheduleNext(0);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  private scheduleNext(delay: number): void {
    if (this.disabled) return;
    this.timer = setTimeout(() => void this.poll(), delay);
  }

  private async poll(): Promise<void> {
    if (this.polling || this.disabled || !this.activeWin) return;
    this.polling = true;
    try {
      // Skip permission prompts on macOS — we only need bounds + owner.
      const result = await this.activeWin({
        accessibilityPermission: false,
        screenRecordingPermission: false
      });
      const next = result ? this.evaluate(result) : false;
      this.transition(next);
    } catch (err) {
      // Fail-open: never withhold breaks due to a polling error.
      console.warn('[fullscreen-monitor] poll failed', err);
      this.transition(false);
    } finally {
      this.polling = false;
      this.scheduleNext(this.currentInterval);
    }
  }

  private evaluate(result: activeWindowTypes.Result): boolean {
    if (this.isOwnWindow(result)) return false;

    const { bounds } = result;
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return false;

    for (const display of screen.getAllDisplays()) {
      if (boundsCoverDisplay(bounds, display.bounds)) return true;
    }
    return false;
  }

  private isOwnWindow(result: activeWindowTypes.Result): boolean {
    const pid = result.owner?.processId;
    if (typeof pid !== 'number') return false;
    if (pid === process.pid) return true;
    for (const win of BrowserWindow.getAllWindows()) {
      try {
        if (win.webContents.getOSProcessId() === pid) return true;
      } catch {
        // Window may be tearing down — ignore.
      }
    }
    return false;
  }

  private transition(next: boolean): void {
    if (next === this.active) return;
    this.active = next;
    const eventName: FullscreenMonitorEvent = next ? 'fullscreen-active' : 'fullscreen-ended';
    this.emit(eventName);
  }
}

function boundsCoverDisplay(win: Rectangle, display: Rectangle): boolean {
  return (
    Math.abs(win.x - display.x) <= BOUNDS_TOLERANCE_PX &&
    Math.abs(win.y - display.y) <= BOUNDS_TOLERANCE_PX &&
    Math.abs(win.width - display.width) <= BOUNDS_TOLERANCE_PX &&
    Math.abs(win.height - display.height) <= BOUNDS_TOLERANCE_PX
  );
}
