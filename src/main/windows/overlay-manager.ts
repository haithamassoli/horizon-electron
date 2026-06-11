import { BrowserWindow, screen, type Display } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  ipcChannels,
  overlayInitPayloadSchema,
  overlayTickEventSchema,
  type OverlayInitPayload,
  type OverlayRole,
  type OverlaySnoozeResponse,
  type Settings,
  type SnoozeCaps
} from '@shared/schemas';
import { getScheduler } from '../scheduler/scheduler';
import { getSettingsStore } from '../store/settings-store';
import { getTodayStore } from '../store/today-store';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TICK_MS = 1_000;
const FADE_OUT_MS = 250;
const BALANCED_LOCKOUT_MS = 7_000;

interface OverlayWindowRecord {
  win: BrowserWindow;
  displayId: number;
  role: OverlayRole;
}

type CloseReason = 'natural' | 'skip' | 'snooze' | 'panic';

interface ActiveSession {
  id: string;
  isLongBreak: boolean;
  durationMs: number;
  startedAt: number;
  visualAid: Settings['overlay']['visualAid'];
  ambientAudio: Settings['overlay']['ambientAudio'];
  mode: Settings['enforcementMode'];
  primaryDisplayId: number;
  windows: OverlayWindowRecord[];
  tickHandle: ReturnType<typeof setInterval> | null;
  durationHandle: ReturnType<typeof setTimeout> | null;
  closeHandle: ReturnType<typeof setTimeout> | null;
  closing: boolean;
  closeReason: CloseReason;
}

let active: ActiveSession | null = null;
let displayListenersAttached = false;

export function isOverlayActive(): boolean {
  return active !== null;
}

export function getOverlayInitPayload(webContentsId: number): OverlayInitPayload | null {
  if (!active) return null;
  const record = active.windows.find((w) => w.win.webContents.id === webContentsId);
  if (!record) return null;
  return {
    sessionId: active.id,
    role: record.role,
    mode: active.mode,
    isLongBreak: active.isLongBreak,
    durationMs: active.durationMs,
    startedAt: active.startedAt,
    visualAid: active.visualAid,
    ambientAudio: active.ambientAudio,
    snoozeCaps: computeSnoozeCaps(),
    balancedLockoutMs: active.mode === 'balanced' ? BALANCED_LOCKOUT_MS : 0
  };
}

export function requestOverlaySkip(sessionId: string): boolean {
  if (!active || active.id !== sessionId) return false;
  if (active.mode === 'hardcore') return false;
  // Balanced 7s lockout is enforced renderer-side (UX); main accepts skip whenever the renderer
  // sends it. The renderer never sends it during lockout.
  active.closeReason = 'skip';
  beginClose();
  return true;
}

export function requestOverlaySnooze(sessionId: string): OverlaySnoozeResponse {
  if (!active) return { accepted: false, reason: 'no-session' };
  if (active.id !== sessionId) return { accepted: false, reason: 'no-session' };
  if (active.mode === 'hardcore') return { accepted: false, reason: 'mode-disallowed' };

  const result = getScheduler().snooze();
  if (!result.accepted) {
    return { accepted: false, reason: result.reason };
  }
  getTodayStore().increment('snoozesUsed');
  active.closeReason = 'snooze';
  beginClose();
  return {
    accepted: true,
    newFireAt: result.newFireAt,
    deferMs: result.deferMs,
    snoozeCaps: computeSnoozeCaps()
  };
}

export function requestOverlayPanic(sessionId: string): boolean {
  if (!active || active.id !== sessionId) return false;
  if (active.mode !== 'hardcore') return false;
  active.closeReason = 'panic';
  beginClose();
  return true;
}

function computeSnoozeCaps(): SnoozeCaps {
  const settings = getSettingsStore().get();
  const state = getScheduler().getState();
  const session = settings.snooze.perSessionCap;
  const day = settings.snooze.perDayCap;
  return {
    perSessionRemaining:
      session === 'unlimited' ? 'unlimited' : Math.max(0, session - state.snoozesUsedThisSession),
    perDayRemaining:
      day === 'unlimited' ? 'unlimited' : Math.max(0, day - state.snoozesUsedToday)
  };
}

export function spawnOverlaysForBreak(opts: {
  isLongBreak: boolean;
  durationMs: number;
}): void {
  if (active) return; // collapse simultaneous triggers — scheduler only emits one anyway.

  const settings = getSettingsStore().get();
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const startedAt = Date.now();

  const session: ActiveSession = {
    id: randomUUID(),
    isLongBreak: opts.isLongBreak,
    durationMs: opts.durationMs,
    startedAt,
    visualAid: settings.overlay.visualAid,
    ambientAudio: settings.overlay.ambientAudio,
    mode: settings.enforcementMode,
    primaryDisplayId: primary.id,
    windows: [],
    tickHandle: null,
    durationHandle: null,
    closeHandle: null,
    closing: false,
    closeReason: 'natural'
  };
  active = session;

  for (const display of displays) {
    const role: OverlayRole = display.id === primary.id ? 'primary' : 'secondary';
    const win = createOverlayWindow(display, role, session.mode);
    session.windows.push({ win, displayId: display.id, role });
  }

  attachDisplayListeners();

  // 1Hz tick for countdown sync; main is authoritative.
  session.tickHandle = setInterval(() => broadcastTick(), TICK_MS);
  broadcastTick();

  // Natural break end.
  session.durationHandle = setTimeout(() => beginClose(), opts.durationMs);
}

