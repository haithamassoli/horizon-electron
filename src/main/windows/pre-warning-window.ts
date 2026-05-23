import { BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  ipcChannels,
  preWarningInitPayloadSchema,
  preWarningTickEventSchema,
  type PreWarningInitPayload
} from '@shared/schemas';
import { getScheduler } from '../scheduler/scheduler';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIDTH = 280;
const HEIGHT = 96;
const MARGIN = 16;
const TICK_MS = 1_000;

interface ActiveWarning {
  id: string;
  fireAt: number;
  isLongBreak: boolean;
  win: BrowserWindow;
  tickHandle: ReturnType<typeof setInterval> | null;
  expireHandle: ReturnType<typeof setTimeout> | null;
}

let warning: ActiveWarning | null = null;

export function getPreWarningInitPayload(): PreWarningInitPayload | null {
  if (!warning) return null;
  return {
    sessionId: warning.id,
    fireAt: warning.fireAt,
    isLongBreak: warning.isLongBreak
  };
}

export function dismissPreWarningFromRenderer(): void {
  // Acknowledge-only: closing the toast does NOT skip the break.
  if (!warning) return;
  closeWarning();
}

export function spawnPreWarning(opts: { fireAt: number; isLongBreak: boolean }): void {
  if (warning) closeWarning();
  const id = randomUUID();
  const win = createWarningWindow();

  warning = {
    id,
    fireAt: opts.fireAt,
    isLongBreak: opts.isLongBreak,
    win,
    tickHandle: null,
    expireHandle: null
  };

  warning.tickHandle = setInterval(() => broadcastTick(), TICK_MS);
  broadcastTick();

  const msUntilFire = Math.max(0, opts.fireAt - Date.now());
  warning.expireHandle = setTimeout(() => closeWarning(), msUntilFire);

  win.on('closed', () => {
    if (warning?.win === win) warning = null;
  });
}

export function closePreWarningExternally(): void {
  closeWarning();
}

function broadcastTick(): void {
  if (!warning || warning.win.isDestroyed()) return;
  const remainingMs = Math.max(0, warning.fireAt - Date.now());
  const payload = { sessionId: warning.id, remainingMs };
  const parsed = preWarningTickEventSchema.safeParse(payload);
  if (!parsed.success) return;
  warning.win.webContents.send(ipcChannels.preWarningTick, parsed.data);
}

function closeWarning(): void {
  if (!warning) return;
  const current = warning;
  warning = null;
  if (current.tickHandle) clearInterval(current.tickHandle);
  if (current.expireHandle) clearTimeout(current.expireHandle);
  if (!current.win.isDestroyed()) current.win.destroy();
}

function createWarningWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const { workArea } = display;
  const x = workArea.x + workArea.width - WIDTH - MARGIN;
  const y = workArea.y + workArea.height - HEIGHT - MARGIN;

  const win = new BrowserWindow({
    x,
    y,
    width: WIDTH,
    height: HEIGHT,
    frame: false,
    show: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
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
    if (!win.isDestroyed()) win.showInactive();
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    void win.loadURL(`${devUrl}#/pre-warning`);
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: '/pre-warning' });
  }

  return win;
}

export function wirePreWarningToScheduler(): () => void {
  return getScheduler().on((event) => {
    if (event.type === 'pre-warning-due') {
      spawnPreWarning({
        fireAt: event.payload.fireAt,
        isLongBreak: event.payload.isLongBreak
      });
    }
    if (event.type === 'break-due') {
      // Belt-and-suspenders: ensure the toast dies as the overlay opens.
      closeWarning();
    }
  });
}

// Type-check anchor.
export const _initPayloadSchema = preWarningInitPayloadSchema;
