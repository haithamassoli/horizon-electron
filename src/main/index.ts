import { app, BrowserWindow } from 'electron';
import { registerSettingsChannels } from './ipc/settings-channels';
import { registerStateChannels } from './ipc/state-channels';
import { registerPopoverChannels } from './ipc/popover-channels';
import { showSettingsWindow } from './windows/settings-window';
import { getSettingsStore } from './store/settings-store';
import { getScheduler } from './scheduler/scheduler';
import { createTray, destroyTray } from './tray/tray';

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  showSettingsWindow();
});

app.whenReady().then(() => {
  getSettingsStore();
  const scheduler = getScheduler();

  registerSettingsChannels();
  registerStateChannels();
  registerPopoverChannels();

  scheduler.start();
  createTray();
  showSettingsWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) showSettingsWindow();
  });
});

app.on('before-quit', () => {
  destroyTray();
});

app.on('window-all-closed', () => {
  // Tray keeps the app alive; do NOT quit when windows close.
});
