import { BrowserWindow, screen, type Display } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Pulse animation is 1.2s; +100ms grace so the window survives the final frame. */
const SAFETY_DESTROY_MS = 1_300;

interface PulseWindowRecord {
  win: BrowserWindow;
  displayId: number;
  destroyHandle: ReturnType<typeof setTimeout>;
}

const active = new Set<PulseWindowRecord>();

/**
 * Spawn one transparent click-through pulse window per display. Self-destroys after the
 * animation completes. Multiple concurrent pulses (back-to-back ticks if the timer is
 * accelerated) coexist — each set is its own batch.
 */
export function spawnBlinkPulse(): void {
  const displays = screen.getAllDisplays();
  for (const display of displays) {
    const record = createPulseWindow(display);
    active.add(record);
  }
}

export function destroyAllBlinkPulses(): void {
  for (const record of active) {
    clearTimeout(record.destroyHandle);
    if (!record.win.isDestroyed()) record.win.destroy();
  }
  active.clear();
}

function createPulseWindow(display: Display): PulseWindowRecord {
  const { bounds } = display;
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    // Click-through everywhere — the pulse must not steal a single click.
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
  win.setIgnoreMouseEvents(true, { forward: true });

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) win.showInactive();
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    void win.loadURL(`${devUrl}#/blink`);
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: '/blink' });
  }

  const record: PulseWindowRecord = {
    win,
    displayId: display.id,
    destroyHandle: setTimeout(() => {
      active.delete(record);
      if (!win.isDestroyed()) win.destroy();
    }, SAFETY_DESTROY_MS)
  };

  win.on('closed', () => {
    clearTimeout(record.destroyHandle);
    active.delete(record);
  });

  return record;
}
