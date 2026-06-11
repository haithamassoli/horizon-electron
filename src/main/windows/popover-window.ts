import { BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WIDTH = 280;
const HEIGHT = 152;
const AUTO_CLOSE_MS = 8_000;

let popover: BrowserWindow | null = null;
let lastTrayBounds: Electron.Rectangle | null = null;
let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

export function togglePopover(trayBounds: Electron.Rectangle): void {
  lastTrayBounds = trayBounds;
  if (popover && popover.isVisible()) {
    hidePopover();
    return;
  }
  showPopover(trayBounds);
}

export function showPopover(trayBounds: Electron.Rectangle): void {
  lastTrayBounds = trayBounds;
  if (!popover || popover.isDestroyed()) popover = createPopover();
  positionAt(popover, trayBounds);
  popover.showInactive();
  popover.focus();
  scheduleAutoClose();
}

export function hidePopover(): void {
  if (popover && !popover.isDestroyed() && popover.isVisible()) {
    popover.hide();
  }
  clearAutoClose();
}

export function refreshPopoverPosition(trayBounds: Electron.Rectangle | null): void {
  if (!trayBounds) return;
  lastTrayBounds = trayBounds;
  if (popover && popover.isVisible()) positionAt(popover, trayBounds);
}

function createPopover(): BrowserWindow {
  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    frame: false,
    show: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  win.setMenuBarVisibility(false);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.on('blur', () => hidePopover());
  win.on('closed', () => {
    popover = null;
    clearAutoClose();
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    void win.loadURL(`${devUrl}#/popover`);
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: '/popover' });
  }

  return win;
}

function positionAt(win: BrowserWindow, trayBounds: Electron.Rectangle): void {
  const display = screen.getDisplayNearestPoint({
    x: trayBounds.x + trayBounds.width / 2,
    y: trayBounds.y + trayBounds.height / 2
  });
  const workArea = display.workArea;

  // Center horizontally over tray icon; clamp to display work area with 8px margin.
  const margin = 8;
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - WIDTH / 2);
  x = Math.max(workArea.x + margin, Math.min(workArea.x + workArea.width - WIDTH - margin, x));

  // If the tray sits in the top half of the display, drop the popover below it; otherwise put it above.
  const trayCenterY = trayBounds.y + trayBounds.height / 2;
  const displayCenterY = workArea.y + workArea.height / 2;
  const y =
    trayCenterY < displayCenterY
      ? trayBounds.y + trayBounds.height + 6
      : trayBounds.y - HEIGHT - 6;

  win.setBounds({ x, y, width: WIDTH, height: HEIGHT });
}

function scheduleAutoClose(): void {
  clearAutoClose();
  autoCloseTimer = setTimeout(() => hidePopover(), AUTO_CLOSE_MS);
}

function clearAutoClose(): void {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
}

export function getLastTrayBounds(): Electron.Rectangle | null {
  return lastTrayBounds;
}
