import { app, Tray, Menu, nativeImage, nativeTheme, type NativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getScheduler } from '../scheduler/scheduler';
import type { TrayAction, SchedulerState } from '@shared/schemas';
import { showSettingsWindow } from '../windows/settings-window';
import { togglePopover, hidePopover, refreshPopoverPosition } from '../windows/popover-window';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let tray: Tray | null = null;
let unsubscribe: (() => void) | null = null;
let unsubscribeTheme: (() => void) | null = null;

export function createTray(): Tray {
  if (tray) return tray;

  const scheduler = getScheduler();

  tray = new Tray(loadIcon(scheduler.getState().lifecycle === 'paused'));
  tray.setToolTip('Horizon — a quiet coach for your eyes');

  applyMenu(scheduler.getState());

  tray.on('click', () => {
    if (!tray) return;
    togglePopover(tray.getBounds());
  });
  tray.on('right-click', () => {
    hidePopover();
  });

  unsubscribe = scheduler.on((event) => {
    if (event.type !== 'state-changed' && event.type !== 'pause-expired') return;
    refreshIcon();
    applyMenu(scheduler.getState());
  });

  const onThemeUpdate = (): void => refreshIcon();
  nativeTheme.on('updated', onThemeUpdate);
  unsubscribeTheme = () => nativeTheme.off('updated', onThemeUpdate);

  return tray;
}

export function destroyTray(): void {
  unsubscribe?.();
  unsubscribe = null;
  unsubscribeTheme?.();
  unsubscribeTheme = null;
  tray?.destroy();
  tray = null;
}

export function getTrayBounds(): Electron.Rectangle | null {
  return tray?.getBounds() ?? null;
}

function refreshIcon(): void {
  if (!tray) return;
  const paused = getScheduler().getState().lifecycle === 'paused';
  tray.setImage(loadIcon(paused));
  refreshPopoverPosition(tray.getBounds());
}

function loadIcon(paused: boolean): NativeImage {
  const variant = paused ? 'paused' : 'active';
  const tone = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  const filename = `${variant}-${tone}.png`;

  // Resolve from packaged resources first, then from dev source tree.
  const candidates = [
    path.join(process.resourcesPath ?? '', 'tray', filename),
    path.join(__dirname, '..', '..', 'resources', 'tray', filename),
    path.join(app.getAppPath(), 'resources', 'tray', filename)
  ];
  for (const p of candidates) {
    const img = nativeImage.createFromPath(p);
    if (!img.isEmpty()) return img;
  }
  return nativeImage.createEmpty();
}

function applyMenu(state: SchedulerState): void {
  if (!tray) return;
  const isPaused = state.lifecycle === 'paused';
  const menu = Menu.buildFromTemplate([
    isPaused
      ? {
          label: 'Resume',
          click: () => fire('resume')
        }
      : {
          label: 'Pause',
          submenu: [
            { label: 'For 15 minutes', click: () => fire('pause-15m') },
            { label: 'For 30 minutes', click: () => fire('pause-30m') },
            { label: 'For 1 hour', click: () => fire('pause-1h') },
            { label: 'Until tomorrow', click: () => fire('pause-until-tomorrow') }
          ]
        },
    { type: 'separator' },
    {
      label: 'Take a break now',
      enabled: !isPaused,
      click: () => fire('break-now')
    },
    {
      label: 'Skip next break',
      enabled: !isPaused,
      click: () => fire('skip-next')
    },
    { type: 'separator' },
    {
      label: 'Open Settings…',
      click: () => {
        showSettingsWindow();
      }
    },
    {
      label: 'Quit Horizon',
      click: () => {
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
}

function fire(action: TrayAction): void {
  const scheduler = getScheduler();
  switch (action) {
    case 'pause-15m':
      scheduler.pause('15m');
      break;
    case 'pause-30m':
      scheduler.pause('30m');
      break;
    case 'pause-1h':
      scheduler.pause('1h');
      break;
    case 'pause-until-tomorrow':
      scheduler.pause('until-tomorrow');
      break;
    case 'resume':
      scheduler.resume();
      break;
    case 'break-now':
      scheduler.breakNow();
      break;
    case 'skip-next':
      scheduler.skipNext();
      break;
    case 'open-settings':
    case 'quit':
      break;
  }
}
