import { EventEmitter } from 'node:events';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const POLL_MS = 5_000;
const REGISTRY_BASE =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore';

export type MeetingMonitorEvent = 'meeting-active' | 'meeting-ended';

/**
 * Windows mic/cam session detector. Reads the Windows CapabilityAccessManager registry — every app
 * that opens the mic or webcam writes `LastUsedTimeStart` / `LastUsedTimeStop` FILETIME values.
 * An open session has Start > Stop. On non-Windows platforms (and on registry errors) the monitor
 * fails open — never withhold breaks because of an unknown signal.
 */
export class MeetingMonitor extends EventEmitter {
  private active = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private polling = false;
  private readonly pollMs: number;
  private readonly enabled: boolean;

  constructor(opts: { pollMs?: number } = {}) {
    super();
    this.pollMs = opts.pollMs ?? POLL_MS;
    this.enabled = process.platform === 'win32';
    if (!this.enabled) {
      console.info('[meeting-monitor] non-Windows platform — meeting detection disabled (fail-open)');
    }
  }

  start(): void {
    if (!this.enabled || this.timer) return;
    this.scheduleNext(0);
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.removeAllListeners();
  }

  isActive(): boolean {
    return this.active;
  }

  private scheduleNext(delay: number): void {
    this.timer = setTimeout(() => void this.poll(), delay);
  }

  private async poll(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      const [mic, cam] = await Promise.all([
        querySessionActive(`${REGISTRY_BASE}\\microphone`),
        querySessionActive(`${REGISTRY_BASE}\\webcam`)
      ]);
      this.transition(mic || cam);
    } catch (err) {
      console.warn('[meeting-monitor] poll failed (fail-open)', err);
      this.transition(false);
    } finally {
      this.polling = false;
      this.scheduleNext(this.pollMs);
    }
  }

  private transition(next: boolean): void {
    if (next === this.active) return;
    this.active = next;
    const eventName: MeetingMonitorEvent = next ? 'meeting-active' : 'meeting-ended';
    this.emit(eventName);
  }
}

async function querySessionActive(keyPath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`reg query "${keyPath}" /s`, {
      windowsHide: true,
      timeout: 4_000,
      maxBuffer: 4 * 1024 * 1024
    });
    return parseSessionFromRegOutput(stdout);
  } catch {
    // Missing key = capability never used; treat as not-active rather than failing open globally.
    return false;
  }
}

/**
 * Parse `reg query /s` output. For each subkey block, find `LastUsedTimeStart` and
 * `LastUsedTimeStop` (REG_QWORD hex). An active session has Start > Stop > 0; Stop == 0 alone is
 * not enough because some uninstalled apps leave that state behind.
 */
export function parseSessionFromRegOutput(output: string): boolean {
  // Split into per-subkey blocks. `reg query /s` separates blocks by blank lines.
  const blocks = output.split(/\r?\n\s*\r?\n/);
  for (const block of blocks) {
    const start = readQword(block, 'LastUsedTimeStart');
    const stop = readQword(block, 'LastUsedTimeStop');
    if (start === null || stop === null) continue;
    if (start > 0n && start > stop) return true;
  }
  return false;
}

function readQword(block: string, name: string): bigint | null {
  // Match: `    LastUsedTimeStart    REG_QWORD    0x01da6c8d...`
  const re = new RegExp(`${name}\\s+REG_QWORD\\s+0x([0-9a-fA-F]+)`);
  const m = block.match(re);
  if (!m) return null;
  try {
    return BigInt(`0x${m[1]}`);
  } catch {
    return null;
  }
}

