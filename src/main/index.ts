import { app, BrowserWindow } from 'electron';
import { registerSettingsChannels } from './ipc/settings-channels';
import { showSettingsWindow } from './windows/settings-window';
import { getSettingsStore } from './store/settings-store';

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  showSettingsWindow();
});

app.whenReady().then(() => {
  getSettingsStore();
  registerSettingsChannels();
  showSettingsWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) showSettingsWindow();
  });
});

app.on('window-all-closed', () => {
  // M1: no tray yet, so quitting closes when no windows remain on non-mac platforms.
  if (process.platform !== 'darwin') app.quit();
});