function broadcastTick(): void {
  if (!active) return;
  const now = Date.now();
  const elapsedMs = Math.max(0, now - active.startedAt);
  const remainingMs = Math.max(0, active.durationMs - elapsedMs);
  const payload = {
    sessionId: active.id,
    remainingMs,
    elapsedMs,
    phase: active.closing ? ('closing' as const) : ('active' as const)
  };
  const parsed = overlayTickEventSchema.safeParse(payload);
  if (!parsed.success) return;
  for (const record of active.windows) {
    if (!record.win.isDestroyed()) {
      record.win.webContents.send(ipcChannels.overlayTick, parsed.data);
    }
  }
}

function beginClose(): void {
  if (!active || active.closing) return;
  active.closing = true;
  broadcastTick();
  if (active.tickHandle) {
    clearInterval(active.tickHandle);
    active.tickHandle = null;
  }
  if (active.durationHandle) {
    clearTimeout(active.durationHandle);
    active.durationHandle = null;
  }
  active.closeHandle = setTimeout(() => destroyActive(), FADE_OUT_MS);
}

function destroyActive(): void {
  if (!active) return;
  // Snooze increment happened at request time so the renderer's cap calculation reflects it.
  // The break itself was neither "taken" nor "skipped" — it was deferred. So no counter bump here.
  if (active.closeReason === 'natural') {
    getTodayStore().increment('breaksTaken');
  } else if (active.closeReason === 'skip' || active.closeReason === 'panic') {
    getTodayStore().increment('breaksSkipped');
  }
  for (const record of active.windows) {
    if (!record.win.isDestroyed()) record.win.destroy();
  }
  active = null;
  detachDisplayListeners();
}

function createOverlayWindow(
  display: Display,
  role: OverlayRole,
  mode: Settings['enforcementMode']
): BrowserWindow {
  const { bounds } = display;
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    show: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: true,
    // simpleFullscreen avoids macOS's "new space" behavior in dev; on Windows fullscreen is native.
    simpleFullscreen: process.platform === 'darwin',
    fullscreen: process.platform !== 'darwin',
    // Kiosk mode in Hardcore blocks alt-tab / win-key escape paths.
    kiosk: mode === 'hardcore' && process.platform !== 'darwin',
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    closable: false,
    hasShadow: false,
    backgroundColor: role === 'primary' ? '#f6eeda' : '#251c17',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false
    }
  });

  win.setMenuBarVisibility(false);
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return;
    win.show();
    win.focus();
  });

  win.on('blur', () => {
    if (win.isDestroyed()) return;
    // Re-assert always-on-top so the overlay can't be dodged by alt-tab during a break.
    win.setAlwaysOnTop(true, 'screen-saver');
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  const route = role === 'primary' ? '/overlay/primary' : '/overlay/secondary';
  if (devUrl) {
    void win.loadURL(`${devUrl}#${route}`);
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: route });
  }

  return win;
}

function attachDisplayListeners(): void {
  if (displayListenersAttached) return;
  displayListenersAttached = true;
  screen.on('display-added', handleDisplayAdded);
  screen.on('display-removed', handleDisplayRemoved);
}

function detachDisplayListeners(): void {
  if (!displayListenersAttached) return;
  displayListenersAttached = false;
  screen.removeListener('display-added', handleDisplayAdded);
  screen.removeListener('display-removed', handleDisplayRemoved);
}

function handleDisplayAdded(_event: Electron.Event, display: Display): void {
  if (!active) return;
  // Hot-plugged display always gets the dimmed lockout, never the primary UI.
  const win = createOverlayWindow(display, 'secondary', active.mode);
  active.windows.push({ win, displayId: display.id, role: 'secondary' });
}

function handleDisplayRemoved(_event: Electron.Event, display: Display): void {
  if (!active) return;
  const idx = active.windows.findIndex((w) => w.displayId === display.id);
  if (idx < 0) return;
  const [record] = active.windows.splice(idx, 1);
  if (!record.win.isDestroyed()) record.win.destroy();
  if (active.windows.length === 0) {
    beginClose();
    return;
  }
  if (record.role === 'primary') {
    promoteNextDisplayToPrimary();
  }
}

function promoteNextDisplayToPrimary(): void {
  if (!active) return;
  const next = active.windows[0];
  if (!next) return;
  const display = screen.getAllDisplays().find((d) => d.id === next.displayId);
  if (!display) return;

  active.windows = active.windows.filter((w) => w !== next);
  if (!next.win.isDestroyed()) next.win.destroy();

  const win = createOverlayWindow(display, 'primary', active.mode);
  active.primaryDisplayId = display.id;
  active.windows.unshift({ win, displayId: display.id, role: 'primary' });
}

export function wireOverlayManagerToScheduler(): () => void {
  return getScheduler().on((event) => {
    if (event.type === 'break-due') {
      spawnOverlaysForBreak({
        isLongBreak: event.payload.isLongBreak,
        durationMs: event.payload.durationMs
      });
    }
  });
}

// Sanity check for the OverlayInitPayload contract used by the IPC handler.
export const _initPayloadSchema = overlayInitPayloadSchema;
