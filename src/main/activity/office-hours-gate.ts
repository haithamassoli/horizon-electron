import { EventEmitter } from 'node:events';
import type { Settings } from '@shared/schemas';
import { getSettingsStore } from '../store/settings-store';

const MIN_MS = 60_000;

interface OfficeHoursGateOptions {
  now?: () => Date;
}

export class OfficeHoursGate extends EventEmitter {
  private readonly now: () => Date;
  private settings: Settings;
  private handle: ReturnType<typeof setInterval> | null = null;
  private unsubscribeSettings: (() => void) | null = null;
  private insideWindow = true;

  constructor(opts: OfficeHoursGateOptions = {}) {
    super();
    this.now = opts.now ?? (() => new Date());
    this.settings = getSettingsStore().get();
    this.insideWindow = computeInsideWindow(this.settings, this.now());
  }

  start(): void {
    if (this.handle) return;
    this.unsubscribeSettings = getSettingsStore().subscribe((settings) => {
      this.settings = settings;
      this.evaluate();
    });
    this.evaluate(true);
    this.handle = setInterval(() => this.evaluate(), MIN_MS);
  }

  stop(): void {
    if (this.handle) {
      clearInterval(this.handle);
      this.handle = null;
    }
    this.unsubscribeSettings?.();
    this.unsubscribeSettings = null;
    this.removeAllListeners();
  }

  isInsideWindow(): boolean {
    return this.insideWindow;
  }

  private evaluate(force = false): void {
    const next = computeInsideWindow(this.settings, this.now());
    if (!force && next === this.insideWindow) return;
    this.insideWindow = next;
    this.emit('changed', next);
  }
}

function computeInsideWindow(settings: Settings, now: Date): boolean {
  const office = settings.officeHours;
  if (!office.enabled) return true;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const start = parseMinutes(office.startTime);
  const end = parseMinutes(office.endTime);
  const today = now.getDay();
  const yesterday = (today + 6) % 7;

  if (start === end) return office.activeDays.includes(today);
  if (start < end) return office.activeDays.includes(today) && minutesNow >= start && minutesNow < end;
  return (
    (office.activeDays.includes(today) && minutesNow >= start) ||
    (office.activeDays.includes(yesterday) && minutesNow < end)
  );
}

function parseMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

let instance: OfficeHoursGate | undefined;

export function getOfficeHoursGate(): OfficeHoursGate {
  if (!instance) instance = new OfficeHoursGate();
  return instance;
}
